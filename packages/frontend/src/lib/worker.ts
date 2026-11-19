/** Resposta de um Worker de `serveInWorker`: o valor, ou a mensagem do erro (`Error` não atravessa inteiro). */
export type WorkerResponse<T> = { ok: true; value: T } | { ok: false; message: string };

/** O mínimo de `Worker` que `runInWorker` usa (os testes passam um falso: o jsdom não tem `Worker`). */
export type WorkerLike = Pick<Worker, "postMessage" | "terminate" | "addEventListener">;

/**
 * Roda uma tarefa num Worker novo e devolve o resultado. Um Worker por chamada: termina no fim, com
 * sucesso ou erro, e libera a memória (o snarkjs e o tlock seguram bastante). Entrada e saída passam
 * por structured clone: `bigint`, strings e arrays atravessam, instâncias de classe não.
 */
export function runInWorker<Input, Output>(create: () => WorkerLike, input: Input): Promise<Output> {
  const worker = create();

  return new Promise<Output>((resolve, reject) => {
    worker.addEventListener("message", (event: MessageEvent<WorkerResponse<Output>>) => {
      const response = event.data;

      if (response.ok) {
        resolve(response.value);
      } else {
        reject(new Error(response.message));
      }
    });
    // erro ao carregar ou fora do try do Worker (ex.: chunk que não baixou)
    worker.addEventListener("error", (event: ErrorEvent) => {
      reject(new Error(event.message || "O processamento em segundo plano falhou."));
    });
    worker.addEventListener("messageerror", () => {
      reject(new Error("A resposta do processamento em segundo plano não pôde ser lida."));
    });
    worker.postMessage(input);
  }).finally(() => worker.terminate());
}

/** Lado do Worker: responde cada mensagem com o resultado de `task` ou com a mensagem do erro. */
export function serveInWorker<Input, Output>(task: (input: Input) => Promise<Output>): void {
  self.addEventListener("message", (event: MessageEvent<Input>) => {
    void task(event.data).then(
      (value) => self.postMessage({ ok: true, value } satisfies WorkerResponse<Output>),
      (error: unknown) =>
        self.postMessage({
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        } satisfies WorkerResponse<Output>),
    );
  });
}
