import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { parseEventLogs, type Address } from "viem";
import { electionAbi } from "@/contracts";
import { useVoterStatus, voterStatusQueryOptions } from "@/factory";
import { deriveVoterIdentity } from "@/identity/derive";
import { freshBlockNumber, raiseBlockFloor } from "@/lib/block-floor";
import { liveEvents, publicClient } from "@/lib/chain";
import { runTransaction } from "@/lib/transaction";
import { useNow } from "@/lib/use-now";
import { requireWalletClient, useWallet } from "@/wallet";
import { chunk, pendingReveals, REVEAL_BATCH_SIZE } from "./ballots";
import { electionKeys } from "./keys";
import { phaseAt } from "./phase";
import {
  electionBallotsQueryOptions,
  electionGroupQueryOptions,
  electionQueryOptions,
  electionResultsQueryOptions,
  electionsQueryOptions,
  openedBallotsQueryOptions,
  type ElectionDetails,
} from "./queries";

/** Eleições criadas pela factory (leitura pública, sem carteira). */
export function useElections() {
  return useQuery(electionsQueryOptions);
}

/** Dados fixos da eleição; sem endereço, não consulta. */
export function useElection(address: Address | undefined) {
  return useQuery(electionQueryOptions(address));
}

/** Votos por candidato, nulos e cédulas ainda fechadas. */
export function useElectionResults(address: Address | undefined) {
  return useQuery(electionResultsQueryOptions(address));
}

/** Árvore de eleitores congelada na criação da eleição. */
export function useElectionGroup(election: ElectionDetails | undefined) {
  return useQuery(electionGroupQueryOptions(election));
}

/**
 * Se a conta ativa pode votar nesta eleição. Usa o registro on-chain (`commitmentOf`) e a árvore
 * congelada da eleição: dá a resposta antes de pedir qualquer assinatura.
 * - `not-registered`: a conta nunca se registrou;
 * - `registered-after`: registrou-se depois da criação da eleição, então não está na lista dela.
 */
export type VoteEligibility =
  | "disconnected"
  | "loading"
  | "error"
  | "not-registered"
  | "registered-after"
  | "eligible";

export function useVoteEligibility(election: ElectionDetails | undefined): {
  eligibility: VoteEligibility;
  /** Refaz a leitura da conta e da árvore (botão "Tentar de novo" quando deu erro). */
  retry: () => void;
} {
  const { status, account } = useWallet();
  const voter = useVoterStatus(account);
  const group = useElectionGroup(election);
  const { refetch: refetchGroup, isError: groupFailed } = group;

  // a árvore não depende da conta e nunca fica velha, então uma falha ficaria presa na tela:
  // trocar de conta é a hora natural de tentar de novo
  useEffect(() => {
    if (groupFailed) {
      void refetchGroup();
    }
    // só na troca de conta (a dependência é de propósito): refazer a cada falha seria um laço
  }, [account]);

  function retry() {
    void voter.refetch();
    void refetchGroup();
  }

  function decide(): VoteEligibility {
    if (status !== "connected") {
      return "disconnected";
    }

    if (voter.isError) {
      return "error";
    }

    if (!voter.data) {
      return "loading";
    }

    // quem não está registrado não depende da árvore, então o erro dela não importa aqui
    if (voter.data.commitment === 0n) {
      return "not-registered";
    }

    if (group.isError) {
      return "error";
    }

    if (!group.data) {
      return "loading";
    }

    return group.data.indexOf(voter.data.commitment) >= 0 ? "eligible" : "registered-after";
  }

  return { eligibility: decide(), retry };
}

/** Etapa do voto em andamento, para o botão dizer o que está acontecendo. */
export type VoteStep = "identity" | "proving" | "sending" | "confirming";

/**
 * `vote` pela conta ativa: recria a identidade (assinatura), sela a cédula com tlock, gera a prova
 * Semaphore contra a árvore congelada da eleição e envia. Devolve o índice da cédula registrada.
 */
