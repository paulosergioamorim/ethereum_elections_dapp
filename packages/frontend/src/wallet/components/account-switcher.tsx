import {
  ChevronDownIcon,
  CopyIcon,
  ExternalLinkIcon,
  LogOutIcon,
  UserPlusIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Address } from "viem";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { explorerAddressUrl } from "@/lib/chain";
import { formatEth, shortAddress } from "@/lib/format";
import { useBalance, useConnectMoreAccounts, useDisconnect, useWallet } from "../hooks";
import { AddressAvatar } from "./address-avatar";

function AccountBalance({ address }: { address: Address }) {
  const balance = useBalance(address);

  if (balance.data === undefined) {
    return null;
  }

  return <span className="ml-auto text-xs text-muted-foreground">{formatEth(balance.data)}</span>;
}

/**
 * Conta ativa no cabeçalho e menu para trocar entre as contas já autorizadas.
 * Trocar aqui não abre a carteira: o dApp só passa a assinar com a outra conta.
 */
export function AccountSwitcher() {
  const { account, accounts, wallet, selectAccount } = useWallet();
  const connectMore = useConnectMoreAccounts();
  const disconnect = useDisconnect();

  if (!account) {
    return null;
  }

  const explorerUrl = explorerAddressUrl(account);

  async function copyAddress(address: Address) {
    await navigator.clipboard.writeText(address);
    toast.success("Endereço copiado");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label={`Conta ativa: ${account}`}>
          <AddressAvatar address={account} className="size-4" />
          <span className="font-mono">{shortAddress(account)}</span>
          <ChevronDownIcon className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          {wallet && <img src={wallet.info.icon} alt="" className="size-4 rounded-sm" />}
          Contas autorizadas
        </DropdownMenuLabel>

        <DropdownMenuRadioGroup
          value={account}
          onValueChange={(value) => selectAccount(value as Address)}
        >
          {accounts.map((address) => (
            <DropdownMenuRadioItem key={address} value={address} className="gap-2">
              <AddressAvatar address={address} className="size-4" />
              <span className="font-mono text-xs">{shortAddress(address)}</span>
              <AccountBalance address={address} />
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={connectMore.isPending}
            onSelect={() =>
              connectMore.mutate(undefined, {
                onSuccess: ({ accounts: authorized }) =>
                  toast.success(`${authorized.length} conta(s) autorizada(s)`),
              })
            }
          >
            <UserPlusIcon />
            Autorizar outras contas…
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => void copyAddress(account)}>
            <CopyIcon />
            Copiar endereço
          </DropdownMenuItem>

          {explorerUrl && (
            <DropdownMenuItem asChild>
              <a href={explorerUrl} target="_blank" rel="noreferrer">
                <ExternalLinkIcon />
                Ver no explorador
              </a>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onSelect={() => disconnect.mutate()}>
          <LogOutIcon />
          Desconectar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
