import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseEventLogs, type Address } from "viem";
import { electionFactoryAbi, factoryAddress } from "@/contracts";
import { publicClient } from "@/lib/chain";
import { runTransaction } from "@/lib/transaction";
import { requireWalletClient, useWallet } from "@/wallet";
import { partyKeys } from "./keys";
import { partiesQueryOptions } from "./queries";

/** Partidos criados pela factory (leitura pública, sem carteira). */
export function useParties() {
  return useQuery(partiesQueryOptions);
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
