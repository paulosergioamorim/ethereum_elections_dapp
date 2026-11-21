import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { decodeFunctionData, encodeEventTopics, type Address } from "viem";
import { describe, expect, it, vi } from "vitest";
import { electionFactoryAbi, factoryAddress } from "@/contracts";
import { publicClient } from "@/lib/chain";
import { shortAddress } from "@/lib/format";
import { mockChain, mockElectionCreatedReceipt, mockPartyCreatedReceipt } from "../helpers/mock-chain";
import { alice, bob, carol, connectReturningUser, type MockWallet } from "../helpers/mock-wallet";
import { renderRoute } from "../helpers/render";

/** Log `PartyCreated` da factory, como vem no recibo de `createParty`. */
function partyCreatedLog(party: Address) {
  const topics = encodeEventTopics({
    abi: electionFactoryAbi,
    eventName: "PartyCreated",
    args: { party },
  });

  return { address: factoryAddress, topics, data: "0x", blockNumber: 3n, logIndex: 0 };
}

async function voterRow(address: Address) {
  return (await screen.findByText(shortAddress(address))).closest("li")!;
}

/** A transação que a carteira recebeu para assinar, decodificada. */
function sentCall(wallet: MockWallet, index = 0) {
  const transaction = wallet.transactions[index];

  return {
    to: transaction.to,
    ...decodeFunctionData({ abi: electionFactoryAbi, data: transaction.data }),
  };
}

