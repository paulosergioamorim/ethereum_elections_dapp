import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { parseEventLogs, type Address } from "viem";
import { electionFactoryAbi, factoryAddress } from "@/contracts";
import { electionKeys } from "@/elections/keys";
import { deriveVoterIdentity } from "@/identity/derive";
import { appChain, publicClient } from "@/lib/chain";
import { runTransaction } from "@/lib/transaction";
import { requireWalletClient, useWallet } from "@/wallet";
import {
  factoryInfoQueryOptions,
  factoryKeys,
  fetchVoterGroup,
  voterStatusQueryOptions,
  votersQueryOptions,
  type Voter,
} from "./queries";

export function useFactoryInfo() {
  return useQuery(factoryInfoQueryOptions);
}

export function useVoters() {
  return useQuery(votersQueryOptions);
}

/** Situação da conta na factory (autorizada? registrada?). Sem conta, não consulta. */
export function useVoterStatus(address: Address | undefined) {
  return useQuery(voterStatusQueryOptions(address));
}

/**
 * Se a conta ativa pode administrar (é a dona da factory, na rede certa) e, se não puder, o motivo
 * em uma frase, para mostrar nos botões desabilitados.
 */
export function useAuthority(): {
  owner: Address | undefined;
  isAuthority: boolean;
  canAdminister: boolean;
  reason: string | undefined;
} {
  const { status, account, isWrongChain } = useWallet();
  const owner = useFactoryInfo().data?.owner;
  const isAuthority =
    !!account && !!owner && account.toLowerCase() === owner.toLowerCase();

  let reason: string | undefined;

  if (status !== "connected") {
    reason = "Conecte a carteira dona da factory.";
  } else if (isWrongChain) {
    reason = `Troque a carteira para a ${appChain.name}.`;
  } else if (!owner) {
    reason = "Carregando os dados da factory…";
  } else if (!isAuthority) {
    reason = "A conta ativa não é a dona da factory.";
  }

  return { owner, isAuthority, canAdminister: reason === undefined, reason };
}

/** `addAuthorizedVoters`: libera as carteiras para se registrarem. */
export function useAuthorizeVoters() {
  const { walletClient } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorTitle: "Não foi possível autorizar as carteiras" },
    mutationFn: async (voters: Address[]) => {
      const client = requireWalletClient(walletClient);
      const single = voters.length === 1;

      return runTransaction(
        {
          signing: "Confirme a autorização na carteira.",
          details: single ? `Carteira: ${voters[0]}` : `${voters.length} carteiras`,
          success: single ? "Carteira autorizada." : `${voters.length} carteiras autorizadas.`,
        },
        async () => {
          // a simulação mostra o erro do contrato antes de abrir a carteira, sem gastar gás
          const { request } = await publicClient.simulateContract({
            account: client.account,
            address: factoryAddress,
            abi: electionFactoryAbi,
            functionName: "addAuthorizedVoters",
            args: [voters],
          });

          return client.writeContract(request);
        },
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: factoryKeys.voters() }),
  });
}

/**
 * `removeVoter`: tira a autorização e, se o eleitor já tiver se registrado, a identidade dele do grupo.
 * Os siblings saem da árvore remontada na hora, a partir dos eventos do Semaphore.
 */
export function useRemoveVoter() {
  const { walletClient } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorTitle: "Não foi possível remover o eleitor" },
    mutationFn: async (voter: Voter) => {
      const client = requireWalletClient(walletClient);

      return runTransaction(
        {
          signing: "Confirme a remoção na carteira.",
          details: `Eleitor: ${voter.address}`,
          success: "Eleitor removido.",
        },
        async () => {
          let siblings: bigint[] = [];

          if (voter.commitment !== 0n) {
            const info = await queryClient.query(factoryInfoQueryOptions);
            const group = await fetchVoterGroup(info);
            const index = group.indexOf(voter.commitment);

            if (index < 0) {
              throw new Error("A identidade deste eleitor não foi encontrada no grupo.");
            }

            siblings = group.generateMerkleProof(index).siblings.map(BigInt);
          }

          const { request } = await publicClient.simulateContract({
            account: client.account,
            address: factoryAddress,
            abi: electionFactoryAbi,
            functionName: "removeVoter",
            args: [voter.address, siblings],
          });

          return client.writeContract(request);
        },
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: factoryKeys.voters() }),
  });
}

export type CreateElectionInput = {
  title: string;
  candidates: string[];
  /** Timestamps Unix em segundos. */
  votingStart: bigint;
  votingEnd: bigint;
};

/** `createElection`: cria a eleição com os eleitores registrados até agora. Devolve o endereço dela. */
export function useCreateElection() {
  const { walletClient } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorTitle: "Não foi possível criar a eleição" },
    mutationFn: async (input: CreateElectionInput): Promise<Address | undefined> => {
      const client = requireWalletClient(walletClient);
      const receipt = await runTransaction(
        {
          signing: "Confirme a criação da eleição na carteira.",
          details: input.title,
          success: "Eleição criada.",
        },
        async () => {
          const { request } = await publicClient.simulateContract({
            account: client.account,
            address: factoryAddress,
            abi: electionFactoryAbi,
            functionName: "createElection",
            args: [input],
          });

          return client.writeContract(request);
        },
      );
      const [created] = parseEventLogs({
        abi: electionFactoryAbi,
        eventName: "ElectionCreated",
        logs: receipt.logs,
      });

      return created?.args.election;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: electionKeys.all }),
  });
}

/** Etapa do registro em andamento, para o botão dizer o que a carteira está pedindo. */
export type RegisterStep = "signing" | "sending" | "confirming";

/**
 * `registerIdentityCommitment` pela conta ativa: assina a mensagem fixa, deriva a identidade
 * Semaphore e registra só o compromisso público dela. O segredo nunca sai do navegador.
 */
export function useRegisterIdentity() {
  const { walletClient } = useWallet();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<RegisterStep>();

  const mutation = useMutation({
    meta: { errorTitle: "Não foi possível fazer o registro" },
    mutationFn: async () => {
      const client = requireWalletClient(walletClient);
      const account = client.account.address;

      // confere antes de pedir a assinatura, para não abrir a carteira à toa
      const status = await queryClient.query(voterStatusQueryOptions(account));

      if (status.commitment !== 0n) {
        throw new Error("Esta conta já está registrada.");
      }

      if (!status.isAuthorized) {
        throw new Error("Esta conta não está autorizada pela autoridade.");
      }

      let commitment = 0n;

      await runTransaction(
        {
          signing: "Assine a mensagem e confirme o registro na carteira.",
          details: `Conta: ${account}`,
          success: "Identidade registrada.",
        },
        async () => {
          setStep("signing");
          const identity = await deriveVoterIdentity(client);
          commitment = identity.commitment;

          setStep("sending");
          const { request } = await publicClient.simulateContract({
            account: client.account,
            address: factoryAddress,
            abi: electionFactoryAbi,
            functionName: "registerIdentityCommitment",
            args: [commitment],
          });
          const hash = await client.writeContract(request);

          setStep("confirming");

          return hash;
        },
      );

      return { account, commitment };
    },
    onSuccess: ({ account }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: factoryKeys.voter(account) }),
        queryClient.invalidateQueries({ queryKey: factoryKeys.voters() }),
      ]),
    onSettled: () => setStep(undefined),
  });

  return { ...mutation, step };
}
