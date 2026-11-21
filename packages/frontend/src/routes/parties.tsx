import { FlagIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PartyList, useParties } from "@/parties";

export function Parties() {
  const parties = useParties();
  const [query, setQuery] = useState("");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Partidos"
        title="Partidos"
        description="Veja os partidos criados pela autoridade e doe a eles, sem precisar de carteira para consultar."
      />

      <SectionCard
        icon={FlagIcon}
        title="Partidos"
        description="Nome, presidente e saldo de cada partido."
        action={
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Atualizar partidos"
            onClick={() => void parties.refetch()}
            disabled={parties.isFetching}
          >
            <RefreshCwIcon className={cn(parties.isFetching && "animate-spin")} />
          </Button>
        }
        toolbar={
          <SearchInput
            placeholder="Buscar por nome, endereço ou presidente…"
            aria-label="Buscar partido"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={!parties.data?.length}
          />
        }
      >
        <PartyList
          parties={parties.data}
          isError={parties.isError}
          isPending={parties.isPending}
          onRetry={() => void parties.refetch()}
          query={query}
        />
      </SectionCard>
    </div>
  );
}
