import { KeyRoundIcon, Loader2Icon } from "lucide-react";
import { useState, type SubmitEvent } from "react";
import type { Address } from "viem";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appChain } from "@/lib/chain";
import { useWallet } from "@/wallet";
import { parseAddress } from "../forms";
import { useAcceptPresidency, useTransferPresidency } from "../hooks";

/** Passar a presidência: o presidente indica o sucessor, que ainda precisa aceitar. */
export function HandoverCard({ party }: { party: Address }) {
  const { isWrongChain } = useWallet();
  const transfer = useTransferPresidency(party);
  const [successor, setSuccessor] = useState("");
  const [error, setError] = useState<string>();
  const reason = isWrongChain ? `Troque a carteira para a ${appChain.name}.` : undefined;

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseAddress(successor);
    setError("error" in parsed ? parsed.error : undefined);

    if ("error" in parsed || reason) {
      return;
    }

    transfer.mutate(parsed.address, { onSuccess: () => setSuccessor("") });
  }

  return (
    <SectionCard
      layout="stacked"
      icon={KeyRoundIcon}
      title="Passar a presidência"
      description="Você continua presidente até o sucessor aceitar."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="handover-successor">Endereço do novo presidente</Label>
          <Input
            id="handover-successor"
            value={successor}
            onChange={(event) => {
              setSuccessor(event.target.value);
              setError(undefined);
            }}
            placeholder="0x…"
            className="font-mono"
            aria-invalid={!!error}
            aria-describedby={error ? "handover-successor-error" : undefined}
          />
          {error && (
            <p id="handover-successor-error" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

        <Button type="submit" className="h-10 w-full" disabled={!!reason || transfer.isPending}>
          {transfer.isPending && <Loader2Icon className="animate-spin" />}
          Passar a presidência
        </Button>

        {reason && <p className="text-center text-xs text-muted-foreground">{reason}</p>}
      </form>
    </SectionCard>
  );
}

/** Aceitar a presidência: só aparece para a conta indicada pelo presidente. */
export function AcceptCard({ party }: { party: Address }) {
  const { isWrongChain } = useWallet();
  const accept = useAcceptPresidency(party);
  const reason = isWrongChain ? `Troque a carteira para a ${appChain.name}.` : undefined;

  return (
    <SectionCard
      layout="stacked"
      icon={KeyRoundIcon}
      title="Você foi indicado presidente"
      description="Aceite para assumir o partido e poder sacar as doações."
    >
      <Button
        className="h-10 w-full"
        disabled={!!reason || accept.isPending}
        onClick={() => accept.mutate()}
      >
        {accept.isPending && <Loader2Icon className="animate-spin" />}
        Aceitar a presidência
      </Button>

      {reason && <p className="mt-3 text-center text-xs text-muted-foreground">{reason}</p>}
    </SectionCard>
  );
}
