import { buildGroup } from "@elections/shared/group";
import { encodeEventTopics, getAddress, keccak256, toHex, zeroAddress, type Address, type Hex } from "viem";
import { vi } from "vitest";
import { electionFactoryAbi, factoryAddress } from "@/contracts";
import { publicClient } from "@/lib/chain";

export type MockVoter = {
  address: Address;
  /** Padrão: autorizado. `false` simula um eleitor removido depois de autorizado. */
  authorized?: boolean;
  /** Identidade registrada; sem ela, o eleitor ainda não se registrou. */
  commitment?: bigint;
  /** Bloco do registro (evento `MemberAdded`). Padrão: 2. */
  registeredAtBlock?: bigint;
};

export type MockBallot = {
  commitment: Hex;
  ciphertext: Hex;
  /** Já apurada: gera o `VoteRevealed` com esta opção. */
  revealedOption?: bigint;
  /** Apurada por outra pessoa depois da leitura dos eventos: só `isRevealed` sabe disso. */
  revealedMeanwhile?: boolean;
};

export type MockCandidate = {
  address: Address;
  /** A eleição que prende o candidato por uma indicação ativa (precisa estar em `details`). */
  heldBy?: Address;
  name: string;
  /** A carteira do candidato. */
  owner: Address;
  /** Saldo em wei. Padrão: 0. */
  balance?: bigint;
  /** Quanto cada conta já doou. */
  donatedBy?: Record<string, bigint>;
  /** `party()` que o contrato responde. Padrão: o partido que o lista; outro valor simula um contrato forjado. */
  claimedParty?: Address;
};

export type MockParty = {
  address: Address;
  name: string;
  /** O presidente. */
  owner: Address;
  pendingOwner?: Address;
  /** Saldo em wei. Padrão: 0. */
  balance?: bigint;
  /** Quanto cada conta já doou. */
  donatedBy?: Record<string, bigint>;
  /** Candidatos do partido, na ordem de criação. */
  candidates?: MockCandidate[];
};

/** Um indicado da eleição; uma string é só o nome do candidato. */
export type MockNominee = {
  name: string;
  /** Padrão: "Partido <nome>". */
  partyName?: string;
  /** A carteira do candidato. Padrão: um endereço derivado. */
  owner?: Address;
  /** Saldo em wei da candidatura. Padrão: 0. */
  balance?: bigint;
  /** Quanto cada conta já doou à candidatura. */
  donatedBy?: Record<string, bigint>;
  /** O contrato `Candidate` do indicado e o partido. Padrão: endereços derivados. */
  candidate?: Address;
  party?: Address;
  /** `false` simula uma indicação retirada: fora de `candidates()`, sem aceitar doações. */
  active?: boolean;
};

export type MockElection = {
  address: Address;
  title?: string;
  /** Os indicados, na ordem do voto. Padrão: Ana e Bruno. */
  candidates?: (string | MockNominee)[];
  /** Timestamps Unix em segundos. Padrão: já passou, então a eleição não está em indicação. */
  nominationEnd?: bigint;
  votingStart: bigint;
  votingEnd: bigint;
  /** Bloco da criação: a árvore da eleição tem só quem se registrou até ele. Padrão: 10. */
  createdAtBlock?: bigint;
  tally?: bigint[];
  nullVotes?: bigint;
  unrevealed?: bigint;
  revealed?: bigint;
  /** Cédulas na ordem dos índices; cada uma num bloco depois da criação. */
  ballots?: MockBallot[];
};

const groupId = 1n;
const semaphore: Address = "0x0000000000000000000000000000000000005e3a";

function sameAddress(value: unknown, address: Address) {
  return typeof value === "string" && value.toLowerCase() === address.toLowerCase();
}

/** Endereço simulado da candidatura (`index`-ésimo indicado) de uma eleição. */
export function mockCandidacyAddress(election: Address, index: number): Address {
  return derived("candidacy", election, index);
}

