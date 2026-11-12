import { appChain } from "@/lib/chain";
import { formatInteger } from "@/lib/format";
import { useBlockNumber } from "@/lib/use-block-number";
import { cn } from "@/lib/utils";

/** Rede do app e último bloco (ponto verde quando o RPC responde). */
export function NetworkStatus({ className }: { className?: string }) {
  const blockNumber = useBlockNumber();
  const state = blockNumber.isError ? "error" : blockNumber.data === undefined ? "loading" : "online";

  return (
    <p className={cn("flex items-baseline gap-2 text-xs text-muted-foreground", className)}>
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 self-center rounded-full",
          state === "online" && "bg-primary",
          state === "loading" && "animate-pulse bg-muted-foreground/50",
          state === "error" && "bg-destructive",
        )}
      />
      <span className="font-medium text-foreground">
        {state === "error" ? "Rede indisponível" : appChain.name}
      </span>
      {blockNumber.data !== undefined && !blockNumber.isError && (
        <span className="tabular-nums">bloco {formatInteger(blockNumber.data)}</span>
      )}
    </p>
  );
}
