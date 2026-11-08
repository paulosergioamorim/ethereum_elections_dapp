import {
  Buffer,
  mainnetClient,
  roundAt,
  roundTime,
  timelockDecrypt,
  timelockEncrypt,
  type ChainClient,
} from "tlock-js";
import { bytesToHex, hexToBytes, stringToHex, hexToString, type Hex } from "viem";
import { decodeBallot, encodeBallot, type Ballot } from "./ballot.js";

/** Cliente da rede quicknet do drand (rodadas a cada 3 s), a que o `mainnetClient` do tlock-js usa. */
export function quicknetClient(): ChainClient {
  return mainnetClient();
}

/**
 * Primeira rodada do drand publicada em ou depois de `timestamp` (em segundos).
 * Cifrar para a rodada de `votingEnd` garante que ninguém decifra antes do fim da votação.
 */
export async function roundForTimestamp(
  timestamp: bigint,
  client: ChainClient,
): Promise<number> {
  const info = await client.chain().info();
  const timeMs = Number(timestamp) * 1000;
  // `roundAt` devolve a última rodada publicada até `timeMs`, que pode ser até um período antes
  const round = roundAt(timeMs, info);

  return roundTime(info, round) < timeMs ? round + 1 : round;
}

/**
 * Cifra `abi.encode(option, salt)` para a rodada `round`.
 * Devolve o ciphertext (texto armado do age) em bytes hex, pronto para o `vote`.
 */
export async function sealBallot(
  ballot: Ballot,
  round: number,
  client: ChainClient,
): Promise<Hex> {
  const payload = Buffer.from(hexToBytes(encodeBallot(ballot)));
  const armored = await timelockEncrypt(round, payload, client);
  return stringToHex(armored);
}

/** Decifra um ciphertext do evento `VoteCast`. Falha se a rodada ainda não foi publicada. */
export async function openBallot(
  ciphertext: Hex,
  client: ChainClient,
): Promise<Ballot> {
  const payload = await timelockDecrypt(hexToString(ciphertext), client);
  return decodeBallot(bytesToHex(payload));
}
