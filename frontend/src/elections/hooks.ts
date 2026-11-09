import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { parseEventLogs, type Address } from "viem";
import { electionAbi } from "@/contracts";
import { useVoterStatus, voterStatusQueryOptions } from "@/factory";
import { deriveVoterIdentity } from "@/identity/derive";
import { publicClient } from "@/lib/chain";
import { runTransaction } from "@/lib/transaction";
import { requireWalletClient, useWallet } from "@/wallet";
import { electionKeys } from "./keys";
import {
  electionGroupQueryOptions,
  electionQueryOptions,
  electionResultsQueryOptions,
  electionsQueryOptions,
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
 * Se a conta ativa pode votar nesta eleição. Usa o cadastro on-chain (`commitmentOf`) e a árvore
 * congelada da eleição: dá a resposta antes de pedir qualquer assinatura.
 * - `not-registered`: a conta nunca se cadastrou;
 * - `registered-after`: cadastrou-se depois da criação da eleição, então não está na lista dela.
 */
export type VoteEligibility =
  | "disconnected"
  | "loading"
  | "error"
  | "not-registered"
  | "registered-after"
  | "eligible";

export function useVoteEligibility(election: ElectionDetails | undefined): VoteEligibility {
  const { status, account } = useWallet();
  const voter = useVoterStatus(account);
  const group = useElectionGroup(election);

  if (status !== "connected") {
    return "disconnected";
  }

  if (voter.isError || group.isError) {
    return "error";
  }

  if (!voter.data) {
    return "loading";
  }

  if (voter.data.commitment === 0n) {
    return "not-registered";
  }

  if (!group.data) {
    return "loading";
  }

  return group.data.indexOf(voter.data.commitment) >= 0 ? "eligible" : "registered-after";
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
        throw new Error("Esta conta não se cadastrou como eleitora.");
      }

      if (group.indexOf(registered) < 0) {
        throw new Error("Esta conta se cadastrou depois da criação desta eleição e não pode votar nela.");
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
            throw new Error("A identidade gerada pela carteira não confere com o cadastro desta conta.");
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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: electionKeys.results(election.address) }),
    onSettled: () => setStep(undefined),
  });

  return { ...mutation, step };
}
