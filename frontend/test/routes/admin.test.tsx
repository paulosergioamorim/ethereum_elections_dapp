import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { decodeFunctionData, type Address } from "viem";
import { describe, expect, it } from "vitest";
import { electionFactoryAbi, factoryAddress } from "@/contracts";
import { shortAddress } from "@/lib/format";
import { mockChain, mockElectionCreatedReceipt } from "../helpers/mock-chain";
import { alice, bob, carol, connectReturningUser, type MockWallet } from "../helpers/mock-wallet";
import { renderRoute } from "../helpers/render";

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
    renderRoute("/admin");

    expect(within(await voterRow(bob)).getByText("Cadastrado")).toBeInTheDocument();
    expect(within(await voterRow(carol)).getByText("Aguardando cadastro")).toBeInTheDocument();
    // autorizada e depois removida: não aparece
    expect(screen.queryByText(shortAddress(alice))).not.toBeInTheDocument();

    const authorized = screen.getByRole("group", { name: "Carteiras autorizadas" });
    const registered = screen.getByRole("group", { name: "Eleitores cadastrados" });
    expect(await within(authorized).findByText("2")).toBeInTheDocument();
    expect(await within(registered).findByText("1")).toBeInTheDocument();
  });

  it("should warn when the active account is not the authority and switch to it", async () => {
    mockChain({ owner: bob });
    connectReturningUser({ accounts: [alice, bob], active: alice });
    const user = userEvent.setup();
    renderRoute("/admin");

    expect(await screen.findByText(/a conta ativa não é a autoridade/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /usar a conta da autoridade/i }));

    await waitFor(() =>
      expect(screen.queryByText(/a conta ativa não é a autoridade/i)).not.toBeInTheDocument(),
    );
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
      await screen.findByText("Cadastre pelo menos um eleitor antes de criar a eleição."),
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
    await user.type(screen.getByLabelText("Candidato 1"), "Ana");
    await user.type(screen.getByLabelText("Candidato 2"), "Bruno");

    const submit = screen.getByRole("button", { name: "Criar eleição" });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);

    expect(await screen.findByRole("link", { name: /abrir eleição/i })).toHaveAttribute(
      "href",
      `/elections/${carol}`,
    );
    expect(sentCall(wallet)).toMatchObject({
      functionName: "createElection",
      args: [{ title: "Representante da turma", candidates: ["Ana", "Bruno"] }],
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
});
