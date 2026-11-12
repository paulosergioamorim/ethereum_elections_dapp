import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { decodeFunctionData, numberToHex } from "viem";
import { describe, expect, it } from "vitest";
import { electionFactoryAbi } from "@/contracts";
import { shortHex } from "@/lib/format";
import { mockChain } from "../helpers/mock-chain";
import { alice, bob, connectReturningUser, testIdentity } from "../helpers/mock-wallet";
import { renderRoute } from "../helpers/render";

async function registerButton() {
  return screen.findByRole("button", { name: "Gerar identidade e registrar" });
}

describe("Register (registro do eleitor)", () => {
  it("should register the identity derived from the wallet signature", async () => {
    mockChain({ owner: bob, voters: [{ address: alice }] });
    const wallet = connectReturningUser({ accounts: [alice] });
    const user = userEvent.setup();
    renderRoute("/register");

    const button = await registerButton();
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    await waitFor(() => expect(wallet.transactions).toHaveLength(1));
    expect(wallet.calls).toContain("personal_sign");

    const call = decodeFunctionData({ abi: electionFactoryAbi, data: wallet.transactions[0].data });
    expect(call.functionName).toBe("registerIdentityCommitment");
    expect(call.args).toEqual([(await testIdentity(alice)).commitment]);
  });

  it("should not ask for a signature when the wallet is not authorized", async () => {
    mockChain({ owner: bob });
    const wallet = connectReturningUser({ accounts: [alice] });
    renderRoute("/register");

    expect(
      await screen.findByText("Esta conta não está autorizada pela autoridade."),
    ).toBeInTheDocument();
    expect(await registerButton()).toBeDisabled();
    expect(screen.getByText("Não autorizada")).toBeInTheDocument();
    expect(wallet.calls).not.toContain("personal_sign");
  });

  it("should show the identity of an account that already registered", async () => {
    const commitment = 2n ** 250n + 12_345n;
    mockChain({ owner: bob, voters: [{ address: alice, commitment }] });
    connectReturningUser({ accounts: [alice] });
    renderRoute("/register");

    expect(await screen.findByText(shortHex(numberToHex(commitment)))).toBeInTheDocument();
    expect(screen.getByText("Esta conta já está registrada.")).toBeInTheDocument();
    expect(screen.getByText("Pronto para votar.")).toBeInTheDocument();
  });

  it("should send nothing when the signature is refused", async () => {
    mockChain({ owner: bob, voters: [{ address: alice }] });
    const wallet = connectReturningUser({ accounts: [alice], rejectSignatures: true });
    const user = userEvent.setup();
    renderRoute("/register");

    const button = await registerButton();
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    // depois da recusa, o botão volta ao normal e nenhuma transação foi enviada
    await waitFor(() => expect(wallet.calls).toContain("personal_sign"));
    await waitFor(() => expect(button).toBeEnabled());
    expect(wallet.transactions).toHaveLength(0);
  });
});
