import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { decodeFunctionData, type Address } from "viem";
import { describe, expect, it, vi } from "vitest";
import { partyAbi } from "@/contracts";
import { publicClient } from "@/lib/chain";
import { shortAddress } from "@/lib/format";
import { mockChain, type MockParty } from "../helpers/mock-chain";
import { alice, bob, carol, connectReturningUser, type MockWallet } from "../helpers/mock-wallet";
import { renderRoute } from "../helpers/render";

const party: Address = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
const stranger: Address = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65";

function newParty(overrides: Partial<MockParty> = {}): MockParty {
  return { address: party, name: "PT", owner: bob, balance: 2n * 10n ** 18n, ...overrides };
}

function sentCall(wallet: MockWallet, index = 0) {
  const transaction = wallet.transactions[index];

  return { to: transaction.to, value: transaction.value, ...decodeFunctionData({ abi: partyAbi, data: transaction.data }) };
}

function stat(name: string) {
  return screen.getByRole("group", { name });
}

describe("Party (página do partido)", () => {
  it("should show name, president and balance without a wallet", async () => {
    mockChain({ owner: carol, parties: [newParty({ balance: 1_500_000_000_000_000_000n })] });
    renderRoute(`/parties/${party}`);

    expect(await screen.findByRole("heading", { name: "PT" })).toBeInTheDocument();
    expect(within(stat("Presidente")).getByText(shortAddress(bob))).toBeInTheDocument();
    expect(within(stat("Saldo")).getByText("1,5 ETH")).toBeInTheDocument();
    expect(within(stat("Você já doou")).getByText("—")).toBeInTheDocument();
  });

  it("should show how much the active account has donated", async () => {
    mockChain({ owner: carol, parties: [newParty({ donatedBy: { [alice]: 250_000_000_000_000_000n } })] });
    connectReturningUser({ accounts: [alice] });
    renderRoute(`/parties/${party}`);
    await screen.findByRole("heading", { name: "PT" });

    expect(await within(stat("Você já doou")).findByText("0,25 ETH")).toBeInTheDocument();
  });

  it.each([
    ["a contract the factory did not create", stranger],
    ["text that is not an address", "nao-e-endereco"],
  ])("should show the not-found screen for %s, with no donate form", async (_, param) => {
    mockChain({ owner: carol, parties: [newParty()] });
    renderRoute(`/parties/${param}`);

    expect(await screen.findByText("Partido não encontrado.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Valor em ETH")).not.toBeInTheDocument();
  });

  describe("doar", () => {
    async function openConnected(parties: MockParty[]) {
      const chain = mockChain({ owner: carol, parties });
      const wallet = connectReturningUser({ accounts: [alice] });
      const user = userEvent.setup();
      renderRoute(`/parties/${party}`);
      await screen.findByRole("heading", { name: "PT" });
      await waitFor(() => expect(screen.getByRole("button", { name: "Doar" })).toBeEnabled());

      return { ...chain, wallet, user };
    }

    it("should send donate() with the amount as value and refresh balance and total", async () => {
      const mock = newParty({ balance: 10n ** 18n, donatedBy: { [alice]: 10n ** 18n } });
      const { wallet, user } = await openConnected([mock]);
      vi.mocked(publicClient.waitForTransactionReceipt).mockImplementationOnce((async ({ hash }: { hash: string }) => {
        // o contrato soma a doação antes de as leituras serem refeitas
        mock.balance = 3n * 10n ** 18n / 2n;
        mock.donatedBy = { [alice]: 3n * 10n ** 18n / 2n };

        return { status: "success", transactionHash: hash, logs: [] };
      }) as never);

      await user.type(screen.getByLabelText("Valor em ETH"), "0,5");
      await user.click(screen.getByRole("button", { name: "Doar" }));

      await waitFor(() => expect(wallet.transactions).toHaveLength(1));
      expect(sentCall(wallet)).toMatchObject({
        to: party,
        functionName: "donate",
        value: "0x6f05b59d3b20000", // 0,5 ETH
      });
      expect(await within(stat("Saldo")).findByText("1,5 ETH")).toBeInTheDocument();
      expect(within(stat("Você já doou")).getByText("1,5 ETH")).toBeInTheDocument();
    });

    it.each(["", "abc", "0", "-1", "0.0000000000000000001"])(
      "should not open the wallet for the amount %j",
      async (amount) => {
        const { wallet, user } = await openConnected([newParty()]);

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
      renderRoute(`/parties/${party}`);

      expect(await screen.findByRole("heading", { name: "PT" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Doar" })).toBeDisabled();
      expect(screen.getByText("Conecte a carteira para doar.")).toBeInTheDocument();
      expect(within(stat("Saldo")).getByText("2 ETH")).toBeInTheDocument();
    });
  });
});
