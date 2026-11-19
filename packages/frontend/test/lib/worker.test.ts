import { describe, expect, it, vi } from "vitest";
import { runInWorker, type WorkerLike, type WorkerResponse } from "@/lib/worker";

/** Worker falso (o jsdom não tem `Worker`): responde `reply` à mensagem recebida. */
function fakeWorker(reply: (input: unknown) => WorkerResponse<unknown>) {
  const target = new EventTarget();
  const worker = {
    addEventListener: target.addEventListener.bind(target),
    postMessage: vi.fn((input: unknown) => {
      queueMicrotask(() => target.dispatchEvent(new MessageEvent("message", { data: reply(input) })));
    }),
    terminate: vi.fn(),
  };

  return worker as typeof worker & WorkerLike;
}

describe("runInWorker", () => {
  it("should resolve with the worker value and terminate it", async () => {
    const worker = fakeWorker((input) => ({ ok: true, value: (input as bigint) * 2n }));

    await expect(runInWorker(() => worker, 21n)).resolves.toBe(42n);
    expect(worker.postMessage).toHaveBeenCalledWith(21n);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("should reject with the worker error message and terminate it", async () => {
    const worker = fakeWorker(() => ({ ok: false, message: "A rodada ainda não saiu." }));

    await expect(runInWorker(() => worker, 0)).rejects.toThrow("A rodada ainda não saiu.");
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
