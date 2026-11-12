import { Loader2Icon, LockOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appChain } from "@/lib/chain";
import { ConnectWalletButton, SwitchChainButton, useWallet } from "@/wallet";
import { pendingReveals, provisionalTally } from "../ballots";
import { useOpenedBallots, useRevealBallots, type RevealProgress } from "../hooks";
import type { ElectionDetails } from "../queries";
import { ResultRow } from "./result-row";

function progressLabel({ batch, batches, step }: RevealProgress): string {
  const lot = batches > 1 ? ` o lote ${batch} de ${batches}` : "";

  return step === "sending" ? `Confirme${lot} na carteira…` : `Publicando${lot}…`;
}

/**
 * Apuração por qualquer pessoa: abre no navegador as cédulas ainda fechadas no contrato, mostra a
 * prévia do resultado e publica as abertas com `revealBatch`.
 */
export function RevealPanel({ election }: { election: ElectionDetails }) {
  const { status, isWrongChain } = useWallet();
  const { ballots, opened } = useOpenedBallots(election);
  const reveal = useRevealBallots(election);

  if (!ballots.data || !opened.data) {
    const failed = ballots.isError || opened.isError;

    return (
      <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        {!failed && <Loader2Icon className="size-4 animate-spin" />}
        {failed
          ? "Não foi possível abrir as cédulas. Confira a conexão e atualize."
          : "Abrindo as cédulas com o drand…"}
      </p>
    );
  }

  const preview = provisionalTally(election.candidates.length, ballots.data, opened.data);
  const pending = pendingReveals(ballots.data, opened.data).length;

  let action;

  if (pending === 0) {
    action = null;
  } else if (status !== "connected") {
    action = <ConnectWalletButton className="h-11 w-full" />;
  } else if (isWrongChain) {
    action = <SwitchChainButton />;
  } else {
    action = (
      <Button className="h-11 w-full text-base" onClick={() => reveal.mutate()} disabled={reveal.isPending}>
        {reveal.isPending ? <Loader2Icon className="animate-spin" /> : <LockOpenIcon />}
        {reveal.progress ? progressLabel(reveal.progress) : `Apurar ${pending} cédula(s)`}
      </Button>
    );
  }

  const notes = [
    preview.invalid > 0n &&
      `${preview.invalid} cédula(s) inválida(s): o conteúdo cifrado não confere com o registrado e fica fora da contagem.`,
    preview.tooEarly > 0n &&
      `${preview.tooEarly} cédula(s) aguardando a rodada do drand; a página tenta de novo sozinha.`,
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="font-semibold">Prévia com as cédulas abertas aqui</p>
        <p className="text-xs text-muted-foreground">
          {pending > 0
            ? `${pending} cédula(s) aberta(s) neste navegador ainda não foram publicadas. Qualquer pessoa pode publicá-las; o contrato confere cada uma contra o compromisso registrado.`
            : "Tudo o que dava para abrir já foi publicado."}
        </p>
      </div>

      {pending > 0 && (
        <ul className="space-y-5" aria-label="Prévia da apuração">
          {election.candidates.map((candidate, index) => (
            <ResultRow
              key={index}
              label={candidate}
              votes={preview.tally[index] ?? 0n}
              base={preview.counted}
            />
          ))}
          <ResultRow label="Nulos" votes={preview.nullVotes} base={preview.counted} />
        </ul>
      )}

      {notes.map((note) => (
        <p key={String(note)} className="text-xs text-muted-foreground">
          {note}
        </p>
      ))}

      {action}

      {pending > 0 && status === "connected" && !isWrongChain && (
        <p className="text-xs text-muted-foreground">
          Qualquer conta pode apurar; a transação paga o gás na {appChain.name}.
        </p>
      )}
    </div>
  );
}
