import { hexToNumber, numberToHex, type Address, type EIP1193Provider, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { deriveIdentity, identityMessage } from "@elections/shared/identity";
import { factoryAddress } from "@/contracts";
import type { EIP6963ProviderDetail } from "@/wallet";

type Listener = (...args: unknown[]) => void;

export type MockWalletOptions = {
  /** Contas que o usuário autoriza ao conectar. */
  accounts: Address[];
  chainId?: number;
  /** O site já tinha permissão (usuário voltando): `eth_accounts` responde sem pedir nada. */
  authorized?: boolean;
  /** Contas que o usuário marca ao "autorizar outras contas" (`wallet_requestPermissions`). */
  moreAccounts?: Address[];
  /** O usuário recusa todo pedido de assinatura (`personal_sign`), com o erro 4001. */
  rejectSignatures?: boolean;
};

export type MockWallet = {
  detail: EIP6963ProviderDetail;
  /** Métodos JSON-RPC recebidos, em ordem. */
  calls: string[];
  /** Transações que a carteira "assinou e enviou" (`eth_sendTransaction`), em ordem. */
  transactions: { from: string; to: string; data: Hex }[];
  /** Simula o usuário trocando de conta ou de permissões dentro da carteira. */
  setAccounts(accounts: Address[]): void;
  /** Anuncia a carteira de novo (EIP-6963). */
  announce(): void;
};

let nextId = 0;

/**
 * Carteira EIP-1193 falsa que se anuncia por EIP-6963, como uma extensão de verdade.
 * Devolve endereços em minúsculas, como a MetaMask, para testar a normalização do dApp.
 */
export function createMockWallet({
  accounts,
  chainId = 11155111,
  authorized = false,
  moreAccounts = [],
  rejectSignatures = false,
}: MockWalletOptions): MockWallet {
  const id = ++nextId;
  const listeners = new Map<string, Set<Listener>>();
  const calls: string[] = [];
  const transactions: MockWallet["transactions"] = [];
  let permitted = [...accounts];
  let isAuthorized = authorized;
  let currentChainId = chainId;

  function emit(event: string, ...args: unknown[]) {
    listeners.get(event)?.forEach((listener) => listener(...args));
  }

  function visibleAccounts() {
    return isAuthorized ? permitted.map((address) => address.toLowerCase()) : [];
  }

  const provider = {
    async request({ method, params }: { method: string; params?: unknown }) {
      calls.push(method);

      switch (method) {
        case "eth_accounts":
          return visibleAccounts();
        case "eth_requestAccounts":
          isAuthorized = true;
          return visibleAccounts();
        case "eth_chainId":
          return numberToHex(currentChainId);
        case "wallet_requestPermissions":
          isAuthorized = true;
          permitted = [...new Set([...permitted, ...moreAccounts])];
          emit("accountsChanged", visibleAccounts());
          return [{ parentCapability: "eth_accounts" }];
        case "wallet_revokePermissions":
          isAuthorized = false;
          emit("accountsChanged", []);
          return null;
        case "personal_sign": {
          if (rejectSignatures) {
            throw Object.assign(new Error("User rejected the request."), { code: 4001 });
          }

          // assinatura de verdade, com a chave conhecida da conta de teste
          const [data, address] = params as [Hex, Address];
          return testAccount(address).signMessage({ message: { raw: data } });
        }
        case "eth_sendTransaction": {
          const [transaction] = params as [{ from: string; to: string; data: Hex }];
          transactions.push(transaction);
          // hash fictício, um por transação
          return `0x${transactions.length.toString(16).padStart(64, "0")}`;
        }
        case "wallet_switchEthereumChain": {
          const [{ chainId: requested }] = params as [{ chainId: Hex }];
          currentChainId = hexToNumber(requested);
          emit("chainChanged", requested);
          return null;
        }
        default:
          throw Object.assign(new Error(`Método não suportado: ${method}`), { code: 4200 });
      }
    },
    on(event: string, listener: Listener) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }

      listeners.get(event)!.add(listener);
    },
    removeListener(event: string, listener: Listener) {
      listeners.get(event)?.delete(listener);
    },
  } as unknown as EIP1193Provider;

  const detail: EIP6963ProviderDetail = Object.freeze({
    info: {
      uuid: `mock-wallet-${id}`,
      name: `Carteira de teste ${id}`,
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E",
      rdns: `test.mock.wallet${id}`,
    },
    provider,
  });

  function announce() {
    window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail }));
  }

  window.addEventListener("eip6963:requestProvider", announce);
  announce();

  return {
    detail,
    calls,
    transactions,
    announce,
    setAccounts(next) {
      permitted = [...next];
      emit("accountsChanged", visibleAccounts());
    },
  };
}

/** Contas 1 a 3 do Hardhat (endereços conhecidos, com checksum). */
export const alice: Address = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
export const bob: Address = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
export const carol: Address = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";

/**
 * Usuário voltando ao site: a carteira já autorizou o site e o dApp lembra qual carteira usar
 * (e, com `active`, qual conta). Depois disso, o próximo render já nasce conectado.
 */
export function connectReturningUser({
  active,
  ...options
}: Omit<MockWalletOptions, "authorized"> & { active?: Address }): MockWallet {
  const wallet = createMockWallet({ ...options, authorized: true });
  window.localStorage.setItem("elections:wallet", JSON.stringify(wallet.detail.info.rdns));

  if (active) {
    window.localStorage.setItem("elections:account", JSON.stringify(active));
  }

  return wallet;
}

/** Chaves privadas públicas das contas 1 a 3 do Hardhat. Só para testes. */
const testPrivateKeys: Record<string, Hex> = {
  [alice.toLowerCase()]: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  [bob.toLowerCase()]: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  [carol.toLowerCase()]: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
};

/** Conta local de uma das contas de teste, para calcular nos testes o que a carteira assinaria. */
export function testAccount(address: Address) {
  const key = testPrivateKeys[address.toLowerCase()];

  if (!key) {
    throw new Error(`Sem chave de teste para ${address}`);
  }

  return privateKeyToAccount(key);
}

/** A identidade que a conta gera ao assinar a mensagem do app: a mesma do cadastro e do voto. */
export async function testIdentity(address: Address) {
  const signature = await testAccount(address).signMessage({
    message: identityMessage(11155111, factoryAddress),
  });

  return deriveIdentity(signature);
}
