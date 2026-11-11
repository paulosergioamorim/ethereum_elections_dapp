import { getAddress, isAddress, type Address } from "viem";

export type AppEnv = {
  chainId: number;
  rpcHttpUrl: string | undefined;
  rpcWsUrl: string | undefined;
  factoryAddress: Address;
  /** Bloco em que a factory foi implantada: as buscas de eventos começam nele. */
  factoryDeployBlock: bigint;
};

type RawEnv = Partial<
  Record<
    | "VITE_CHAIN_ID"
    | "VITE_RPC_HTTP_URL"
    | "VITE_RPC_WS_URL"
    | "VITE_FACTORY_ADDRESS"
    | "VITE_FACTORY_DEPLOY_BLOCK",
    string
  >
>;

function value(raw: RawEnv, name: keyof RawEnv): string | undefined {
  const trimmed = raw[name]?.trim();

  return trimmed ? trimmed : undefined;
}

function invalid(message: string): Error {
  return new Error(`${message} Veja frontend/.env.example.`);
}

/** Valida e converte as variáveis `VITE_`. Separada de `env` para poder ser testada. */
export function parseEnv(raw: RawEnv): AppEnv {
  const chainId = Number(value(raw, "VITE_CHAIN_ID"));

  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw invalid("VITE_CHAIN_ID ausente ou inválido.");
  }

  const factory = value(raw, "VITE_FACTORY_ADDRESS");

  // isAddress também confere o checksum quando há maiúsculas: pega erro de digitação
  if (!factory || !isAddress(factory)) {
    throw invalid(`VITE_FACTORY_ADDRESS ausente ou inválido${factory ? `: ${factory}` : ""}.`);
  }

  const rpcHttpUrl = value(raw, "VITE_RPC_HTTP_URL");

  if (rpcHttpUrl && !/^https?:\/\//.test(rpcHttpUrl)) {
    throw invalid("VITE_RPC_HTTP_URL precisa começar com http:// ou https://.");
  }

  const rpcWsUrl = value(raw, "VITE_RPC_WS_URL");

  if (rpcWsUrl && !/^wss?:\/\//.test(rpcWsUrl)) {
    throw invalid("VITE_RPC_WS_URL precisa começar com ws:// ou wss://.");
  }

  // opcional: sem ele, os eventos são buscados desde o bloco 0 (lento na Sepolia)
  const deployBlock = value(raw, "VITE_FACTORY_DEPLOY_BLOCK") ?? "0";

  if (!/^\d+$/.test(deployBlock)) {
    throw invalid("VITE_FACTORY_DEPLOY_BLOCK precisa ser um número de bloco.");
  }

  return {
    chainId,
    rpcHttpUrl,
    rpcWsUrl,
    factoryAddress: getAddress(factory),
    factoryDeployBlock: BigInt(deployBlock),
  };
}

/** Configuração do app, validada na carga: configuração errada falha cedo, com mensagem clara. */
export const env = parseEnv(import.meta.env);
