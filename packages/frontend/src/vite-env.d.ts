/// <reference types="vite/client" />

// Validadas e convertidas em `src/lib/env.ts`; o resto do app usa `env`, não `import.meta.env`.
interface ImportMetaEnv {
  /** 11155111 (Sepolia) ou 31337 (nó local do Hardhat). */
  readonly VITE_CHAIN_ID?: string;
  /** RPC por HTTP. Vazio: RPC público padrão da rede. */
  readonly VITE_RPC_HTTP_URL?: string;
  /** RPC por WebSocket, para eventos ao vivo. Vazio: só HTTP. */
  readonly VITE_RPC_WS_URL?: string;
  /** Endereço da ElectionFactory implantada. */
  readonly VITE_FACTORY_ADDRESS?: string;
  /** Bloco do deploy da factory; vazio: busca eventos desde o bloco 0. */
  readonly VITE_FACTORY_DEPLOY_BLOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