function derived(kind: string, election: Address, index: number): Address {
  return getAddress(`0x${keccak256(toHex(`${kind}:${election}:${index}`)).slice(26)}`);
}

/** Todas as candidaturas simuladas de uma eleição (ativas ou não), com os endereços derivados. */
function nomineesOf(election: MockElection) {
  return (election.candidates ?? ["Ana", "Bruno"]).map((entry, index) => {
    const nominee = typeof entry === "string" ? { name: entry } : entry;

    return {
      ...nominee,
      election: election.address,
      candidacy: derived("candidacy", election.address, index),
      candidate: nominee.candidate ?? derived("candidate", election.address, index),
      party: nominee.party ?? derived("party", election.address, index),
      partyName: nominee.partyName ?? `Partido ${nominee.name}`,
      owner: nominee.owner ?? derived("owner", election.address, index),
      active: nominee.active ?? true,
    };
  });
}

/** Segundos Unix de agora, deslocados em `seconds`. */
export function secondsFromNow(seconds: number): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + seconds);
}

/**
 * Estado on-chain simulado: factory com dono, eleitores e eleições, o grupo do Semaphore (com os
 * registros na ordem dos blocos) e, opcionalmente, uma eleição com a árvore congelada na criação.
 * Devolve o grupo atual, para os testes calcularem siblings.
 */
