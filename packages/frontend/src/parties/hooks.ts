import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseEventLogs, type Address } from "viem";
import { electionFactoryAbi, factoryAddress, partyAbi } from "@/contracts";
import { publicClient } from "@/lib/chain";
import { formatEth, shortAddress } from "@/lib/format";
import { runTransaction } from "@/lib/transaction";
import { requireWalletClient, useWallet } from "@/wallet";
import { partyKeys } from "./keys";
import { donatedQueryOptions, partiesQueryOptions, partyQueryOptions } from "./queries";

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

/** `donate`: envia ETH ao partido. */
export function useDonate(party: Address) {
  const { walletClient } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorTitle: "Não foi possível doar" },
    mutationFn: async (value: bigint) => {
      const client = requireWalletClient(walletClient);

      return runTransaction(
        {
          signing: "Confirme a doação na carteira.",
          details: `${formatEth(value)} para ${shortAddress(party)}`,
          success: "Doação enviada.",
        },
        async () => {
          const { request } = await publicClient.simulateContract({
            account: client.account,
            address: party,
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

/** `withdraw`: o presidente saca `amount` (wei) do partido para `to`. */
export function useWithdraw(party: Address) {
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
            address: party,
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
