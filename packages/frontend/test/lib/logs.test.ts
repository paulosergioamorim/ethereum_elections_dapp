import { describe, expect, it, vi } from "vitest";
import { fetchLogsInRanges, logRetry } from "@/lib/logs";

describe("fetchLogsInRanges", () => {
  it("should read every block range, in order", async () => {
    const fetchRange = vi.fn(async ({ fromBlock }: { fromBlock: bigint; toBlock: bigint }) => [fromBlock]);

    const logs = await fetchLogsInRanges({ fromBlock: 0n, toBlock: 120_000n }, fetchRange);

    expect(fetchRange).toHaveBeenCalledTimes(3);
    expect(logs).toEqual([0n, 50_000n, 100_000n]);
  });

  it("should retry only the range that failed", async () => {
    let flaky = 1;
    const fetchRange = vi.fn(async ({ fromBlock }: { fromBlock: bigint; toBlock: bigint }) => {
      if (fromBlock === 50_000n && flaky-- > 0) {
        throw new Error("pruned history unavailable");
      }

      return [fromBlock];
    });

    const logs = await fetchLogsInRanges({ fromBlock: 0n, toBlock: 60_000n }, fetchRange);

    expect(logs).toEqual([0n, 50_000n]);
    // a primeira faixa não foi refeita: 1 + 2 tentativas da segunda
    expect(fetchRange).toHaveBeenCalledTimes(3);
  });

  it("should give up with the last error after the attempts run out", async () => {
    const fetchRange = vi.fn(async (): Promise<number[]> => {
      throw new Error("pruned history unavailable");
    });

    await expect(fetchLogsInRanges({ fromBlock: 0n, toBlock: 10n }, fetchRange)).rejects.toThrow(
      "pruned history unavailable",
    );
    expect(fetchRange).toHaveBeenCalledTimes(logRetry.attempts);
  });
});