describe("Admin (aba da autoridade)", () => {
  it("should list the authorized wallets with their registration status", async () => {
    mockChain({
      owner: alice,
      voters: [
        { address: bob, commitment: 11n },
        { address: carol },
        { address: alice, authorized: false },
      ],
    });
    connectReturningUser({ accounts: [alice] });
    renderRoute("/admin");

    expect(within(await voterRow(bob)).getByText("Registrado")).toBeInTheDocument();
    expect(within(await voterRow(carol)).getByText("Aguardando registro")).toBeInTheDocument();
    // autorizada e depois removida: não aparece
    // (o endereço dela continua no menu da carteira, fora da lista)
    expect(
      screen.queryAllByText(shortAddress(alice)).filter((element) => element.closest("li")),
    ).toHaveLength(0);

    const authorized = screen.getByRole("group", { name: "Carteiras autorizadas" });
    const registered = screen.getByRole("group", { name: "Eleitores registrados" });
    expect(await within(authorized).findByText("2")).toBeInTheDocument();
    expect(await within(registered).findByText("1")).toBeInTheDocument();
  });

  it("should hide the page from an account that is not the authority and switch to it", async () => {
    mockChain({ owner: bob });
    connectReturningUser({ accounts: [alice, bob], active: alice });
    const user = userEvent.setup();
    renderRoute("/admin");

    expect(await screen.findByText(/a conta ativa não é a autoridade/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Endereços")).not.toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Principal" });
    expect(within(nav).queryByRole("link", { name: "Autoridade" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /usar a conta da autoridade/i }));

    expect(await screen.findByLabelText("Endereços")).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Autoridade" })).toBeInTheDocument();
  });

  it("should not offer to switch when the authority is not among the wallet accounts", async () => {
    mockChain({ owner: bob });
    connectReturningUser({ accounts: [alice] });
    renderRoute("/admin");

    expect(await screen.findByText(/a conta ativa não é a autoridade/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /usar a conta da autoridade/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ir para as eleições/i })).toHaveAttribute("href", "/");
  });

  it("should ask to connect the authority wallet before showing anything", async () => {
    mockChain({ owner: alice, voters: [{ address: bob }] });
    renderRoute("/admin");

    expect(await screen.findByText(/conecte a carteira da autoridade/i)).toBeInTheDocument();
    expect(screen.queryByText(shortAddress(bob))).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Carteiras autorizadas" })).not.toBeInTheDocument();
  });

  it("should authorize the typed wallets", async () => {
    mockChain({ owner: alice });
    const wallet = connectReturningUser({ accounts: [alice] });
    const user = userEvent.setup();
    renderRoute("/admin");

    await user.type(await screen.findByLabelText("Endereços"), `${bob.toLowerCase()}, 0x123`);
    expect(screen.getByText("1 nova · 1 inválida")).toBeInTheDocument();

    const submit = screen.getByRole("button", { name: "Autorizar carteira" });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);

    await waitFor(() => expect(wallet.transactions).toHaveLength(1));
    expect(sentCall(wallet)).toMatchObject({
      to: factoryAddress,
      functionName: "addAuthorizedVoters",
      args: [[bob]],
    });
  });

  it("should not create an election before any voter registers", async () => {
    mockChain({ owner: alice, voters: [{ address: bob }] });
    connectReturningUser({ accounts: [alice] });
    renderRoute("/admin");

    expect(
      await screen.findByText("Registre pelo menos um eleitor antes de criar a eleição."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar eleição" })).toBeDisabled();
  });

  it("should create an election and link to it", async () => {
    mockChain({ owner: alice, voters: [{ address: bob, commitment: 11n }] });
    mockElectionCreatedReceipt(carol);
    const wallet = connectReturningUser({ accounts: [alice] });
    const user = userEvent.setup();
    renderRoute("/admin");

    await user.type(await screen.findByLabelText("Título"), "Representante da turma");
    // sem campos de candidatos: os partidos indicam depois
    expect(screen.queryByLabelText(/Candidato/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Fim das indicações")).toBeInTheDocument();

    const submit = screen.getByRole("button", { name: "Criar eleição" });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);

    expect(await screen.findByRole("link", { name: /abrir eleição/i })).toHaveAttribute(
      "href",
      `/elections/${carol}`,
    );
    expect(sentCall(wallet)).toMatchObject({
      functionName: "createElection",
      args: [
        {
          title: "Representante da turma",
          nominationEnd: expect.any(BigInt),
          votingStart: expect.any(BigInt),
          votingEnd: expect.any(BigInt),
        },
      ],
    });
  });

  it("should remove a registered voter with the siblings of the current group", async () => {
    const { group } = mockChain({
      owner: alice,
      voters: [
        { address: alice, commitment: 11n },
        { address: bob, commitment: 22n },
        { address: carol, commitment: 33n },
      ],
    });
    const wallet = connectReturningUser({ accounts: [alice] });
    const user = userEvent.setup();
    renderRoute("/admin");

    await user.click(
      await within(await voterRow(bob)).findByRole("button", { name: `Remover ${bob}` }),
    );
    await user.click(await screen.findByRole("button", { name: "Remover" }));

    await waitFor(() => expect(wallet.transactions).toHaveLength(1));
    expect(sentCall(wallet)).toMatchObject({
      functionName: "removeVoter",
      args: [bob, group.generateMerkleProof(1).siblings],
    });
  });

  describe("Criar partido", () => {
    it("should create a party, link to it and list it under Partidos", async () => {
      const { parties } = mockChain({ owner: alice, voters: [{ address: bob }] });
      mockPartyCreatedReceipt(carol);
      const wallet = connectReturningUser({ accounts: [alice] });
      vi.mocked(publicClient.waitForTransactionReceipt).mockImplementationOnce((async ({
        hash,
      }: {
        hash: string;
      }) => {
        // o contrato registra o partido antes de a lista ser lida de novo
        parties.push({ address: carol, name: "Partido Beta", owner: bob });

        return {
          status: "success",
          transactionHash: hash,
          logs: [partyCreatedLog(carol)],
        };
      }) as never);
      const user = userEvent.setup();
      renderRoute("/admin");

      await user.type(await screen.findByLabelText("Nome do partido"), "Partido Beta");
      await user.type(screen.getByLabelText("Endereço do presidente"), bob);
      const submit = screen.getByRole("button", { name: "Criar partido" });
      await waitFor(() => expect(submit).toBeEnabled());
      await user.click(submit);

      expect(await screen.findByRole("link", { name: /abrir partido/i })).toHaveAttribute(
        "href",
        `/parties/${carol}`,
      );
      expect(sentCall(wallet)).toMatchObject({
        to: factoryAddress,
        functionName: "createParty",
        args: [bob, "Partido Beta"],
      });

      await user.click(
        within(screen.getByRole("navigation", { name: "Principal" })).getByRole("link", {
          name: "Partidos",
        }),
      );
      expect(await screen.findByRole("link", { name: /Partido Beta/ })).toBeInTheDocument();
    });

    it("should not open the wallet for an invalid president address", async () => {
      mockChain({ owner: alice });
      const wallet = connectReturningUser({ accounts: [alice] });
      const user = userEvent.setup();
      renderRoute("/admin");

      await user.type(await screen.findByLabelText("Nome do partido"), "Alfa");
      await user.type(screen.getByLabelText("Endereço do presidente"), "0x123");
      await waitFor(() => expect(screen.getByRole("button", { name: "Criar partido" })).toBeEnabled());
      await user.click(screen.getByRole("button", { name: "Criar partido" }));

      expect(await screen.findByText("Informe um endereço válido.")).toBeInTheDocument();
      expect(wallet.transactions).toHaveLength(0);
    });

    it("should not open the wallet for a blank name", async () => {
      mockChain({ owner: alice });
      const wallet = connectReturningUser({ accounts: [alice] });
      const user = userEvent.setup();
      renderRoute("/admin");

      await user.type(await screen.findByLabelText("Nome do partido"), "   ");
      await user.type(screen.getByLabelText("Endereço do presidente"), bob);
      await waitFor(() => expect(screen.getByRole("button", { name: "Criar partido" })).toBeEnabled());
      await user.click(screen.getByRole("button", { name: "Criar partido" }));

      expect(await screen.findByText("Informe o nome do partido.")).toBeInTheDocument();
      expect(wallet.transactions).toHaveLength(0);
    });

    it("should not show the card to an account that is not the authority", async () => {
      mockChain({ owner: bob });
      connectReturningUser({ accounts: [alice] });
      renderRoute("/admin");

      expect(await screen.findByText(/a conta ativa não é a autoridade/i)).toBeInTheDocument();
      expect(screen.queryByLabelText("Nome do partido")).not.toBeInTheDocument();
    });
  });
});
