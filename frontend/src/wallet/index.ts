// API pública da carteira: o resto do app importa daqui.
export { useWalletProviders, type EIP6963ProviderDetail } from "./eip6963";
export {
  useBalance,
  useConnect,
  useConnectMoreAccounts,
  useDisconnect,
  useSwitchChain,
  useWallet,
  type Wallet,
} from "./hooks";
export { requireWalletClient } from "./require-wallet-client";
export { WalletProvider } from "./wallet-provider";
export type { ConnectedWalletClient, WalletStatus } from "./wallet-context";
export { AccountSwitcher } from "./components/account-switcher";
export { AddressAvatar } from "./components/address-avatar";
export { ConnectWalletButton } from "./components/connect-wallet-button";
export { ConnectWalletNotice } from "./components/connect-wallet-notice";
export { SwitchChainButton } from "./components/switch-chain-button";
export { WalletMenu } from "./components/wallet-menu";
