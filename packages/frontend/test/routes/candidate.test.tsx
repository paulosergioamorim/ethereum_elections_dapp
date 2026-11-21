import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { decodeFunctionData, type Address } from "viem";
import { describe, expect, it, vi } from "vitest";
import { candidateAbi } from "@/contracts";
import { publicClient } from "@/lib/chain";
import { shortAddress } from "@/lib/format";
import { mockChain, type MockCandidate, type MockParty } from "../helpers/mock-chain";
import { alice, bob, carol, connectReturningUser, type MockWallet } from "../helpers/mock-wallet";
import { renderRoute } from "../helpers/render";

const party: Address = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
const forgedParty: Address = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65";
const candidateAddress: Address = "0x976EA74026E726554dB657fA54763abd0C3a0aa9";

function newCandidate(overrides: Partial<MockCandidate> = {}): MockCandidate {
  return { address: candidateAddress, name: "Candidato Um", owner: alice, balance: 2n * 10n ** 18n, ...overrides };
}

function newParty(candidates: MockCandidate[] = [newCandidate()]): MockParty {
  return { address: party, name: "Alfa", owner: bob, candidates };
}

function sentCall(wallet: MockWallet, index = 0) {
  const transaction = wallet.transactions[index];

  return { to: transaction.to, value: transaction.value, ...decodeFunctionData({ abi: candidateAbi, data: transaction.data }) };
}

function stat(name: string) {
  return screen.getByRole("group", { name });
}

describe("Candidate (página do candidato)", () => {
  it("should show name, a link to the party, wallet and balance without a wallet", async () => {
    mockChain({ owner: carol, parties: [newParty([newCandidate({ balance: 1_500_000_000_000_000_000n })])] });
    renderRoute(`/candidates/${candidateAddress}`);

    expect(await screen.findByRole("heading", { name: "Candidato Um" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Alfa" })).toHaveAttribute("href", `/parties/${party}`);
    expect(within(stat("Carteira")).getByText(shortAddress(alice))).toBeInTheDocument();
    expect(within(stat("Saldo")).getByText("1,5 ETH")).toBeInTheDocument();
    expect(within(stat("Você já doou")).getByText("—")).toBeInTheDocument();
  });

  it("should show how much the active account has donated", async () => {
    mockChain({
      owner: carol,
      parties: [newParty([newCandidate({ donatedBy: { [carol]: 250_000_000_000_000_000n } })])],
    });
    connectReturningUser({ accounts: [carol] });
    renderRoute(`/candidates/${candidateAddress}`);
    await screen.findByRole("heading", { name: "Candidato Um" });

    expect(await within(stat("Você já doou")).findByText("0,25 ETH")).toBeInTheDocument();
  });

  it.each([
    ["text that is not an address", "nao-e-endereco", [newCandidate()]],
    ["a contract no party of the factory lists", "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955", [newCandidate()]],
    [
      "a contract that claims a party that does not list it",
      candidateAddress,
      [newCandidate({ claimedParty: forgedParty })],
    ],
  ])("should show the not-found screen for %s, with no donate form", async (_, param, candidates) => {
    mockChain({ owner: carol, parties: [newParty(candidates)] });
    renderRoute(`/candidates/${param}`);

    expect(await screen.findByText("Candidato não encontrado.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Valor em ETH")).not.toBeInTheDocument();
  });

  it("should show the not-found screen for a candidate that claims a real party which does not list it", async () => {
    const other: MockParty = { address: forgedParty, name: "Partido Beta", owner: carol };
    mockChain({
      owner: carol,
      parties: [{ ...newParty([newCandidate({ claimedParty: forgedParty })]) }, other],
    });
    renderRoute(`/candidates/${candidateAddress}`);

    expect(await screen.findByText("Candidato não encontrado.")).toBeInTheDocument();
  });

  describe("doar", () => {
    async function openConnected(candidates: MockCandidate[]) {
      mockChain({ owner: carol, parties: [newParty(candidates)] });
      const wallet = connectReturningUser({ accounts: [carol] });
      const user = userEvent.setup();
      renderRoute(`/candidates/${candidateAddress}`);
      await screen.findByRole("heading", { name: "Candidato Um" });
      await waitFor(() => expect(screen.getByRole("button", { name: "Doar" })).toBeEnabled());

      return { wallet, user };
    }

    it("should send donate() to the candidate with the amount as value and refresh balance and total", async () => {
      const mock = newCandidate({ balance: 10n ** 18n, donatedBy: { [carol]: 10n ** 18n } });
      const { wallet, user } = await openConnected([mock]);
      vi.mocked(publicClient.waitForTransactionReceipt).mockImplementationOnce((async ({ hash }: { hash: string }) => {
        mock.balance = 3n * 10n ** 18n / 2n;
        mock.donatedBy = { [carol]: 3n * 10n ** 18n / 2n };

        return { status: "success", transactionHash: hash, logs: [] };
      }) as never);

      await user.type(screen.getByLabelText("Valor em ETH"), "0,5");
      await user.click(screen.getByRole("button", { name: "Doar" }));

      await waitFor(() => expect(wallet.transactions).toHaveLength(1));
      expect(sentCall(wallet)).toMatchObject({ to: candidateAddress, functionName: "donate", value: "0x6f05b59d3b20000" });
      expect(await within(stat("Saldo")).findByText("1,5 ETH")).toBeInTheDocument();
      expect(within(stat("Você já doou")).getByText("1,5 ETH")).toBeInTheDocument();
    });

    it.each(["", "abc", "0", "-1", "0.0000000000000000001"])(
      "should not open the wallet for the amount %j",
      async (amount) => {
        const { wallet, user } = await openConnected([newCandidate()]);

        if (amount) {
          await user.type(screen.getByLabelText("Valor em ETH"), amount);
        }
        await user.click(screen.getByRole("button", { name: "Doar" }));

        expect(await screen.findByText(/Informe um valor|maior que zero|casas decimais/)).toBeInTheDocument();
        expect(wallet.transactions).toHaveLength(0);
      },
    );

    it("should disable the button with a reason while no wallet is connected, keeping the data", async () => {
      mockChain({ owner: carol, parties: [newParty()] });
      renderRoute(`/candidates/${candidateAddress}`);

      expect(await screen.findByRole("heading", { name: "Candidato Um" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Doar" })).toBeDisabled();
      expect(screen.getByText("Conecte a carteira para doar.")).toBeInTheDocument();
      expect(within(stat("Saldo")).getByText("2 ETH")).toBeInTheDocument();
    });
  });
});
