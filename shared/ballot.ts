import {
  bytesToHex,
  decodeAbiParameters,
  encodeAbiParameters,
  keccak256,
  type Hex,
} from "viem";

/** Voto em claro: índice do candidato (fora do intervalo vira voto nulo) e o salt do commitment. */
export type Ballot = {
  option: bigint;
  salt: Hex;
};

const BALLOT_ABI = [
  { type: "uint256", name: "option" },
  { type: "bytes32", name: "salt" },
] as const;

/** 32 bytes aleatórios do gerador criptográfico (Web Crypto, disponível no Node e no navegador). */
export function randomSalt(): Hex {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

/** `abi.encode(option, salt)`: o texto que vai cifrado no tlock. */
export function encodeBallot({ option, salt }: Ballot): Hex {
  return encodeAbiParameters(BALLOT_ABI, [option, salt]);
}

export function decodeBallot(encoded: Hex): Ballot {
  const [option, salt] = decodeAbiParameters(BALLOT_ABI, encoded);
  return { option, salt };
}

/** Igual ao `keccak256(abi.encode(option, salt))` de `Election.revealBatch`. */
export function commitBallot(ballot: Ballot): Hex {
  return keccak256(encodeBallot(ballot));
}

/** Igual à `message` esperada em `Election.vote`: `uint256(keccak256(abi.encode(commitment, keccak256(ciphertext))))`. */
export function voteMessage(commitment: Hex, ciphertext: Hex): bigint {
  return BigInt(
    keccak256(
      encodeAbiParameters(
        [{ type: "bytes32" }, { type: "bytes32" }],
        [commitment, keccak256(ciphertext)],
      ),
    ),
  );
}
