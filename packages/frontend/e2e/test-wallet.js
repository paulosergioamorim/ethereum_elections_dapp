// Carteira de teste para o Playwright: anuncia um provedor EIP-6963 que repassa tudo ao nó local
// do Hardhat (http://127.0.0.1:8545), cujas contas são desbloqueadas (sem chaves aqui).
//
// Uso (Playwright): context.addInitScript({ path: "packages/frontend/e2e/test-wallet.js" }) antes de
// abrir a página. No console da página, `window.__testWallet.select(i)` troca a conta (0 = autoridade,
// 1.. = eleitores) e dispara `accountsChanged`.
(() => {
  const RPC = "http://127.0.0.1:8545";
  const listeners = { accountsChanged: new Set(), chainChanged: new Set(), connect: new Set(), disconnect: new Set() };
  let accounts = [];
  let selected = 0;
  let id = 0;

  async function rpc(method, params = []) {
    const response = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
    });
    const body = await response.json();

    if (body.error) {
      const error = new Error(body.error.message);
      error.code = body.error.code;
      error.data = body.error.data;
      throw error;
    }

    return body.result;
  }

  async function loadAccounts() {
    if (accounts.length === 0) {
      accounts = await rpc("eth_accounts");
    }

    return accounts;
  }

  const current = async () => [(await loadAccounts())[selected]];

  const provider = {
    async request({ method, params }) {
      switch (method) {
        case "eth_requestAccounts":
        case "eth_accounts":
          return current();
        case "wallet_switchEthereumChain":
        case "wallet_requestPermissions":
          return null;
        case "wallet_getPermissions":
          return [{ parentCapability: "eth_accounts" }];
        case "eth_sendTransaction": {
          // o nó assina com a conta desbloqueada: só garante que `from` é a conta selecionada
          const [from] = await current();
          return rpc(method, [{ ...params[0], from }]);
        }
        case "personal_sign": {
          const [from] = await current();
          return rpc("eth_sign", [from, params[0]]);
        }
        case "eth_signTypedData_v4":
          return rpc(method, params);
        default:
          return rpc(method, params);
      }
    },
    on(event, listener) {
      listeners[event]?.add(listener);
      return provider;
    },
    removeListener(event, listener) {
      listeners[event]?.delete(listener);
      return provider;
    },
  };

  window.__testWallet = {
    async select(index) {
      selected = index;
      const next = await current();
      listeners.accountsChanged.forEach((listener) => listener(next));
      return next[0];
    },
    accounts: () => loadAccounts(),
  };

  const detail = Object.freeze({
    info: Object.freeze({
      uuid: "00000000-0000-4000-8000-000000000001",
      name: "Carteira de teste",
      icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNiIgZmlsbD0iIzJjNmQzZSIvPjwvc3ZnPg==",
      rdns: "dev.elections.testwallet",
    }),
    provider,
  });

  const announce = () => window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail }));
  window.addEventListener("eip6963:requestProvider", announce);
  announce();
})();
