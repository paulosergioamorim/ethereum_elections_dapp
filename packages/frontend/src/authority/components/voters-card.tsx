import {
  Loader2Icon,
  RefreshCwIcon,
  TriangleAlertIcon,
  UserMinusIcon,
  UsersIcon,
} from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { SectionCard } from "@/components/section-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthority, useRemoveVoter, useVoters, type Voter } from "@/factory";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AddressAvatar } from "@/wallet";

function RemoveVoterButton({ voter }: { voter: Voter }) {
  const removeVoter = useRemoveVoter();
  const registered = voter.commitment !== 0n;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remover ${voter.address}`}
          disabled={removeVoter.isPending}
        >
          {removeVoter.isPending ? <Loader2Icon className="animate-spin" /> : <UserMinusIcon />}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover {shortAddress(voter.address)}?</AlertDialogTitle>
          <AlertDialogDescription>
            A carteira perde a autorização
            {registered && " e a identidade dela sai do grupo de eleitores"}. Eleições já criadas
            continuam aceitando o voto dela, porque cada eleição congela a lista de eleitores no
            momento da criação.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => removeVoter.mutate(voter)}>
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Carteiras autorizadas e a situação do registro de cada uma (leitura pública). */
export function VotersCard() {
  const voters = useVoters();
  const { canAdminister } = useAuthority();
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const visible = voters.data?.filter((voter) => voter.address.toLowerCase().includes(query));

  let body;

  if (voters.isPending) {
    body = (
      <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Lendo os eleitores na rede…
      </p>
    );
  } else if (voters.isError) {
    body = (
      <EmptyState
        icon={TriangleAlertIcon}
        title="Não foi possível carregar os eleitores."
        description="Confira a conexão com a rede e tente atualizar."
      />
    );
  } else if (voters.data.length === 0) {
    body = (
      <EmptyState
        icon={UsersIcon}
        title="Os eleitores aparecem por aqui."
        description="Autorize carteiras para que elas possam se registrar."
      />
    );
  } else if (visible?.length === 0) {
    body = (
      <p className="py-6 text-sm text-muted-foreground">
        Nenhuma carteira encontrada.
      </p>
    );
  } else {
    body = (
      <ul className="-mt-4 divide-y">
        {visible?.map((voter) => (
          <li key={voter.address} className="flex items-center gap-3 py-3">
            <AddressAvatar address={voter.address} />

            <span className="min-w-0 flex-1 truncate font-mono text-xs" title={voter.address}>
              {shortAddress(voter.address)}
            </span>

            {voter.commitment !== 0n ? (
              <Badge className="border-primary bg-transparent text-primary">Registrado</Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Aguardando registro
              </Badge>
            )}

            {canAdminister && <RemoveVoterButton voter={voter} />}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <SectionCard
      icon={UsersIcon}
      title="Eleitores"
      description="Carteiras autorizadas e a situação do registro de cada uma."
      action={
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Atualizar eleitores"
          onClick={() => void voters.refetch()}
          disabled={voters.isFetching}
        >
          <RefreshCwIcon className={cn(voters.isFetching && "animate-spin")} />
        </Button>
      }
      toolbar={
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar carteira…"
          aria-label="Buscar carteira"
          disabled={!voters.data?.length}
        />
      }
    >
      {body}
    </SectionCard>
  );
}