export function mockChain({
  owner,
  voters = [],
  elections = [],
  election: main,
  details = [],
  parties = [],
}: {
  owner: Address;
  voters?: MockVoter[];
  elections?: Address[];
  election?: MockElection;
  /** Outras eleições com dados próprios (título, prazos), lidas pelo endereço. */
  details?: MockElection[];
  /** Partidos da factory, na ordem de criação. Os testes podem mudar os objetos depois (saldo, presidente). */
  parties?: MockParty[];
}) {
  // registros em ordem de bloco (e de lista, no mesmo bloco); o índice na árvore segue essa ordem
  const members = voters
    .flatMap((voter, order) =>
      voter.commitment ? [{ commitment: voter.commitment, block: voter.registeredAtBlock ?? 2n, order }] : [],
    )
    .sort((a, b) => (a.block === b.block ? a.order - b.order : a.block < b.block ? -1 : 1))
    .map((member, index) => ({ ...member, index: BigInt(index) }));

  function groupUntil(block: bigint) {
    return buildGroup(
      members
        .filter((member) => member.block <= block)
        .map((member) => ({
          kind: "added" as const,
          index: member.index,
          identityCommitment: member.commitment,
        })),
    );
  }

  // recalculado a cada leitura: os testes mudam `candidates` para simular o que a transação minerada alterou
  const nomineesNow = () => [main, ...details].flatMap((election) => (election ? nomineesOf(election) : []));
  const group = groupUntil(2n ** 64n);
  const createdAtBlock = main?.createdAtBlock ?? 10n;
  const electionRoot = main ? (groupUntil(createdAtBlock).root ?? 0n) : 0n;

  vi.mocked(publicClient.readContract).mockImplementation((async ({
    address,
    functionName,
    args,
  }: {
    address: Address;
    functionName: string;
    args?: readonly unknown[];
  }) => {
    const party = parties.find((candidate) => sameAddress(address, candidate.address));
    const listed = parties.flatMap((holder) => (holder.candidates ?? []).map((item) => ({ item, holder })));
    const candidate = listed.find(({ item }) => sameAddress(address, item.address));
    const voter = voters.find((candidate) => sameAddress(args?.[0], candidate.address));
    // leituras de uma eleição vão para a dela; sem dados próprios, para a `election` principal
    const election = details.find((detail) => sameAddress(address, detail.address)) ?? main;

    const allNominees = nomineesNow();
    const byCandidacy = allNominees.find((nominee) => sameAddress(address, nominee.candidacy));

    switch (functionName) {
      // factory
      case "owner":
        return byCandidacy ? byCandidacy.owner : candidate ? candidate.item.owner : party ? party.owner : owner;
      case "candidateHeldBy":
        return listed.find(({ item }) => sameAddress(args?.[0], item.address))?.item.heldBy ?? zeroAddress;
      case "candidacyIsActive":
        return allNominees.find((nominee) => sameAddress(args?.[0], nominee.candidacy))?.active ?? false;
      case "sem":
        return semaphore;
      case "groupId":
        return groupId;
      case "elections":
        return elections;
      case "isElection":
        return (
          [main, ...details].some(
            (detail) => detail !== undefined && sameAddress(args?.[0], detail.address),
          ) ||
          elections.some((address) => sameAddress(args?.[0], address))
        );
      case "parties":
        return parties.map((candidate) => candidate.address);
      case "isParty":
        return parties.some((candidate) => sameAddress(args?.[0], candidate.address));
      // party
      case "name":
        return (
          allNominees.find((nominee) => sameAddress(address, nominee.candidate))?.name ??
          allNominees.find((nominee) => sameAddress(address, nominee.party))?.partyName ??
          (candidate ? candidate.item.name : party?.name)
        );
      case "candidate":
        return byCandidacy?.candidate;
      case "party":
        return byCandidacy
          ? byCandidacy.party
          : candidate
            ? (candidate.item.claimedParty ?? candidate.holder.address)
            : undefined;
      case "isCandidate":
        return (party?.candidates ?? []).some((item) => sameAddress(args?.[0], item.address));
      case "pendingOwner":
        return party?.pendingOwner ?? zeroAddress;
      case "donatedBy": {
        const donated = Object.entries(
          (byCandidacy ? byCandidacy.donatedBy : candidate ? candidate.item.donatedBy : party?.donatedBy) ?? {},
        ).find(([account]) =>
          sameAddress(args?.[0], account as Address),
        );

        return donated?.[1] ?? 0n;
      }
      case "isAuthorized":
        return voter ? (voter.authorized ?? true) : false;
      case "commitmentOf":
        return voter?.commitment ?? 0n;
      // semaphore
      case "getMerkleTreeRoot":
        return group.root ?? 0n;
      // election
      case "title":
        return election?.title ?? "Representante da turma";
      case "candidates":
        return party
          ? (party.candidates ?? []).map((item) => item.address)
          : (election ? nomineesOf(election) : []).filter((nominee) => nominee.active).map((nominee) => nominee.candidacy);
      case "nominationEnd":
        return election?.nominationEnd ?? 1n;
      case "votingStart":
        return election?.votingStart;
      case "votingEnd":
        return election?.votingEnd;
      case "merkleTreeRoot":
        return electionRoot;
      case "createdAtBlock":
        return createdAtBlock;
      case "results":
        return [
          election?.tally ??
            (election ? nomineesOf(election) : []).filter((nominee) => nominee.active).map(() => 0n),
          election?.nullVotes ?? 0n,
          election?.unrevealed ?? 0n,
        ];
      case "revealedCount":
        return election?.revealed ?? 0n;
      case "isRevealed": {
        const ballot = election?.ballots?.[Number(args?.[0])];

        return ballot ? ballot.revealedOption !== undefined || ballot.revealedMeanwhile === true : false;
      }
      default:
        throw new Error(`Leitura não simulada nos testes: ${functionName}`);
    }
  }) as never);

  vi.mocked(publicClient.getBalance).mockImplementation((async ({ address }: { address: Address }) =>
    nomineesNow().find((nominee) => sameAddress(address, nominee.candidacy))?.balance ??
    (parties.find((party) => sameAddress(address, party.address)) ??
      parties.flatMap((party) => party.candidates ?? []).find((item) => sameAddress(address, item.address)))
      ?.balance ?? 0n) as never);

  const events = [
    ...voters.map((voter, index) => ({
      eventName: "VoterAuthorized",
      args: { voter: voter.address },
      blockNumber: 1n,
      logIndex: index,
    })),
    ...members.map((member) => ({
      eventName: "MemberAdded",
      args: {
        groupId,
        index: member.index,
        identityCommitment: member.commitment,
        merkleTreeRoot: 0n,
      },
      blockNumber: member.block,
      logIndex: Number(member.index),
    })),
    // um `Nominated` por candidatura de cada eleição, ativa ou não (a retirada só some de `candidates()`)
    ...[main, ...details].flatMap((election) =>
      election
        ? nomineesNow().flatMap((nominee, index) =>
            nominee.election === election.address
              ? [
                  {
                    eventName: "Nominated",
                    args: {
                      election: election.address,
                      party: nominee.party,
                      candidate: nominee.candidate,
                      candidacy: nominee.candidacy,
                    },
                    blockNumber: (election.createdAtBlock ?? 10n) + 1n,
                    logIndex: index,
                  },
                ]
              : [],
          )
        : [],
    ),
    ...(main?.ballots ?? []).flatMap((ballot, index) => [
      {
        eventName: "VoteCast",
        args: {
          nullifier: BigInt(index + 1),
          index: BigInt(index),
          commitment: ballot.commitment,
          ciphertext: ballot.ciphertext,
        },
        blockNumber: createdAtBlock + 1n + BigInt(index),
        logIndex: 0,
      },
      ...(ballot.revealedOption === undefined
        ? []
        : [
            {
              eventName: "VoteRevealed",
              args: { index: BigInt(index), option: ballot.revealedOption },
              blockNumber: createdAtBlock + 1_000n,
              logIndex: index,
            },
          ]),
    ]),
  ];

  // como um RPC de verdade: só os eventos do tipo e da faixa de blocos pedidos
  let groupLogsFail = false;

  vi.mocked(publicClient.getContractEvents).mockImplementation((async ({
    eventName,
    fromBlock,
    toBlock,
  }: {
    eventName: string;
    fromBlock: bigint;
    toBlock: bigint;
  }) => {
    // o RPC público que perde o histórico ao acaso: "pruned history unavailable"
    if (groupLogsFail && (eventName === "MemberAdded" || eventName === "MemberRemoved")) {
      throw new Error("pruned history unavailable");
    }

    return events.filter(
      (event) =>
        event.eventName === eventName &&
        event.blockNumber >= fromBlock &&
        event.blockNumber <= toBlock,
    );
  }) as never);

  return {
    group,
    parties,
    /** Liga e desliga a falha da leitura dos eventos do grupo (a árvore de eleitores). */
    failGroupLogs(fail: boolean) {
      groupLogsFail = fail;
    },
  };
}

/** Recibo de `createElection` com o evento `ElectionCreated` da nova eleição. */
export function mockElectionCreatedReceipt(election: Address) {
  const topics = encodeEventTopics({
    abi: electionFactoryAbi,
    eventName: "ElectionCreated",
    args: { election },
  });

  vi.mocked(publicClient.waitForTransactionReceipt).mockImplementation((async ({
    hash,
  }: {
    hash: string;
  }) => ({
    status: "success",
    transactionHash: hash,
    logs: [{ address: factoryAddress, topics, data: "0x", blockNumber: 3n, logIndex: 0 }],
  })) as never);
}

/** Recibo de `createParty` com o evento `PartyCreated` do novo partido. */
export function mockPartyCreatedReceipt(party: Address) {
  const topics = encodeEventTopics({
    abi: electionFactoryAbi,
    eventName: "PartyCreated",
    args: { party },
  });

  vi.mocked(publicClient.waitForTransactionReceipt).mockImplementation((async ({
    hash,
  }: {
    hash: string;
  }) => ({
    status: "success",
    transactionHash: hash,
    logs: [{ address: factoryAddress, topics, data: "0x", blockNumber: 3n, logIndex: 0 }],
  })) as never);
}
