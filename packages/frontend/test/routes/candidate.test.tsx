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

  describe("sacar (carteira do candidato)", () => {
    async function openAs(account: Address | undefined, candidate: MockCandidate) {
      mockChain({ owner: carol, parties: [newParty([candidate])] });
      const wallet = account ? connectReturningUser({ accounts: [account] }) : undefined;
      const user = userEvent.setup();
      renderRoute(`/candidates/${candidateAddress}`);
      await screen.findByRole("heading", { name: "Candidato Um" });

      return { wallet, user };
    }

    it("should show the form to the candidate wallet, with the destination starting as its address", async () => {
      await openAs(alice, newCandidate({ owner: alice }));

      expect(await screen.findByLabelText("Destino")).toHaveValue(alice);
    });

    it.each([
      ["the party president", bob],
      ["another account", carol],
      ["no wallet", undefined],
    ])("should not show the form to %s", async (_, account) => {
      await openAs(account, newCandidate({ owner: alice }));
      await screen.findByLabelText("Valor em ETH");

      expect(screen.queryByLabelText("Destino")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Sacar tudo" })).not.toBeInTheDocument();
    });

    it("should send withdraw(to, amount) to the candidate and refresh the balance", async () => {
      const mock = newCandidate({ owner: alice, balance: 2n * 10n ** 18n });
      const { wallet, user } = await openAs(alice, mock);
      vi.mocked(publicClient.waitForTransactionReceipt).mockImplementationOnce((async ({ hash }: { hash: string }) => {
        mock.balance = 15n * 10n ** 17n;

        return { status: "success", transactionHash: hash, logs: [] };
      }) as never);

      const to = await screen.findByLabelText("Destino");
      await user.clear(to);
      await user.type(to, carol);
      await user.type(screen.getByLabelText("Valor em ETH", { selector: "#withdraw-amount" }), "0.5");
      await user.click(screen.getByRole("button", { name: "Sacar" }));

      await waitFor(() => expect(wallet!.transactions).toHaveLength(1));
      expect(sentCall(wallet!)).toMatchObject({
        to: candidateAddress,
        functionName: "withdraw",
        args: [carol, 5n * 10n ** 17n],
      });
      expect(await within(stat("Saldo")).findByText("1,5 ETH")).toBeInTheDocument();
    });

    it("should fill the field with the exact balance", async () => {
      const { user } = await openAs(alice, newCandidate({ owner: alice, balance: 1_234_567_800_000_000_000n }));

      await user.click(await screen.findByRole("button", { name: "Sacar tudo" }));

      expect(screen.getByLabelText("Valor em ETH", { selector: "#withdraw-amount" })).toHaveValue("1.2345678");
    });

    it.each([
      ["destination is not an address", "0x123", "0.1", /endereço/i],
      ["destination is the zero address", "0x0000000000000000000000000000000000000000", "0.1", /endereço/i],
      ["amount is empty", "", "", /Informe um valor/],
      ["amount is zero", "", "0", /maior que zero/],
      ["amount is one wei above the balance", "", "1.000000000000000001", /saldo do candidato/],
    ])("should not open the wallet when the %s", async (_, to, amount, message) => {
      const { wallet, user } = await openAs(alice, newCandidate({ owner: alice, balance: 10n ** 18n }));
      const destination = await screen.findByLabelText("Destino");

      if (to) {
        await user.clear(destination);
        await user.type(destination, to);
      }
      if (amount) {
        await user.type(screen.getByLabelText("Valor em ETH", { selector: "#withdraw-amount" }), amount);
      }
      await user.click(screen.getByRole("button", { name: "Sacar" }));

      expect(await screen.findByText(message, { selector: "p.text-destructive" })).toBeInTheDocument();
      expect(wallet!.transactions).toHaveLength(0);
    });
  });
});
