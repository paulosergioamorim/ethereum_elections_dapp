import {
  CopyIcon,
  IdCardIcon,
  Loader2Icon,
  RefreshCwIcon,
  TriangleAlertIcon,
  UserCheckIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { numberToHex } from "viem";
import { EmptyState } from "@/components/empty-state";
import { InfoNote } from "@/components/info-note";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useVoterStatus } from "@/factory";
import { shortAddress, shortHex } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AddressAvatar, useWallet } from "@/wallet";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-2 text-sm">{children}</dd>
    </div>
  );
}

const positive = "border-primary bg-transparent text-primary";

/** Situação da conta ativa na factory. Acompanha a troca de conta pelo menu da carteira. */
export function VoterStatusCard() {
  const { status, account } = useWallet();
  const voter = useVoterStatus(account);

  let body;

  if (status !== "connected" || !account) {
    body = (
      <EmptyState
        icon={IdCardIcon}
        title="A situação da conta aparece por aqui."
        description="Conecte sua carteira para consultar."
      />
    );
  } else if (voter.isPending) {
    body = (
      <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Consultando a factory…
      </p>
    );
  } else if (voter.isError) {
    body = (
      <EmptyState
        icon={TriangleAlertIcon}
        title="Não foi possível consultar a conta."
        description="Confira a conexão com a rede e tente atualizar."
      />
    );
  } else {
    const { isAuthorized, commitment } = voter.data;
    const registered = commitment !== 0n;

    body = (
      <>
        <dl className="-mt-4 divide-y">
          <Row label="Conta">
            <AddressAvatar address={account} className="size-4" />
            <span className="font-mono text-xs" title={account}>
              {shortAddress(account)}
            </span>
          </Row>

          <Row label="Autorização">
            {isAuthorized ? (
              <Badge className={positive}>Autorizada</Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Não autorizada
              </Badge>
            )}
          </Row>

          <Row label="Registro">
            {registered ? (
              <Badge className={positive}>Registrado</Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Pendente
              </Badge>
            )}
          </Row>

          {registered && (
            <Row label="Identidade">
              <span className="font-mono text-xs" title={numberToHex(commitment)}>
                {shortHex(numberToHex(commitment))}
              </span>
            </Row>
          )}
        </dl>

        {!isAuthorized && !registered && (
          <InfoNote className="mt-2" title="Peça a autorização desta carteira.">
            A autoridade precisa autorizar o endereço antes do registro.{" "}
            <button
              type="button"
              className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4"
              onClick={() =>
                void navigator.clipboard
                  .writeText(account)
                  .then(() => toast.success("Endereço copiado"))
              }
            >
              <CopyIcon className="size-3" />
              Copiar endereço
            </button>
          </InfoNote>
        )}

        {registered && (
          <InfoNote className="mt-2" title="Pronto para votar.">
            Você vota nas eleições criadas depois do registro. Eleições anteriores congelaram a lista
            de eleitores sem você.
          </InfoNote>
        )}
      </>
    );
  }

  return (
    <SectionCard
      icon={UserCheckIcon}
      title="Situação da conta"
      description="Autorização e registro da conta ativa."
      action={
        account && (
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Atualizar situação"
            onClick={() => void voter.refetch()}
            disabled={voter.isFetching}
          >
            <RefreshCwIcon className={cn(voter.isFetching && "animate-spin")} />
          </Button>
        )
      }
    >
      {body}
    </SectionCard>
  );
}
