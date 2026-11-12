import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { logRetry } from "@/lib/logs";

// sem espera entre as tentativas de leitura de eventos: os testes não esperam por relógio
logRetry.delayMs = 0;

/** Respostas padrão das leituras de contrato: factory vazia, com um dono qualquer. */
const defaultReads: Record<string, unknown> = {
  elections: [],
  owner: "0x000000000000000000000000000000000000dEaD",
  sem: "0x0000000000000000000000000000000000005e3a",
  groupId: 1n,
  isAuthorized: false,
  isElection: false,
  commitmentOf: 0n,
  getMerkleTreeRoot: 0n,
};

// RPC falso para todos os testes: nada sai para a rede. Cada teste troca o comportamento com
// `vi.mocked(publicClient.<função>)` ou com `mockChain` (test/helpers/mock-chain.ts).
vi.mock("@/lib/chain", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/chain")>()),
  // como com WebSocket configurado: as páginas assinam os eventos (watchContractEvent abaixo)
  liveEvents: true,
  publicClient: {
    getBlockNumber: vi.fn(async () => 7_000_000n),
    getBalance: vi.fn(async () => 10n ** 17n),
    readContract: vi.fn(async ({ functionName }: { functionName: string }) => {
      if (!(functionName in defaultReads)) {
        throw new Error(`Leitura não simulada nos testes: ${functionName}`);
      }

      return defaultReads[functionName];
    }),
    getContractEvents: vi.fn(async () => []),
    // devolve o `unwatch`; os testes pegam o `onLogs` em `mock.calls` para simular um evento
    watchContractEvent: vi.fn(() => () => {}),
    // a simulação devolve os próprios parâmetros como `request`, como o viem faz quando não há revert
    simulateContract: vi.fn(async (parameters: unknown) => ({ request: parameters })),
    waitForTransactionReceipt: vi.fn(async ({ hash }: { hash: string }) => ({
      status: "success",
      transactionHash: hash,
      logs: [],
    })),
  },
}));

// APIs de layout que o Radix (menus, popovers) usa e o jsdom não implementa
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub;
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  // volta cada mock à implementação padrão acima e descarta os `...Once` pendentes
  vi.resetAllMocks();
});
