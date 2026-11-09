import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { publicClient } from "@/lib/chain";
import { alice, createMockWallet } from "../helpers/mock-wallet";
import { renderRoute } from "../helpers/render";

describe("StatusBanners", () => {
  it("should warn about the wrong network and switch the wallet to the app network", async () => {
    // usuário voltando, com a carteira na mainnet
    const mock = createMockWallet({ accounts: [alice], chainId: 1, authorized: true });
    window.localStorage.setItem("elections:wallet", JSON.stringify(mock.detail.info.rdns));
    const user = userEvent.setup();
    renderRoute("/");

    expect(await screen.findByText(/sua carteira está em outra rede/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /trocar rede/i }));

    await waitFor(() =>
      expect(screen.queryByText(/sua carteira está em outra rede/i)).not.toBeInTheDocument(),
    );
    expect(mock.calls).toContain("wallet_switchEthereumChain");
  });

  it("should warn when the network cannot be reached and retry on request", async () => {
    vi.mocked(publicClient.getBlockNumber).mockRejectedValueOnce(new Error("RPC fora do ar"));
    const user = userEvent.setup();
    renderRoute("/");

    expect(await screen.findByText(/não foi possível falar com a rede/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /tentar novamente/i }));

    await waitFor(() =>
      expect(screen.queryByText(/não foi possível falar com a rede/i)).not.toBeInTheDocument(),
    );
  });
});
