import { RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PartyList, useParties } from "@/parties";

export function Parties() {
  const parties = useParties();
  const [query, setQuery] = useState("");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Partidos"
        description="Veja os partidos criados pela autoridade e doe a eles, sem precisar de carteira para consultar."
      />

      <div className="flex items-center gap-3">
        <div className="flex-1 sm:max-w-md">
          <SearchInput
            placeholder="Buscar por nome, endereço ou presidente…"
            aria-label="Buscar partido"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={!parties.data?.length}
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          className="size-10"
          aria-label="Atualizar partidos"
          onClick={() => void parties.refetch()}
          disabled={parties.isFetching}
        >
          <RefreshCwIcon className={cn(parties.isFetching && "animate-spin")} />
        </Button>
      </div>

      <PartyList
        layout="grid"
        parties={parties.data}
        isError={parties.isError}
        isPending={parties.isPending}
        onRetry={() => void parties.refetch()}
        query={query}
      />
    </div>
  );
}