export function useVote(election: ElectionDetails) {
  const { walletClient } = useWallet();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<VoteStep>();

  const mutation = useMutation({
    meta: { errorTitle: "Não foi possível votar" },
    mutationFn: async (option: bigint) => {
      const client = requireWalletClient(walletClient);

      // confere a lista antes de pedir assinatura e gastar segundos gerando a prova
      const [{ commitment: registered }, group] = await Promise.all([
        queryClient.query(voterStatusQueryOptions(client.account.address)),
        queryClient.query(electionGroupQueryOptions(election)),
      ]);

      if (registered === 0n) {
        throw new Error("Esta conta não se registrou como eleitora.");
      }

      if (group.indexOf(registered) < 0) {
        throw new Error("Esta conta se registrou depois da criação desta eleição e não pode votar nela.");
      }

      const receipt = await runTransaction(
        {
          signing: "Assine a mensagem na carteira.",
          details: "Ela recria sua identidade de eleitor. Nada fica salvo.",
          success: "Voto registrado.",
        },
        async (progress) => {
          setStep("identity");
          const identity = await deriveVoterIdentity(client);

          if (identity.commitment !== registered) {
            throw new Error("A identidade gerada pela carteira não confere com o registro desta conta.");
          }

          setStep("proving");
          progress(
            "Gerando a prova de voto…",
            "Leva alguns segundos. A cédula fica cifrada até o fim da votação.",
          );
          const { prepareVote } = await import("./vote-crypto");
          const vote = await prepareVote({ identity, group, election, option });

          setStep("sending");
          progress("Confirme o voto na carteira.");
          const { request } = await publicClient.simulateContract({
            account: client.account,
            address: election.address,
            abi: electionAbi,
            functionName: "vote",
            args: [vote.proof, vote.commitment, vote.ciphertext],
          });
          const hash = await client.writeContract(request);

          setStep("confirming");

          return hash;
        },
      );

      const [cast] = parseEventLogs({ abi: electionAbi, eventName: "VoteCast", logs: receipt.logs });

      return { index: cast?.args.index };
    },
    onSuccess: () => refreshTally(queryClient, election.address),
    onSettled: () => setStep(undefined),
  });

  return { ...mutation, step };
}

/** Relê o que muda com votos e apuração: a contagem do contrato e a lista de cédulas. */
export function refreshTally(queryClient: QueryClient, address: Address) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: electionKeys.results(address) }),
    queryClient.invalidateQueries({ queryKey: electionKeys.ballots(address) }),
  ]);
}

/**
 * Escuta `VoteCast` e `VoteRevealed` da eleição por `eth_subscribe` e relê contagem e cédulas a cada
 * evento, inclusive quando outra pessoa vota ou apura. Sem polling: só com WebSocket configurado.
 * Numa queda do WebSocket, o viem reconecta e reassina sozinho; o `onError` relê o que pode ter se
 * perdido no intervalo.
 */
export function useElectionEvents(address: Address | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!address || !liveEvents) {
      return;
    }

    return publicClient.watchContractEvent({
      address,
      abi: electionAbi,
      onLogs: (logs) => {
        // a releitura precisa enxergar o bloco do evento, mesmo vinda de um nó atrasado do RPC
        for (const log of logs) {
          raiseBlockFloor(log.blockNumber ?? undefined);
        }

        void refreshTally(queryClient, address);
      },
      onError: () => void refreshTally(queryClient, address),
    });
  }, [address, queryClient]);
}

/** Cédulas registradas, com a opção das já apuradas no contrato. */
export function useElectionBallots(election: ElectionDetails | undefined) {
  return useQuery(electionBallotsQueryOptions(election));
}

/**
 * Cédulas abertas no navegador, só na fase de apuração (antes do fim, o drand nem publicou a rodada).
 * Se alguma ainda espera a rodada, tenta de novo uma vez, no horário dela (até 5 min à frente).
 */
