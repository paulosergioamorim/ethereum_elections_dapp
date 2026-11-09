import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { shortAddress } from "@/lib/format";
import { WalletMenu } from "@/wallet";
import { alice, bob, carol, createMockWallet, type MockWalletOptions } from "../helpers/mock-wallet";
import { createWrapper } from "../helpers/render";

/** Usuário voltando: a carteira já autorizou o site e o dApp lembra qual carteira usar. */
async function renderConnected(options: MockWalletOptions) {
  const mock = createMockWallet({ ...options, authorized: true });
  window.localStorage.setItem("elections:wallet", JSON.stringify(mock.detail.info.rdns));
  render(<WalletMenu />, { wrapper: createWrapper() });

  return { mock, user: userEvent.setup() };
}

function activeAccountButton() {
  return screen.findByRole("button", { name: /conta ativa/i });
}

describe("AccountSwitcher", () => {
  it("should show the active account", async () => {
    await renderConnected({ accounts: [alice, bob] });

    expect(await activeAccountButton()).toHaveTextContent(shortAddress(alice));
  });

  it("should switch to another authorized account without opening the wallet", async () => {
    const { mock, user } = await renderConnected({ accounts: [alice, bob] });

    await user.click(await activeAccountButton());
    await user.click(
      await screen.findByRole("menuitemradio", { name: new RegExp(shortAddress(bob)) }),
    );

    expect(await activeAccountButton()).toHaveTextContent(shortAddress(bob));
    expect(mock.calls).not.toContain("eth_requestAccounts");
    expect(mock.calls).not.toContain("wallet_requestPermissions");
  });

  it("should list the accounts authorized from the menu", async () => {
    const { mock, user } = await renderConnected({ accounts: [alice], moreAccounts: [carol] });

    await user.click(await activeAccountButton());
    await user.click(await screen.findByRole("menuitem", { name: /autorizar outras contas/i }));
    await user.click(await activeAccountButton());

    expect(mock.calls).toContain("wallet_requestPermissions");
    expect(await screen.findAllByRole("menuitemradio")).toHaveLength(2);
  });

  it("should go back to the connect button after disconnecting", async () => {
    const { user } = await renderConnected({ accounts: [alice] });

    await user.click(await activeAccountButton());
    await user.click(await screen.findByRole("menuitem", { name: /desconectar/i }));

    expect(await screen.findByRole("button", { name: /conectar carteira/i })).toBeInTheDocument();
  });
});
