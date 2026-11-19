import { appChain } from "@/lib/chain";
import { formatInteger } from "@/lib/format";
import { useBlockNumber } from "@/lib/use-block-number";
import { cn } from "@/lib/utils";

/** Selo ao lado da marca: rede do app e último bloco (verde quando o RPC responde). */
export function NetworkStatus() {
  const blockNumber = useBlockNumber();
  const state = blockNumber.isError ? "error" : blockNumber.data === undefined ? "loading" : "online";

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground">
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          state === "online" && "bg-primary",
          state === "loading" && "animate-pulse bg-muted-foreground/50",
          state === "error" && "bg-destructive",
        )}
      />
      {state === "error" ? "Rede indisponível" : appChain.name}
      {blockNumber.data !== undefined && !blockNumber.isError && (
        <span className="hidden sm:inline">· bloco {formatInteger(blockNumber.data)}</span>
      )}
    </span>
  );
}
