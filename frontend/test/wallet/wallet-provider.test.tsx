import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { appChain } from "@/lib/chain";
import { useConnect, useConnectMoreAccounts, useDisconnect, useSwitchChain, useWallet } from "@/wallet";
import { alice, bob, carol, createMockWallet, type MockWalletOptions } from "../helpers/mock-wallet";
import { createWrapper } from "../helpers/render";

function renderWallet() {
  return renderHook(
    () => ({
      wallet: useWallet(),
      connect: useConnect(),
      connectMore: useConnectMoreAccounts(),
      disconnect: useDisconnect(),
      switchChain: useSwitchChain(),
    }),
    { wrapper: createWrapper() },
  );
}

async function renderConnected(options: MockWalletOptions = { accounts: [alice, bob] }) {
  const mock = createMockWallet(options);
  const view = renderWallet();

  await act(() => view.result.current.connect.mutateAsync(mock.detail));
  await waitFor(() => expect(view.result.current.wallet.status).toBe("connected"));

  return { mock, ...view };
}

function count(calls: string[], method: string) {
  return calls.filter((call) => call === method).length;
}

describe("WalletProvider", () => {
  it("should start disconnected", () => {
    const { result } = renderWallet();

    expect(result.current.wallet.status).toBe("disconnected");
    expect(result.current.wallet.account).toBeUndefined();
  });

  it("should connect and use the first authorized account", async () => {
    const { result } = await renderConnected();

    // a carteira devolve minúsculas; o dApp guarda com checksum
    expect(result.current.wallet.accounts).toEqual([alice, bob]);
    expect(result.current.wallet.account).toBe(alice);
    expect(result.current.wallet.walletClient?.account.address).toBe(alice);
  });

  it("should switch the active account without asking the wallet", async () => {
    const { result, mock } = await renderConnected();
    const callsBefore = mock.calls.length;

    act(() => result.current.wallet.selectAccount(bob));

    expect(result.current.wallet.account).toBe(bob);
    expect(result.current.wallet.walletClient?.account.address).toBe(bob);
    expect(mock.calls).toHaveLength(callsBefore);
  });

  it("should refuse an account the wallet did not authorize", async () => {
    const { result } = await renderConnected();

    expect(() => result.current.wallet.selectAccount(carol)).toThrow();
  });

  it("should follow the account selected inside the wallet", async () => {
    const { result, mock } = await renderConnected();

    // a carteira lista primeiro a conta selecionada nela
    act(() => mock.setAccounts([bob, alice]));

    expect(result.current.wallet.account).toBe(bob);
  });

  it("should fall back to the first account when the active one is no longer authorized", async () => {
    const { result, mock } = await renderConnected();
    act(() => result.current.wallet.selectAccount(bob));

    act(() => mock.setAccounts([alice]));

    // o evento grava no cache do React Query, que notifica os componentes de forma assíncrona
    await waitFor(() => expect(result.current.wallet.account).toBe(alice));
  });

  it("should add the accounts authorized afterwards", async () => {
    const { result, mock } = await renderConnected({ accounts: [alice], moreAccounts: [carol] });

    await act(() => result.current.connectMore.mutateAsync());

    await waitFor(() => expect(result.current.wallet.accounts).toEqual([alice, carol]));
    expect(count(mock.calls, "wallet_requestPermissions")).toBe(1);
  });

  it("should reconnect silently after a reload, keeping the chosen account", async () => {
    const { result, mock, unmount } = await renderConnected();
    act(() => result.current.wallet.selectAccount(bob));
    unmount();

    const reloaded = renderWallet();

    await waitFor(() => expect(reloaded.result.current.wallet.status).toBe("connected"));
    expect(reloaded.result.current.wallet.account).toBe(bob);
    expect(count(mock.calls, "eth_requestAccounts")).toBe(1);
  });

  it("should flag the wrong chain and switch to the app chain", async () => {
    const { result } = await renderConnected({ accounts: [alice], chainId: 1 });
    await waitFor(() => expect(result.current.wallet.isWrongChain).toBe(true));

    await act(() => result.current.switchChain.mutateAsync());

    await waitFor(() => expect(result.current.wallet.chainId).toBe(appChain.id));
    expect(result.current.wallet.isWrongChain).toBe(false);
  });

  it("should disconnect and forget the wallet", async () => {
    const { result } = await renderConnected();

    await act(() => result.current.disconnect.mutateAsync());

    expect(result.current.wallet.status).toBe("disconnected");
    expect(window.localStorage.getItem("elections:wallet")).toBeNull();
  });
});
