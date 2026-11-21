import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { decodeFunctionData, type Address } from "viem";
import { describe, expect, it, vi } from "vitest";
import { partyAbi } from "@/contracts";
import { publicClient } from "@/lib/chain";
import { shortAddress } from "@/lib/format";
import { mockChain, type MockCandidate, type MockParty } from "../helpers/mock-chain";
import { alice, bob, carol, connectReturningUser, type MockWallet } from "../helpers/mock-wallet";
import { renderRoute } from "../helpers/render";

const party: Address = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
const stranger: Address = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65";

function newParty(overrides: Partial<MockParty> = {}): MockParty {
  return { address: party, name: "Alfa", owner: bob, balance: 2n * 10n ** 18n, ...overrides };
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

    expect(await screen.findByRole("heading", { name: "Alfa" })).toBeInTheDocument();
    expect(within(stat("Presidente")).getByText(shortAddress(bob))).toBeInTheDocument();
    expect(within(stat("Saldo")).getByText("1,5 ETH")).toBeInTheDocument();
    expect(within(stat("Você já doou")).getByText("—")).toBeInTheDocument();
  });

  it("should show how much the active account has donated", async () => {
    mockChain({ owner: carol, parties: [newParty({ donatedBy: { [alice]: 250_000_000_000_000_000n } })] });
    connectReturningUser({ accounts: [alice] });
    renderRoute(`/parties/${party}`);
    await screen.findByRole("heading", { name: "Alfa" });

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
      await screen.findByRole("heading", { name: "Alfa" });
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

      expect(await screen.findByRole("heading", { name: "Alfa" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Doar" })).toBeDisabled();
      expect(screen.getByText("Conecte a carteira para doar.")).toBeInTheDocument();
      expect(within(stat("Saldo")).getByText("2 ETH")).toBeInTheDocument();
    });
  });

  describe("sacar (presidente)", () => {
    async function openAs(account: Address | undefined, mock: MockParty) {
      mockChain({ owner: carol, parties: [mock] });
      const wallet = account ? connectReturningUser({ accounts: [account] }) : undefined;
      const user = userEvent.setup();
      renderRoute(`/parties/${party}`);
      await screen.findByRole("heading", { name: "Alfa" });

      return { wallet, user };
    }

    it("should show the form only to the president, with the destination starting as their address", async () => {
      await openAs(bob, newParty({ owner: bob }));

      expect(await screen.findByLabelText("Destino")).toHaveValue(bob);
    });

    it.each([
      ["another account", alice],
      ["no wallet", undefined],
    ])("should not show the form to %s", async (_, account) => {
      await openAs(account, newParty({ owner: bob }));
      await screen.findByLabelText("Valor em ETH");

      expect(screen.queryByLabelText("Destino")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Sacar tudo" })).not.toBeInTheDocument();
    });

    it("should send withdraw(to, amount) and refresh the balance", async () => {
      const mock = newParty({ owner: bob, balance: 2n * 10n ** 18n });
      const { wallet, user } = await openAs(bob, mock);
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
        to: party,
        functionName: "withdraw",
        args: [carol, 5n * 10n ** 17n],
      });
      expect(await within(stat("Saldo")).findByText("1,5 ETH")).toBeInTheDocument();
    });

    it("should fill the field with the exact balance, not the rounded one", async () => {
      const { user } = await openAs(bob, newParty({ owner: bob, balance: 1_234_567_800_000_000_000n }));

      await user.click(await screen.findByRole("button", { name: "Sacar tudo" }));

      expect(screen.getByLabelText("Valor em ETH", { selector: "#withdraw-amount" })).toHaveValue("1.2345678");
      expect(within(stat("Saldo")).getByText("1,2345 ETH")).toBeInTheDocument();
    });

    it.each([
      ["destination is not an address", "0x123", "0.1"],
      ["destination is the zero address", "0x0000000000000000000000000000000000000000", "0.1"],
      ["amount is empty", "", ""],
      ["amount is zero", "", "0"],
      ["amount is one wei above the balance", "", "1.000000000000000001"],
    ])("should not open the wallet when the %s", async (_, to, amount) => {
      const { wallet, user } = await openAs(bob, newParty({ owner: bob, balance: 10n ** 18n }));
      const destination = await screen.findByLabelText("Destino");

      if (to) {
        await user.clear(destination);
        await user.type(destination, to);
      }
      if (amount) {
        await user.type(screen.getByLabelText("Valor em ETH", { selector: "#withdraw-amount" }), amount);
      }
      await user.click(screen.getByRole("button", { name: "Sacar" }));

      expect(await screen.findAllByText(/endereço|valor|Informe/i, { selector: "p.text-destructive" })).not.toHaveLength(0);
      expect(wallet!.transactions).toHaveLength(0);
    });
  });

  describe("passar a presidência", () => {
    async function openAs(account: Address, mock: MockParty) {
      mockChain({ owner: carol, parties: [mock] });
      const wallet = connectReturningUser({ accounts: [account] });
      const user = userEvent.setup();
      renderRoute(`/parties/${party}`);
      await screen.findByRole("heading", { name: "Alfa" });

      return { wallet, user };
    }

    it("should send transferOwnership and show the pending president while the president stays", async () => {
      const mock = newParty({ owner: bob });
      const { wallet, user } = await openAs(bob, mock);
      vi.mocked(publicClient.waitForTransactionReceipt).mockImplementationOnce((async ({ hash }: { hash: string }) => {
        mock.pendingOwner = alice;

        return { status: "success", transactionHash: hash, logs: [] };
      }) as never);

      await user.type(await screen.findByLabelText("Endereço do novo presidente"), alice);
      await user.click(screen.getByRole("button", { name: "Passar a presidência" }));

      await waitFor(() => expect(wallet.transactions).toHaveLength(1));
      expect(sentCall(wallet)).toMatchObject({ to: party, functionName: "transferOwnership", args: [alice] });
      expect(await screen.findByText(/Presidente pendente:/)).toHaveTextContent(alice);
      expect(within(stat("Presidente")).getByText(shortAddress(bob))).toBeInTheDocument();
      expect(screen.getByLabelText("Destino")).toBeInTheDocument();
    });

    it.each([
      ["not an address", "0x123"],
      ["the zero address", "0x0000000000000000000000000000000000000000"],
    ])("should not open the wallet when the new president is %s", async (_, successor) => {
      const { wallet, user } = await openAs(bob, newParty({ owner: bob }));

      await user.type(await screen.findByLabelText("Endereço do novo presidente"), successor);
      await user.click(screen.getByRole("button", { name: "Passar a presidência" }));

      expect(await screen.findByText(/endereço/i, { selector: "p.text-destructive" })).toBeInTheDocument();
      expect(wallet.transactions).toHaveLength(0);
    });

    it("should not offer the handover form to anyone but the president", async () => {
      await openAs(alice, newParty({ owner: bob }));
      await screen.findByLabelText("Valor em ETH");

      expect(screen.queryByLabelText("Endereço do novo presidente")).not.toBeInTheDocument();
    });

    it("should offer to accept only to the pending account, who becomes president with the withdraw form", async () => {
      const mock = newParty({ owner: bob, pendingOwner: alice });
      const { wallet, user } = await openAs(alice, mock);
      expect(screen.queryByLabelText("Destino")).not.toBeInTheDocument();
      vi.mocked(publicClient.waitForTransactionReceipt).mockImplementationOnce((async ({ hash }: { hash: string }) => {
        mock.owner = alice;
        mock.pendingOwner = undefined;

        return { status: "success", transactionHash: hash, logs: [] };
      }) as never);

      await user.click(await screen.findByRole("button", { name: "Aceitar a presidência" }));

      await waitFor(() => expect(wallet.transactions).toHaveLength(1));
      expect(sentCall(wallet)).toMatchObject({ to: party, functionName: "acceptOwnership" });
      expect(await screen.findByLabelText("Destino")).toHaveValue(alice);
      expect(within(stat("Presidente")).getByText(shortAddress(alice))).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Aceitar a presidência" })).not.toBeInTheDocument();
    });

    it("should not offer to accept to an account that is not the pending one", async () => {
      await openAs(carol, newParty({ owner: bob, pendingOwner: alice }));
      await screen.findByLabelText("Valor em ETH");

      expect(screen.queryByRole("button", { name: "Aceitar a presidência" })).not.toBeInTheDocument();
      expect(screen.getByText(/Presidente pendente:/)).toBeInTheDocument();
    });

    it("should not show the withdraw or handover forms to the former president", async () => {
      // estado depois de a alice aceitar: o bob já não preside
      await openAs(bob, newParty({ owner: alice }));
      await screen.findByLabelText("Valor em ETH");

      expect(screen.queryByLabelText("Destino")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Endereço do novo presidente")).not.toBeInTheDocument();
    });
  });

  describe("candidatos", () => {
    const one: MockCandidate = { address: "0x976EA74026E726554dB657fA54763abd0C3a0aa9", name: "Candidato Um", owner: alice, balance: 10n ** 18n };
    const two: MockCandidate = { address: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955", name: "Candidato Dois", owner: carol };

    it("should list the candidates, newest first, with name, wallet, balance and a link", async () => {
      mockChain({ owner: carol, parties: [newParty({ candidates: [one, two] })] });
      renderRoute(`/parties/${party}`);

      const links = await screen.findAllByRole("link", { name: /Candidato/ });
      expect(links.map((link) => link.getAttribute("href"))).toEqual([`/candidates/${two.address}`, `/candidates/${one.address}`]);
      expect(within(links[1]).getByText("Candidato Um")).toBeInTheDocument();
      expect(within(links[1]).getByText(shortAddress(alice))).toBeInTheDocument();
      expect(within(links[1]).getByText("1 ETH")).toBeInTheDocument();
    });

    it("should show the empty state when the party has no candidates", async () => {
      mockChain({ owner: carol, parties: [newParty()] });
      renderRoute(`/parties/${party}`);

      expect(await screen.findByText("Nenhum candidato criado ainda.")).toBeInTheDocument();
    });

    it("should show an error with a retry button when reading the candidates fails", async () => {
      mockChain({ owner: carol, parties: [newParty({ candidates: [one] })] });
      const read = vi.mocked(publicClient.readContract).getMockImplementation()!;
      vi.mocked(publicClient.readContract).mockImplementation((async (args: { functionName: string }) => {
        if (args.functionName === "candidates") {
          throw new Error("rpc fora do ar");
        }

        return read(args as never);
      }) as never);
      const user = userEvent.setup();
      renderRoute(`/parties/${party}`);

      expect(await screen.findByText("Não foi possível carregar os candidatos.")).toBeInTheDocument();
      vi.mocked(publicClient.readContract).mockImplementation(read);
      await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

      expect(await screen.findByText("Candidato Um")).toBeInTheDocument();
    });

    async function openAs(account: Address | undefined, mock: MockParty) {
      mockChain({ owner: carol, parties: [mock] });
      const wallet = account ? connectReturningUser({ accounts: [account] }) : undefined;
      const user = userEvent.setup();
      renderRoute(`/parties/${party}`);
      await screen.findByRole("heading", { name: "Alfa" });

      return { wallet, user };
    }

    it("should show the create form only to the president", async () => {
      await openAs(bob, newParty({ owner: bob }));

      expect(await screen.findByLabelText("Carteira do candidato")).toBeInTheDocument();
    });

    it.each([
      ["another account", alice],
      ["no wallet", undefined],
    ])("should not show the create form to %s", async (_, account) => {
      await openAs(account, newParty({ owner: bob }));
      await screen.findByText("Nenhum candidato criado ainda.");

      expect(screen.queryByLabelText("Carteira do candidato")).not.toBeInTheDocument();
    });

    it("should send createCandidate and list the new candidate once mined", async () => {
      const mock = newParty({ owner: bob, candidates: [] });
      const { wallet, user } = await openAs(bob, mock);
      vi.mocked(publicClient.waitForTransactionReceipt).mockImplementationOnce((async ({ hash }: { hash: string }) => {
        mock.candidates = [one];

        return { status: "success", transactionHash: hash, logs: [] };
      }) as never);

      await user.type(await screen.findByLabelText("Nome do candidato"), "  Candidato Um ");
      await user.type(screen.getByLabelText("Carteira do candidato"), alice);
      await user.click(screen.getByRole("button", { name: "Criar candidato" }));

      await waitFor(() => expect(wallet!.transactions).toHaveLength(1));
      expect(sentCall(wallet!)).toMatchObject({ to: party, functionName: "createCandidate", args: [alice, "Candidato Um"] });
      expect(await screen.findByRole("link", { name: /Candidato Um/ })).toHaveAttribute("href", `/candidates/${one.address}`);
    });

    it.each([
      ["wallet is not an address", "0x123", "Candidato Um", /endereço válido/],
      ["wallet is the zero address", "0x0000000000000000000000000000000000000000", "Candidato Um", /endereço zero/],
      ["name is empty", alice, "", /Informe o nome do candidato\./],
      ["name is whitespace", alice, "   ", /Informe o nome do candidato\./],
    ])("should not open the wallet when the %s", async (_, wallet, name, message) => {
      const { wallet: sent, user } = await openAs(bob, newParty({ owner: bob }));

      await user.type(await screen.findByLabelText("Carteira do candidato"), wallet);
      if (name) {
        await user.type(screen.getByLabelText("Nome do candidato"), name);
      }
      await user.click(screen.getByRole("button", { name: "Criar candidato" }));

      expect(await screen.findByText(message, { selector: "p.text-destructive" })).toBeInTheDocument();
      expect(sent!.transactions).toHaveLength(0);
    });
  });
});
