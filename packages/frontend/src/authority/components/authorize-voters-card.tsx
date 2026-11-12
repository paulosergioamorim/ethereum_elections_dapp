import { Loader2Icon, UserPlusIcon } from "lucide-react";
import { useState, type SubmitEvent } from "react";
import type { Address } from "viem";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthority, useAuthorizeVoters } from "@/factory";
import { useWallet } from "@/wallet";
import { parseVoterAddresses } from "../parse-voter-addresses";

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** Passo 1 da autoridade: liberar as carteiras que poderão se registrar como eleitoras. */
export function AuthorizeVotersCard({ authorized }: { authorized: readonly Address[] | undefined }) {
  const { canAdminister, reason } = useAuthority();
  const { accounts } = useWallet();
  const authorize = useAuthorizeVoters();
  const [text, setText] = useState("");

  const parsed = parseVoterAddresses(text, authorized ?? []);
  // as contas conectadas na carteira (inclusive a da autoridade), para montar a turma de teste
  function addConnectedAccounts() {
    setText((current) => [current.trim(), ...accounts].filter(Boolean).join("\n"));
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (parsed.toAuthorize.length === 0) {
      return;
    }

    authorize.mutate(parsed.toAuthorize, { onSuccess: () => setText("") });
  }

  const hasInput = text.trim().length > 0;

  return (
    <SectionCard
      layout="stacked"
      icon={UserPlusIcon}
      title="Autorizar carteiras"
      description="Carteiras autorizadas podem se registrar como eleitoras."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="voter-addresses">Endereços</Label>

            {accounts.length > 0 && (
              <Button type="button" variant="link" size="xs" onClick={addConnectedAccounts}>
                Usar minhas contas conectadas
              </Button>
            )}
          </div>

          <Textarea
            id="voter-addresses"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={"0x…\n0x…"}
            rows={4}
            spellCheck={false}
            className="font-mono text-xs"
          />

          <p className="text-xs text-muted-foreground">
            Um por linha, ou separados por vírgula ou espaço.
          </p>
        </div>

        {hasInput && (
          <div aria-live="polite" className="space-y-1 text-xs">
            <p>
              {plural(parsed.toAuthorize.length, "nova", "novas")}
              {parsed.alreadyAuthorized.length > 0 &&
                ` · ${plural(parsed.alreadyAuthorized.length, "já autorizada", "já autorizadas")}`}
              {parsed.invalid.length > 0 &&
                ` · ${plural(parsed.invalid.length, "inválida", "inválidas")}`}
            </p>

            {parsed.invalid.length > 0 && (
              <p className="break-all text-destructive">Inválidos: {parsed.invalid.join(", ")}</p>
            )}
          </div>
        )}

        <Button
          type="submit"
          className="h-11 w-full text-base"
          disabled={!canAdminister || parsed.toAuthorize.length === 0 || authorize.isPending}
        >
          {authorize.isPending && <Loader2Icon className="animate-spin" />}
          {parsed.toAuthorize.length > 1
            ? `Autorizar ${parsed.toAuthorize.length} carteiras`
            : "Autorizar carteira"}
        </Button>

        {reason && <p className="text-center text-xs text-muted-foreground">{reason}</p>}
      </form>
    </SectionCard>
  );
}
