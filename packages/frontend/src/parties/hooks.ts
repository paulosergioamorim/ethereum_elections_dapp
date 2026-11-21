import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseEventLogs, type Address } from "viem";
import { electionFactoryAbi, factoryAddress, partyAbi } from "@/contracts";
import { publicClient } from "@/lib/chain";
import { formatEth, shortAddress } from "@/lib/format";
import { runTransaction } from "@/lib/transaction";
import { requireWalletClient, useWallet } from "@/wallet";
import { partyKeys } from "./keys";
import {
  candidateQueryOptions,
  donatedQueryOptions,
  partiesQueryOptions,
  partyCandidatesQueryOptions,
  partyQueryOptions,
} from "./queries";

/** Partidos criados pela factory (leitura pública, sem carteira). */
export function useParties() {
  return useQuery(partiesQueryOptions);
}

/** Dados de um partido; sem endereço, não consulta. */
export function useParty(address: Address | undefined) {
  return useQuery(partyQueryOptions(address));
}

/** Quanto a conta ativa já doou ao partido; sem conta, não consulta. */
export function useDonated(address: Address | undefined, account: Address | undefined) {
  return useQuery(donatedQueryOptions(address, account));
}

/** `donate`: envia ETH ao partido ou ao candidato (as duas ABIs têm o mesmo `donate`). */
export function useDonate(target: Address) {
  const { walletClient } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorTitle: "Não foi possível doar" },
    mutationFn: async (value: bigint) => {
      const client = requireWalletClient(walletClient);

      return runTransaction(
        {
          signing: "Confirme a doação na carteira.",
          details: `${formatEth(value)} para ${shortAddress(target)}`,
          success: "Doação enviada.",
        },
        async () => {
          const { request } = await publicClient.simulateContract({
            account: client.account,
            address: target,
            abi: partyAbi,
            functionName: "donate",
            value,
          });

          return client.writeContract(request);
        },
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partyKeys.all }),
  });
}

/** `withdraw`: o dono saca `amount` (wei) do partido ou do candidato para `to`. */
export function useWithdraw(target: Address) {
  const { walletClient } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorTitle: "Não foi possível sacar" },
    mutationFn: async ({ to, amount }: { to: Address; amount: bigint }) => {
      const client = requireWalletClient(walletClient);

      return runTransaction(
        {
          signing: "Confirme o saque na carteira.",
          details: `${formatEth(amount)} para ${shortAddress(to)}`,
          success: "Saque enviado.",
        },
        async () => {
          const { request } = await publicClient.simulateContract({
            account: client.account,
            address: target,
            abi: partyAbi,
            functionName: "withdraw",
            args: [to, amount],
          });

          return client.writeContract(request);
        },
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partyKeys.all }),
  });
}

/** Chamada do partido que só muda quem preside (`transferOwnership` e `acceptOwnership`). */
function usePresidencyCall<Input>(
  party: Address,
  notice: (input: Input) => { signing: string; details?: string; success: string },
  call: (input: Input) => { functionName: "transferOwnership"; args: readonly [Address] } | { functionName: "acceptOwnership"; args?: undefined },
  errorTitle: string,
) {
  const { walletClient } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorTitle },
    mutationFn: async (input: Input) => {
      const client = requireWalletClient(walletClient);

      return runTransaction(notice(input), async () => {
        const { request } = await publicClient.simulateContract({
          account: client.account,
          address: party,
          abi: partyAbi,
          ...call(input),
        } as never);

        return client.writeContract(request as never);
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partyKeys.all }),
  });
}

/** `transferOwnership`: o presidente indica o sucessor, que só assume ao aceitar. */
export function useTransferPresidency(party: Address) {
  return usePresidencyCall<Address>(
    party,
    (successor) => ({
      signing: "Confirme a indicação na carteira.",
      details: `Sucessor: ${successor}`,
      success: "Sucessor indicado.",
    }),
    (successor) => ({ functionName: "transferOwnership", args: [successor] }),
    "Não foi possível passar a presidência",
  );
}

/** `acceptOwnership`: o sucessor indicado assume a presidência. */
export function useAcceptPresidency(party: Address) {
  return usePresidencyCall<void>(
    party,
    () => ({ signing: "Confirme a aceitação na carteira.", success: "Você é o novo presidente." }),
    () => ({ functionName: "acceptOwnership" }),
    "Não foi possível aceitar a presidência",
  );
}

export type CreatePartyInput = {
  president: Address;
  name: string;
};

/** `createParty`: cria o partido com o presidente indicado. Devolve o endereço dele. */
export function useCreateParty() {
  const { walletClient } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorTitle: "Não foi possível criar o partido" },
    mutationFn: async ({ president, name }: CreatePartyInput): Promise<Address | undefined> => {
      const client = requireWalletClient(walletClient);
      const receipt = await runTransaction(
        {
          signing: "Confirme a criação do partido na carteira.",
          details: name,
          success: "Partido criado.",
        },
        async () => {
          // a simulação mostra o erro do contrato antes de abrir a carteira, sem gastar gás
          const { request } = await publicClient.simulateContract({
            account: client.account,
            address: factoryAddress,
            abi: electionFactoryAbi,
            functionName: "createParty",
            args: [president, name],
          });

          return client.writeContract(request);
        },
      );
      const [created] = parseEventLogs({
        abi: electionFactoryAbi,
        eventName: "PartyCreated",
        logs: receipt.logs,
      });

      return created?.args.party;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partyKeys.all }),
  });
}

/** Dados de um candidato; sem endereço, não consulta. */
export function useCandidate(address: Address | undefined) {
  return useQuery(candidateQueryOptions(address));
}

/** Candidatos de um partido (leitura pública, sem carteira). */
export function usePartyCandidates(party: Address) {
  return useQuery(partyCandidatesQueryOptions(party));
}

export type CreateCandidateInput = {
  /** A carteira do candidato. */
  candidate: Address;
  name: string;
};

/** `createCandidate`: o presidente cria um candidato do partido. */
export function useCreateCandidate(party: Address) {
  const { walletClient } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorTitle: "Não foi possível criar o candidato" },
    mutationFn: async ({ candidate, name }: CreateCandidateInput) => {
      const client = requireWalletClient(walletClient);

      return runTransaction(
        {
          signing: "Confirme a criação do candidato na carteira.",
          details: name,
          success: "Candidato criado.",
        },
        async () => {
          // a simulação mostra o erro do contrato antes de abrir a carteira, sem gastar gás
          const { request } = await publicClient.simulateContract({
            account: client.account,
            address: party,
            abi: partyAbi,
            functionName: "createCandidate",
            args: [candidate, name],
          });

          return client.writeContract(request);
        },
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partyKeys.all }),
  });
}
