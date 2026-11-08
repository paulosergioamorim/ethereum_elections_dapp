import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { concat, keccak256, numberToHex, size, stringToHex } from "viem";
import {
  commitBallot,
  decodeBallot,
  encodeBallot,
  randomSalt,
  voteMessage,
} from "../../shared/ballot.js";

describe("shared/ballot", () => {
  const ballot = { option: 1n, salt: randomSalt() };

  // randomSalt() tem 32 bytes e duas chamadas dão valores diferentes
  it("should generate a 32-byte random salt", () => {
    const salt = randomSalt();

    assert.equal(size(salt), 32);
    assert.notEqual(salt, randomSalt());
  });

  // decodeBallot(encodeBallot(b)) deepEqual b
  it("should round-trip encodeBallot and decodeBallot", () => {
    assert.deepEqual(decodeBallot(encodeBallot(ballot)), ballot);
  });

  // abi.encode de dois tipos estáticos = duas palavras de 32 bytes concatenadas (layout do Solidity)
  it("should match the abi.encode layout of (uint256, bytes32)", () => {
    const expected = concat([numberToHex(ballot.option, { size: 32 }), ballot.salt]);

    assert.equal(encodeBallot(ballot), expected);
    assert.equal(commitBallot(ballot), keccak256(expected));
  });

  // commitBallot muda se option ou salt mudar
  it("should change the commitment when option or salt changes", () => {
    const commitment = commitBallot(ballot);

    assert.notEqual(commitBallot({ ...ballot, option: 0n }), commitment);
    assert.notEqual(commitBallot({ ...ballot, salt: randomSalt() }), commitment);
  });

  // voteMessage muda se commitment ou ciphertext mudar
  it("should change the message when commitment or ciphertext changes", () => {
    const commitment = commitBallot(ballot);
    const ciphertext = stringToHex("ciphertext");
    const message = voteMessage(commitment, ciphertext);

    assert.notEqual(voteMessage(commitBallot({ ...ballot, option: 0n }), ciphertext), message);
    assert.notEqual(voteMessage(commitment, stringToHex("outro ciphertext")), message);
  });
});
