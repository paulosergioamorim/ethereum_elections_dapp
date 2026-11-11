import type {
  ContractReturnType,
  HardhatViemHelpers,
  WalletClient,
} from "@nomicfoundation/hardhat-viem/types";
import { Group } from "@semaphore-protocol/group";
import type { Identity } from "@semaphore-protocol/identity";
import { generateProof } from "@semaphore-protocol/proof";
import type { Address, Hex } from "viem";
import {
  buildGroup,
  commitBallot,
  deriveIdentity,
  identityMessage,
  randomSalt,
  voteMessage,
  type Ballot,
  type MemberEvent,
} from "../../../shared/index.js";

export type Semaphore = ContractReturnType<"Semaphore">;
export type ElectionFactory = ContractReturnType<"ElectionFactory">;
export type Election = ContractReturnType<"Election">;

export type Voter = {
  wallet: WalletClient;
  identity: Identity;
};

/** Semaphore v4 real: PoseidonT3 (library linkada), verificador Groth16 e o contrato principal. */
export async function deploySemaphore(viem: HardhatViemHelpers): Promise<Semaphore> {
  const poseidon = await viem.deployContract("PoseidonT3");
  const verifier = await viem.deployContract("SemaphoreVerifier");

  return viem.deployContract("Semaphore", [verifier.address], {
    libraries: { PoseidonT3: poseidon.address },
  });
}

/** Factory implantada pela primeira conta (a autoridade), contra o Semaphore real. */
export async function deployFactory(
  viem: HardhatViemHelpers,
): Promise<{ semaphore: Semaphore; factory: ElectionFactory }> {
  const semaphore = await deploySemaphore(viem);
  const factory = await viem.deployContract("ElectionFactory", [semaphore.address]);

  return { semaphore, factory };
}

/** Identidade derivada da assinatura da carteira, como o frontend fará. */
export async function identityOf(
  viem: HardhatViemHelpers,
  wallet: WalletClient,
  factory: Address,
): Promise<Identity> {
  const chainId = await (await viem.getPublicClient()).getChainId();
  const signature = await wallet.signMessage({
    account: wallet.account,
    message: identityMessage(chainId, factory),
  });

  return deriveIdentity(signature);
}

/** Autoriza as carteiras (pela autoridade) e cada uma registra a própria identidade. */
export async function registerVoters(
  viem: HardhatViemHelpers,
  factory: ElectionFactory,
  wallets: readonly WalletClient[],
): Promise<Voter[]> {
  await factory.write.addAuthorizedVoters([wallets.map((w) => w.account.address)]);

  const voters: Voter[] = [];

  for (const wallet of wallets) {
    const identity = await identityOf(viem, wallet, factory.address);
    await factory.write.registerIdentityCommitment([identity.commitment], {
      account: wallet.account,
    });
    voters.push({ wallet, identity });
  }

  return voters;
}

/** Cria uma eleição com 2 candidatos começando em `start` e terminando em `end` (segundos da chain). */
export async function createElection(
  viem: HardhatViemHelpers,
  factory: ElectionFactory,
  { start, end }: { start: bigint; end: bigint },
): Promise<Election> {
  const publicClient = await viem.getPublicClient();
  const hash = await factory.write.createElection([
    {
      title: "Eleição de teste",
      candidates: ["Candidato A", "Candidato B"],
      votingStart: start,
      votingEnd: end,
    },
  ]);
  await publicClient.waitForTransactionReceipt({ hash });

  const elections = await factory.read.elections();

  return viem.getContractAt("Election", elections[elections.length - 1]);
}

/** Eventos de membros do grupo da factory, na ordem da chain, no formato de `buildGroup`. */
export async function groupEvents(
  semaphore: Semaphore,
  groupId: bigint,
  toBlock?: bigint,
): Promise<MemberEvent[]> {
  const range = { fromBlock: 0n, toBlock: toBlock ?? "latest" } as const;
  const [added, removed] = await Promise.all([
    semaphore.getEvents.MemberAdded({ groupId }, range),
    semaphore.getEvents.MemberRemoved({ groupId }, range),
  ]);

  return [...added, ...removed]
    .sort((a, b) =>
      a.blockNumber === b.blockNumber
        ? a.logIndex - b.logIndex
        : Number(a.blockNumber - b.blockNumber),
    )
    .map((log): MemberEvent =>
      log.eventName === "MemberAdded"
        ? {
          kind: "added",
          index: log.args.index!,
          identityCommitment: log.args.identityCommitment!,
        }
        : { kind: "removed", index: log.args.index! },
    );
}

