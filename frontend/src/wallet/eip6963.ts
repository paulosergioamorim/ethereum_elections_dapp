import { useSyncExternalStore } from "react";
import type { EIP1193Provider } from "viem";

/**
 * EIP-6963: cada carteira instalada (MetaMask, Rabby, Coinbase...) se anuncia por um evento,
 * em vez de todas disputarem o `window.ethereum`.
 */
export type EIP6963ProviderInfo = {
  /** Muda a cada carregamento da página: não persistir. */
  uuid: string;
  name: string;
  /** Data URI da imagem. Renderizar só em `<img src>`, nunca como HTML. */
  icon: string;
  /** Identificador estável da carteira (ex.: `io.metamask`): é o que se persiste. */
  rdns: string;
};

export type EIP6963ProviderDetail = {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
};

declare global {
  interface WindowEventMap {
    "eip6963:announceProvider": CustomEvent<EIP6963ProviderDetail>;
  }
}

let wallets: readonly EIP6963ProviderDetail[] = [];
const listeners = new Set<() => void>();

function onAnnounce({ detail }: CustomEvent<EIP6963ProviderDetail>) {
  if (wallets.some((wallet) => wallet.info.uuid === detail.info.uuid)) {
    return;
  }

  wallets = [...wallets, detail];
  listeners.forEach((listener) => listener());
}

// A descoberta começa no carregamento do módulo, antes do primeiro render. As carteiras respondem
// ao `requestProvider` de forma síncrona, então quem já conectou antes não vê o botão "Conectar" piscar.
if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", onAnnounce);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function getSnapshot(): readonly EIP6963ProviderDetail[] {
  return wallets;
}

/** Carteiras instaladas no navegador, atualizadas conforme se anunciam. */
export function useWalletProviders(): readonly EIP6963ProviderDetail[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}
