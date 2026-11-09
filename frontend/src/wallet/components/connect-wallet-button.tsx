import { ArrowRightIcon, Loader2Icon, WalletIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConnect } from "../hooks";
import { useWalletProviders, type EIP6963ProviderDetail } from "../eip6963";

type ConnectWalletButtonProps = Pick<ComponentProps<typeof Button>, "variant" | "size" | "className"> & {
  /** Seta no fim, para chamadas dentro de avisos ("Conectar carteira →"). */
  arrow?: boolean;
};

function WalletLogo({ wallet }: { wallet: EIP6963ProviderDetail }) {
  // o ícone é um data URI vindo da extensão: só em <img>, nunca como HTML
  return <img src={wallet.info.icon} alt="" className="size-4 rounded-sm" />;
}

/**
 * - nenhuma carteira instalada: link para instalar a MetaMask;
 * - uma carteira: conecta direto;
 * - várias: menu para escolher.
 */
export function ConnectWalletButton({ arrow = false, ...buttonProps }: ConnectWalletButtonProps) {
  const wallets = useWalletProviders();
  const connect = useConnect();

  if (wallets.length === 0) {
    return (
      <Button asChild variant="outline" {...buttonProps}>
        <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">
          <WalletIcon />
          Instalar carteira
        </a>
      </Button>
    );
  }

  const content = (
    <>
      {connect.isPending ? <Loader2Icon className="animate-spin" /> : <WalletIcon />}
      {connect.isPending ? "Conectando…" : "Conectar carteira"}
      {arrow && !connect.isPending && <ArrowRightIcon />}
    </>
  );

  if (wallets.length === 1) {
    return (
      <Button {...buttonProps} onClick={() => connect.mutate(wallets[0])} disabled={connect.isPending}>
        {content}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button {...buttonProps} disabled={connect.isPending}>
          {content}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Escolha a carteira</DropdownMenuLabel>

        {wallets.map((wallet) => (
          <DropdownMenuItem key={wallet.info.uuid} onSelect={() => connect.mutate(wallet)}>
            <WalletLogo wallet={wallet} />
            {wallet.info.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