export function useOpenedBallots(election: ElectionDetails) {
  const tally = phaseAt(useNow() / 1000, election) === "tally";
  const ballots = useElectionBallots(election);
  const opened = useQuery(openedBallotsQueryOptions(election, tally ? ballots.data : undefined));
  const refetch = opened.refetch;
  const retryAt = opened.data
    ?.flatMap((ballot) => (ballot.status === "too-early" ? [ballot.availableAt] : []))
    .reduce((earliest, at) => Math.min(earliest, at), Infinity);

  useEffect(() => {
    if (retryAt === undefined || retryAt === Infinity) {
      return;
    }

    const delay = retryAt - Date.now() + 1_000;

    if (delay > 5 * 60_000) {
      return;
    }

    const timer = setTimeout(() => void refetch(), Math.max(delay, 0));

    return () => clearTimeout(timer);
  }, [retryAt, refetch]);

  return { ballots, opened };
}

/** Lote em andamento da apuração, para o botão dizer o que está acontecendo. */
export type RevealProgress = { batch: number; batches: number; step: "sending" | "confirming" };

/**
 * Publica as cédulas abertas no navegador com `revealBatch`, em lotes de `REVEAL_BATCH_SIZE`.
 * Qualquer conta pode apurar: o contrato só aceita `(opção, salt)` que batam com o commitment.
 * Antes de cada lote, descarta o que outra pessoa já apurou (o contrato pularia, mas custaria gás).
 */
export function useRevealBallots(election: ElectionDetails) {
  const { walletClient } = useWallet();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<RevealProgress>();

  const mutation = useMutation({
    meta: { errorTitle: "Não foi possível apurar" },
    mutationFn: async () => {
      const client = requireWalletClient(walletClient);
      const ballots = await queryClient.query(electionBallotsQueryOptions(election));
      const opened = await queryClient.query(openedBallotsQueryOptions(election, ballots));
      const batches = chunk(pendingReveals(ballots, opened), REVEAL_BATCH_SIZE);

      if (batches.length === 0) {
        throw new Error("Não há cédulas abertas esperando apuração.");
      }

      let published = 0;

      for (const [i, batch] of batches.entries()) {
        const label = batches.length > 1 ? ` (lote ${i + 1} de ${batches.length})` : "";
        const blockNumber = await freshBlockNumber();
        const alreadyRevealed = await Promise.all(
          batch.map((ballot) =>
            publicClient.readContract({
              address: election.address,
              abi: electionAbi,
              functionName: "isRevealed",
              args: [ballot.index],
              blockNumber,
            }),
          ),
        );
        const pending = batch.filter((_, j) => !alreadyRevealed[j]);

        if (pending.length === 0) {
          continue;
        }

        await runTransaction(
          {
            signing: `Confirme a apuração${label} na carteira.`,
            details: `${pending.length} cédula(s) abertas com o drand.`,
            success: `Apuração publicada${label}.`,
          },
          async () => {
            setProgress({ batch: i + 1, batches: batches.length, step: "sending" });
            const { request } = await publicClient.simulateContract({
              account: client.account,
              address: election.address,
              abi: electionAbi,
              functionName: "revealBatch",
              args: [
                pending.map((ballot) => ballot.index),
                pending.map((ballot) => ballot.option),
                pending.map((ballot) => ballot.salt),
              ],
            });
            const hash = await client.writeContract(request);

            setProgress({ batch: i + 1, batches: batches.length, step: "confirming" });

            return hash;
          },
        );

        published += pending.length;
        // a contagem avança a cada lote, sem esperar o fim de todos
        await refreshTally(queryClient, election.address);
      }

      return { published };
    },
    onSettled: () => {
      setProgress(undefined);

      return refreshTally(queryClient, election.address);
    },
  });

  return { ...mutation, progress };
}