/**
 * Grupo como estava quando a eleição foi criada: a prova precisa ser contra a raiz congelada.
 * Remonta pelos eventos até `createdAtBlock`.
 */
export async function electionGroup(
  semaphore: Semaphore,
  election: Election,
): Promise<Group> {
  const [groupId, createdAtBlock] = await Promise.all([
    election.read.groupId(),
    election.read.createdAtBlock(),
  ]);

  return buildGroup(await groupEvents(semaphore, groupId, createdAtBlock));
}

export type PreparedVote = {
  ballot: Ballot;
  commitment: Hex;
  ciphertext: Hex;
  proof: Awaited<ReturnType<typeof toSolidityProof>>;
};

/** Converte a prova do `@semaphore-protocol/proof` (strings) para o struct do contrato (bigints). */
function toSolidityProof(proof: Awaited<ReturnType<typeof generateProof>>) {
  return {
    merkleTreeDepth: BigInt(proof.merkleTreeDepth),
    merkleTreeRoot: BigInt(proof.merkleTreeRoot),
    nullifier: BigInt(proof.nullifier),
    message: BigInt(proof.message),
    scope: BigInt(proof.scope),
    points: proof.points.map(BigInt) as [
      bigint, bigint, bigint, bigint,
      bigint, bigint, bigint, bigint,
    ],
  };
}

/**
 * Monta um voto completo sem enviar: commitment, ciphertext e a prova Semaphore real.
 * `ciphertext` vem pronto (do `sealBallot`, ou bytes quaisquer quando o tlock não importa ao teste).
 * Por padrão a prova é contra o grupo congelado da eleição; `group` permite provar contra outra árvore.
 */
export async function prepareVote(
  semaphore: Semaphore,
  election: Election,
  identity: Identity,
  option: bigint,
  ciphertext: Hex,
  salt: Hex = randomSalt(),
  group?: Group,
): Promise<PreparedVote> {
  const ballot = { option, salt };
  const commitment = commitBallot(ballot);
  group ??= await electionGroup(semaphore, election);
  const scope = BigInt(election.address);
  const proof = await generateProof(
    identity,
    group,
    voteMessage(commitment, ciphertext),
    scope,
  );

  return { ballot, commitment, ciphertext, proof: toSolidityProof(proof) };
}

/** Envia um voto preparado. `sender` pode ser qualquer conta (o contrato não usa o msg.sender). */
export async function sendVote(
  election: Election,
  { proof, commitment, ciphertext }: PreparedVote,
  sender: WalletClient,
): Promise<Hex> {
  return election.write.vote([proof, commitment, ciphertext], {
    account: sender.account,
  });
}

/** Grupo atual da factory, remontado pelos eventos. */
export async function currentGroup(
  semaphore: Semaphore,
  factory: ElectionFactory,
): Promise<Group> {
  return buildGroup(await groupEvents(semaphore, await factory.read.groupId()));
}

/** Siblings reais da folha do eleitor na árvore atual, como o painel da autoridade fará. */
export async function siblingsOf(
  semaphore: Semaphore,
  factory: ElectionFactory,
  voter: Voter,
): Promise<bigint[]> {
  const group = await currentGroup(semaphore, factory);

  return group
    .generateMerkleProof(group.indexOf(voter.identity.commitment))
    .siblings.map(BigInt);
}

/** `removeVoter` com os siblings reais. */
export async function removeVoter(
  semaphore: Semaphore,
  factory: ElectionFactory,
  voter: Voter,
): Promise<Hex> {
  return factory.write.removeVoter([
    voter.wallet.account.address,
    await siblingsOf(semaphore, factory, voter),
  ]);
}

/**
 * Encerra os workers do ffjavascript (usado pelo snarkjs para gerar a prova).
 * Sem isso o processo do Node não termina depois dos testes. Chamar no `after` de cada arquivo que gera prova.
 */
export async function terminateProver(): Promise<void> {
  const curve = (globalThis as { curve_bn128?: { terminate(): Promise<void> } })
    .curve_bn128;
  await curve?.terminate();
}
