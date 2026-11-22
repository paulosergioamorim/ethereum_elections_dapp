import { describe, expect, it } from "vitest";
import { concat, keccak256, numberToHex, size, stringToHex } from "viem";
import {
  commitBallot,
  decodeBallot,
  encodeBallot,
  randomSalt,
  voteMessage,
} from "../ballot.js";

describe("shared/ballot", () => {
  const ballot = { option: 1n, salt: randomSalt() };

  // randomSalt() tem 32 bytes e duas chamadas dão valores diferentes
  it("should generate a 32-byte random salt", () => {
    const salt = randomSalt();

    expect(size(salt)).toBe(32);
    expect(salt).not.toBe(randomSalt());
  });

  // decodeBallot(encodeBallot(b)) deepEqual b
  it("should round-trip encodeBallot and decodeBallot", () => {
    expect(decodeBallot(encodeBallot(ballot))).toEqual(ballot);
  });

  // abi.encode de dois tipos estáticos = duas palavras de 32 bytes concatenadas (layout do Solidity)
  it("should match the abi.encode layout of (uint256, bytes32)", () => {
    const expected = concat([numberToHex(ballot.option, { size: 32 }), ballot.salt]);

    expect(encodeBallot(ballot)).toBe(expected);
    expect(commitBallot(ballot)).toBe(keccak256(expected));
  });

  // commitBallot muda se option ou salt mudar
  it("should change the commitment when option or salt changes", () => {
    const commitment = commitBallot(ballot);

    expect(commitBallot({ ...ballot, option: 0n })).not.toBe(commitment);
    expect(commitBallot({ ...ballot, salt: randomSalt() })).not.toBe(commitment);
  });

  // voteMessage muda se commitment ou ciphertext mudar
  it("should change the message when commitment or ciphertext changes", () => {
    const commitment = commitBallot(ballot);
    const ciphertext = stringToHex("ciphertext");
    const message = voteMessage(commitment, ciphertext);

    expect(voteMessage(commitBallot({ ...ballot, option: 0n }), ciphertext)).not.toBe(message);
    expect(voteMessage(commitment, stringToHex("outro ciphertext"))).not.toBe(message);
  });
});
