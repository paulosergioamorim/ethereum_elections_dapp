import { BaseError, ContractFunctionRevertedError, encodeErrorResult } from "viem";
import { describe, expect, it } from "vitest";
import { candidateAbi, electionAbi, electionFactoryAbi, partyAbi, semaphoreAbi } from "@/contracts";
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

  it.each(["InvalidPresident", "EmptyPartyName"] as const)(
    "should read %s from createParty and translate it",
    (errorName) => {
      const error = factoryRevert(encodeErrorResult({ abi: partyAbi, errorName }), "createParty");

      expect(contractErrorName(error)).toBe(errorName);
      expect(errorMessage(error)).not.toBe(errorName);
    },
  );

  it.each([
    ["InvalidPresident", "O presidente não pode ser o endereço zero."],
    ["EmptyPartyName", "Informe o nome do partido."],
  ] as const)("should show %s as the Portuguese message", (errorName, message) => {
    const error = factoryRevert(encodeErrorResult({ abi: partyAbi, errorName }), "createParty");

    expect(errorMessage(error)).toBe(message);
  });

  it.each([
    ["InvalidCandidate", "A carteira do candidato não pode ser o endereço zero."],
    ["EmptyCandidateName", "Informe o nome do candidato."],
    ["InvalidParty", "O partido do candidato não pode ser o endereço zero."],
  ] as const)("should decode %s from createCandidate, raised by the Candidate, as the Portuguese message", (errorName, message) => {
    // o erro nasce no Candidate e sobe pelo Party, cuja ABI não o lista
    const error = new ContractFunctionRevertedError({
      abi: partyAbi,
      data: encodeErrorResult({ abi: candidateAbi, errorName }),
      functionName: "createCandidate",
    });

    expect(contractErrorName(error)).toBe(errorName);
    expect(errorMessage(error)).toBe(message);
  });

  it.each(["ZeroDonation", "InvalidRecipient", "WithdrawFailed"] as const)(
    "should read the Party error %s",
    (errorName) => {
      const error = new ContractFunctionRevertedError({
        abi: partyAbi,
        data: encodeErrorResult({ abi: partyAbi, errorName }),
        functionName: "donate",
      });

      expect(contractErrorName(error)).toBe(errorName);
      expect(errorMessage(error)).not.toBe(errorName);
    },
  );

  it("should read InsufficientBalance with its arguments", () => {
    const error = new ContractFunctionRevertedError({
      abi: partyAbi,
      data: encodeErrorResult({ abi: partyAbi, errorName: "InsufficientBalance", args: [1n, 2n] }),
      functionName: "withdraw",
    });

    expect(contractErrorName(error)).toBe("InsufficientBalance");
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

    expect(errorMessage(wrapped)).toMatch(/Ainda não há eleitores registrados/);
  });
});
