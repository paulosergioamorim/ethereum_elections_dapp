import { ArrowRightIcon, Loader2Icon, LockKeyholeIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuthority, useFactoryInfo } from "@/factory";
import { shortAddress } from "@/lib/format";
import { ConnectWalletButton, useWallet } from "@/wallet";

/**
 * Guarda de apresentação da aba da autoridade: só a conta dona da factory vê a página.
 * O `onlyOwner` dos contratos continua sendo o que de fato protege cada ação.
 * Se a conta da autoridade já estiver entre as autorizadas na carteira, oferece trocar para ela.
 */
export function AuthorityGuard({ children }: { children: ReactNode }) {
  const { status, accounts, selectAccount } = useWallet();
  const factory = useFactoryInfo();
  const { owner, isAuthority } = useAuthority();

  if (isAuthority) {
    return <>{children}</>;
  }

  const ownerAccount = owner
    ? accounts.find((account) => account.toLowerCase() === owner.toLowerCase())
    : undefined;

  let message: ReactNode;
  let action: ReactNode = null;

  if (status !== "connected") {
    message = "Conecte a carteira da autoridade eleitoral, a conta dona da factory, para administrar.";
    action = <ConnectWalletButton />;
  } else if (factory.isError) {
    message = "Não foi possível ler a factory para conferir suas permissões. Confira a conexão com a rede.";
    action = (
      <Button variant="outline" onClick={() => void factory.refetch()}>
        Tentar de novo
      </Button>
    );
  } else if (!owner) {
    message = (
      <span className="inline-flex items-center gap-2">
        <Loader2Icon className="size-4 animate-spin" />
        Verificando as permissões da sua carteira…
      </span>
    );
  } else {
    message = (
      <>
        A conta ativa não é a autoridade desta factory. Só a conta{" "}
        <span className="font-mono">{shortAddress(owner)}</span> administra. Cadastro, voto e
        apuração estão nas outras abas.
      </>
    );
    action = ownerAccount && (
      <Button onClick={() => selectAccount(ownerAccount)}>Usar a conta da autoridade</Button>
    );
  }

  return (
    <section
      aria-labelledby="authority-guard-title"
      className="mx-auto my-8 flex max-w-xl flex-col items-center gap-4 rounded-2xl border bg-card p-10 text-center"
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <LockKeyholeIcon className="size-6" />
      </span>
      <h1 id="authority-guard-title" className="text-xl font-semibold">
        Área da autoridade eleitoral
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
      {action}
      <Link to="/" className="text-sm font-medium text-primary hover:underline">
        Ir para as eleições
        <ArrowRightIcon className="ml-1 inline size-4" />
      </Link>
    </section>
  );
}
