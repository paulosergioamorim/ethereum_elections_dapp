import { BaseError, ContractFunctionRevertedError, encodeErrorResult } from "viem";
import { describe, expect, it } from "vitest";
import { electionAbi, electionFactoryAbi, semaphoreAbi } from "@/contracts";
import { contractErrorName } from "@/contracts/errors";
import { errorMessage } from "@/lib/errors";
import { alice } from "../helpers/mock-wallet";

/** Revert de uma chamada à factory, como o viem entrega. */
function factoryRevert(data: `0x${string}`, functionName = "createElection") {
  return new ContractFunctionRevertedError({ abi: electionFactoryAbi, data, functionName });
}

describe("contractErrorName", () => {
  it("should read a factory error", () => {
    const error = factoryRevert(
      encodeErrorResult({
        abi: electionFactoryAbi,
        errorName: "OwnableUnauthorizedAccount",
        args: [alice],
      }),
    );

    expect(contractErrorName(error)).toBe("OwnableUnauthorizedAccount");
  });

  it("should decode an Election error that reverted through the factory", () => {
    const error = factoryRevert(encodeErrorResult({ abi: electionAbi, errorName: "InvalidVotingStart" }));

    expect(contractErrorName(error)).toBe("InvalidVotingStart");
  });

  it("should decode a Semaphore error that reverted through the factory", () => {
    const error = factoryRevert(
      encodeErrorResult({ abi: semaphoreAbi, errorName: "WrongSiblingNodes" }),
      "removeVoter",
    );

    expect(contractErrorName(error)).toBe("WrongSiblingNodes");
  });

  it("should ignore errors that did not come from a contract", () => {
    expect(contractErrorName(new Error("rede fora do ar"))).toBeUndefined();
  });
});

describe("errorMessage", () => {
  it("should translate a known contract error, even when wrapped", () => {
    const wrapped = new BaseError("A simulação falhou.", {
      cause: factoryRevert(encodeErrorResult({ abi: electionAbi, errorName: "InvalidMerkleRoot" })),
    });

    expect(errorMessage(wrapped)).toMatch(/Ainda não há eleitores cadastrados/);
  });
});
