import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshBlockNumber, raiseBlockFloor } from "@/lib/block-floor";
import { publicClient } from "@/lib/chain";

// o piso é global do módulo: cada teste parte de um bloco acima do anterior
let block = 1_000n;

describe("freshBlockNumber", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    block += 1_000n;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should ignore the viem cache for the latest block", async () => {
    vi.mocked(publicClient.getBlockNumber).mockResolvedValue(block);

    expect(await freshBlockNumber()).toBe(block);
    expect(publicClient.getBlockNumber).toHaveBeenCalledWith({ cacheTime: 0 });
  });

  it("should wait for the RPC to reach the last confirmed transaction", async () => {
    // a transação entrou no bloco `block`, mas o nó que responde ainda está no anterior
    raiseBlockFloor(block);
    vi.mocked(publicClient.getBlockNumber)
      .mockResolvedValueOnce(block - 1n)
      .mockResolvedValueOnce(block);

    const result = freshBlockNumber();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(await result).toBe(block);
    expect(publicClient.getBlockNumber).toHaveBeenCalledTimes(2);
  });

  it("should give up with a clear error if the RPC never catches up", async () => {
    raiseBlockFloor(block);
    vi.mocked(publicClient.getBlockNumber).mockResolvedValue(block - 1n);

    const result = expect(freshBlockNumber()).rejects.toThrow(/ainda não alcançou/);
    await vi.advanceTimersByTimeAsync(10_000);

    await result;
  });

  it("should never lower the floor", async () => {
    raiseBlockFloor(block);
    raiseBlockFloor(block - 500n);
    raiseBlockFloor(undefined);
    vi.mocked(publicClient.getBlockNumber).mockResolvedValue(block);

    expect(await freshBlockNumber()).toBe(block);
  });
});
