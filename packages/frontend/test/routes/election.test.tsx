import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { decodeFunctionData, getAddress, type Address } from "viem";
import { describe, expect, it, vi } from "vitest";
import { electionAbi, electionFactoryAbi, factoryAddress, partyAbi } from "@/contracts";
import { REVEAL_BATCH_SIZE, type OpenedBallot } from "@/elections";
import { openBallots } from "@/elections/tally-crypto";
import { prepareVote } from "@/elections/vote-crypto";
import { publicClient } from "@/lib/chain";
import { shortAddress } from "@/lib/format";
import { logRetry } from "@/lib/logs";
import {
  mockCandidacyAddress,
  mockChain,
  secondsFromNow,
  type MockBallot,
  type MockElection,
  type MockParty,
} from "../helpers/mock-chain";
import { alice, bob, carol, connectReturningUser, testIdentity } from "../helpers/mock-wallet";
import { renderRoute } from "../helpers/render";

// A cripto real (tlock + prova Semaphore) baixa artefatos e fala com o drand; aqui ela é simulada.
// O caminho real é coberto pelos testes de integração do Hardhat (test/integration/tally.test.ts).
const prepared = vi.hoisted(() => ({
  proof: {
    merkleTreeDepth: 1n,
    merkleTreeRoot: 123n,
    nullifier: 456n,
    message: 789n,
    scope: 1n,
    points: [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n] as const,
  },
  commitment: `0x${"11".repeat(32)}` as const,
  ciphertext: "0xc1fe" as const,
}));

vi.mock("@/elections/vote-crypto", () => ({
  prepareVote: vi.fn(async () => prepared),
}));

// abrir cédulas fala com o drand; aqui cada teste diz o que o tlock devolveria
vi.mock("@/elections/tally-crypto", () => ({
  openBallots: vi.fn(async () => []),
}));

// com checksum, como a página padroniza o endereço da URL
const electionAddress: Address = getAddress("0x00000000000000000000000000000000000e1ec7");

function votingElection(overrides: Partial<MockElection> = {}): MockElection {
  return {
    address: electionAddress,
    votingStart: secondsFromNow(-60),
    votingEnd: secondsFromNow(3_600),
    ...overrides,
  };
}

/** Alice registrada antes da criação da eleição, com a identidade que a carteira dela gera. */
async function aliceRegistered(registeredAtBlock = 2n) {
  return { address: alice, commitment: (await testIdentity(alice)).commitment, registeredAtBlock };
}

describe("Election (página da eleição)", () => {
  it("should vote for the chosen candidate with the proof built for this election", async () => {
    mockChain({ owner: bob, voters: [await aliceRegistered()], election: votingElection() });
    const wallet = connectReturningUser({ accounts: [alice] });
    const user = userEvent.setup();
    renderRoute(`/elections/${electionAddress}`);

    expect(
      await screen.findByText("Sua conta está na lista de eleitores desta eleição."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /Bruno/ }));
    await user.click(screen.getByRole("button", { name: "Votar" }));

    await waitFor(() => expect(wallet.transactions).toHaveLength(1));
    expect(wallet.calls).toContain("personal_sign");
    expect(getAddress(wallet.transactions[0].to)).toBe(electionAddress);

    const call = decodeFunctionData({ abi: electionAbi, data: wallet.transactions[0].data });
    expect(call.functionName).toBe("vote");
    expect(call.args).toEqual([prepared.proof, prepared.commitment, prepared.ciphertext]);

    // o voto foi montado com a identidade da carteira, para esta eleição e com a opção 1 (Bruno)
    const [{ option, election, identity }] = vi.mocked(prepareVote).mock.calls[0];
    expect(option).toBe(1n);
    expect(election.address).toBe(electionAddress);
    expect(identity.commitment).toBe((await testIdentity(alice)).commitment);
    expect(await screen.findByText(/Sua cédula foi registrada/)).toBeInTheDocument();
  });

  it("should send the null vote as an option outside the candidate list", async () => {
    mockChain({ owner: bob, voters: [await aliceRegistered()], election: votingElection() });
    const wallet = connectReturningUser({ accounts: [alice] });
    const user = userEvent.setup();
    renderRoute(`/elections/${electionAddress}`);

    await screen.findByText("Sua conta está na lista de eleitores desta eleição.");
    await user.click(screen.getByRole("radio", { name: "Votar nulo" }));
    await user.click(screen.getByRole("button", { name: "Votar" }));

    await waitFor(() => expect(wallet.transactions).toHaveLength(1));
    // 2 candidatos: a opção 2 não existe, e o contrato conta como nulo
    expect(prepareVote).toHaveBeenCalledWith(expect.objectContaining({ option: 2n }));
  });

  it("should not let an account that registered after the election vote", async () => {
    mockChain({
      owner: bob,
      voters: [await aliceRegistered(20n)],
      election: votingElection({ createdAtBlock: 10n }),
    });
    const wallet = connectReturningUser({ accounts: [alice] });
    renderRoute(`/elections/${electionAddress}`);

    expect(
      await screen.findByText(/se registrou depois da criação desta eleição/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Votar" })).toBeDisabled();
    expect(wallet.calls).not.toContain("personal_sign");
  });

  it("should point unregistered accounts to the registration page", async () => {
    mockChain({ owner: bob, voters: [{ address: alice }], election: votingElection() });
    connectReturningUser({ accounts: [alice] });
    renderRoute(`/elections/${electionAddress}`);

    expect(await screen.findByText(/ainda não se registrou como eleitora/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fazer o registro" })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  describe("when the voter list cannot be read", () => {
    const rpcGaveUp = (calls: number) =>
      // 2 leituras (MemberAdded e MemberRemoved), cada uma tentada `attempts` vezes
      vi
        .mocked(publicClient.getContractEvents)
        .mock.calls.filter(([{ eventName }]) => eventName === "MemberAdded").length >= calls;

    it("should still tell an unregistered account to register, instead of the list error", async () => {
      const chain = mockChain({
        owner: carol,
        voters: [{ address: bob }],
        election: votingElection(),
      });
      chain.failGroupLogs(true);
      connectReturningUser({ accounts: [bob] });
      renderRoute(`/elections/${electionAddress}`);

      expect(await screen.findByText(/ainda não se registrou como eleitora/)).toBeInTheDocument();
      await waitFor(() => expect(rpcGaveUp(logRetry.attempts)).toBe(true));
      expect(screen.queryByText(/Não foi possível carregar a lista de eleitores/)).not.toBeInTheDocument();
    });

    it("should read the list again when the account changes, without reloading the page", async () => {
      const chain = mockChain({
        owner: carol,
        voters: [{ address: bob }, await aliceRegistered()],
        election: votingElection(),
      });
      chain.failGroupLogs(true);
      connectReturningUser({ accounts: [bob, alice], active: bob });
      const user = userEvent.setup();
      renderRoute(`/elections/${electionAddress}`);

      await screen.findByText(/ainda não se registrou como eleitora/);
      await waitFor(() => expect(rpcGaveUp(logRetry.attempts)).toBe(true));

      // o RPC volta ao normal e o usuário troca para a conta registrada
      chain.failGroupLogs(false);
      await user.click(await screen.findByRole("button", { name: /conta ativa/i }));
      await user.click(
        await screen.findByRole("menuitemradio", { name: new RegExp(shortAddress(alice)) }),
      );

      expect(
        await screen.findByText("Sua conta está na lista de eleitores desta eleição."),
      ).toBeInTheDocument();
    });

    it("should let the voter try again", async () => {
      const chain = mockChain({
        owner: carol,
        voters: [await aliceRegistered()],
        election: votingElection(),
      });
      chain.failGroupLogs(true);
      connectReturningUser({ accounts: [alice] });
      const user = userEvent.setup();
      renderRoute(`/elections/${electionAddress}`);

      expect(
        await screen.findByText(/Não foi possível carregar a lista de eleitores/),
      ).toBeInTheDocument();

      chain.failGroupLogs(false);
      await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

      expect(
        await screen.findByText("Sua conta está na lista de eleitores desta eleição."),
      ).toBeInTheDocument();
    });
  });

  it("should count down to the start of a scheduled election", async () => {
    mockChain({
      owner: bob,
      election: votingElection({ votingStart: secondsFromNow(3_600), votingEnd: secondsFromNow(7_200) }),
    });
    renderRoute(`/elections/${electionAddress}`);

    const phase = await screen.findByRole("group", { name: "Fase" });
    expect(within(phase).getByText("Agendada")).toBeInTheDocument();
    expect(within(phase).getByText(/Começa em/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Votar" })).toBeDisabled();
  });

  describe("indicação de candidatos", () => {
    function nominationElection(overrides: Partial<MockElection> = {}): MockElection {
      return votingElection({
        nominationEnd: secondsFromNow(1_800),
        votingStart: secondsFromNow(3_600),
        votingEnd: secondsFromNow(7_200),
        ...overrides,
      });
    }

    it("should show the nomination phase and keep the vote closed", async () => {
      mockChain({ owner: bob, election: nominationElection() });
      renderRoute(`/elections/${electionAddress}`);

      const phase = await screen.findByRole("group", { name: "Fase" });
      expect(within(phase).getByText("Indicação de candidatos")).toBeInTheDocument();
      expect(within(phase).getByText(/Indicações até/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Votar" })).toBeDisabled();
      expect(screen.getByText("A votação começa depois da fase de indicação.")).toBeInTheDocument();
    });

    it("should list the nominees with party and balance, in the order of the vote", async () => {
      mockChain({
        owner: bob,
        election: nominationElection({
          candidates: [
            { name: "Ana", partyName: "Partido Alfa", balance: 1_500_000_000_000_000_000n },
            { name: "Bruno", partyName: "Partido Beta" },
          ],
        }),
      });
      renderRoute(`/elections/${electionAddress}`);

      const list = await screen.findByRole("list", { name: "Candidatos indicados" });
      const [first, second] = within(list).getAllByRole("listitem");
      expect(first).toHaveTextContent("1. Ana");
      expect(first).toHaveTextContent("Partido Alfa");
      expect(await within(first).findByLabelText("Saldo de Ana")).toHaveTextContent("1,5");
      expect(second).toHaveTextContent("2. Bruno");
      expect(second).toHaveTextContent("Partido Beta");
    });

    it("should show the empty state when no party nominated yet", async () => {
      mockChain({ owner: bob, election: nominationElection({ candidates: [] }) });
      renderRoute(`/elections/${electionAddress}`);

      expect(await screen.findByText("Nenhum candidato indicado ainda.")).toBeInTheDocument();
    });

    it("should offer only the null vote when voting starts with no nominee", async () => {
      mockChain({
        owner: bob,
        voters: [await aliceRegistered()],
        election: votingElection({ candidates: [] }),
      });
      connectReturningUser({ accounts: [alice] });
      renderRoute(`/elections/${electionAddress}`);

      const options = await screen.findAllByRole("radio");
      expect(options).toHaveLength(1);
      expect(screen.getByRole("radio", { name: "Votar nulo" })).toBeInTheDocument();
    });

    describe("indicar candidato (presidente)", () => {
      const partyAddress: Address = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
      const anaAddress: Address = "0x976EA74026E726554dB657fA54763abd0C3a0aa9";
      const biaAddress: Address = "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955";
      const otherElection: Address = "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f";

      function alfa(overrides: Partial<MockParty> = {}): MockParty {
        return {
          address: partyAddress,
          name: "Partido Alfa",
          owner: alice,
          candidates: [
            { address: anaAddress, name: "Ana", owner: carol },
            { address: biaAddress, name: "Bia", owner: bob },
          ],
          ...overrides,
        };
      }

      function sentFactoryCall(wallet: { transactions: { data: `0x${string}` }[] }) {
        return decodeFunctionData({ abi: electionFactoryAbi, data: wallet.transactions[0].data });
      }

      it("should not show the card to an account that presides no party", async () => {
        mockChain({ owner: carol, parties: [alfa()], election: nominationElection() });
        connectReturningUser({ accounts: [bob] });
        renderRoute(`/elections/${electionAddress}`);

        await screen.findByRole("heading", { name: "Representante da turma" });
        await screen.findByRole("list", { name: "Candidatos indicados" });
        expect(screen.queryByRole("heading", { name: "Indicar candidato" })).not.toBeInTheDocument();
      });

      it("should not show the card without a wallet", async () => {
        mockChain({ owner: carol, parties: [alfa()], election: nominationElection() });
        renderRoute(`/elections/${electionAddress}`);

        await screen.findByRole("list", { name: "Candidatos indicados" });
        expect(screen.queryByRole("heading", { name: "Indicar candidato" })).not.toBeInTheDocument();
      });

      it("should not show the card after the nominations end", async () => {
        mockChain({
          owner: carol,
          parties: [alfa()],
          election: nominationElection({ nominationEnd: secondsFromNow(-60) }),
        });
        connectReturningUser({ accounts: [alice] });
        renderRoute(`/elections/${electionAddress}`);

        await screen.findByRole("list", { name: "Candidatos indicados" });
        expect(screen.queryByRole("heading", { name: "Indicar candidato" })).not.toBeInTheDocument();
      });

      it("should list the candidates of the party and nominate one", async () => {
        const election = nominationElection({ candidates: [] });
        mockChain({ owner: carol, parties: [alfa()], election });
        const wallet = connectReturningUser({ accounts: [alice] });
        const user = userEvent.setup();
        renderRoute(`/elections/${electionAddress}`);

        const card = (await screen.findByRole("heading", { name: "Indicar candidato" })).closest("section")!;
        expect(await within(card).findByRole("button", { name: "Indicar Ana" })).toBeEnabled();
        expect(within(card).getByRole("button", { name: "Indicar Bia" })).toBeEnabled();

        // quando a transação for minerada, a lista da eleição passa a ter a Ana
        election.candidates = [{ name: "Ana", partyName: "Partido Alfa", party: partyAddress, candidate: anaAddress }];
        await user.click(within(card).getByRole("button", { name: "Indicar Ana" }));

        await waitFor(() => expect(wallet.transactions).toHaveLength(1));
        expect(getAddress(wallet.transactions[0].to)).toBe(getAddress(factoryAddress));
        expect(sentFactoryCall(wallet)).toMatchObject({
          functionName: "nominate",
          args: [electionAddress, anaAddress],
        });

        const list = await screen.findByRole("list", { name: "Candidatos indicados" });
        expect(await within(list).findByText(/1\. Ana/)).toBeInTheDocument();
        expect(await within(card).findByRole("button", { name: "Retirar indicação de Ana" })).toBeInTheDocument();
      });

      it("should replace the nominee of the party by nominating another candidate", async () => {
        const election = nominationElection({
          candidates: [{ name: "Ana", partyName: "Partido Alfa", party: partyAddress, candidate: anaAddress }],
        });
        mockChain({ owner: carol, parties: [alfa()], election });
        const wallet = connectReturningUser({ accounts: [alice] });
        const user = userEvent.setup();
        renderRoute(`/elections/${electionAddress}`);

        const card = (await screen.findByRole("heading", { name: "Indicar candidato" })).closest("section")!;
        expect(await within(card).findByRole("button", { name: "Retirar indicação de Ana" })).toBeInTheDocument();
        expect(within(card).getByText(/indicado nesta eleição/)).toBeInTheDocument();

        election.candidates = [{ name: "Bia", partyName: "Partido Alfa", party: partyAddress, candidate: biaAddress }];
        await user.click(within(card).getByRole("button", { name: "Indicar Bia" }));

        await waitFor(() => expect(wallet.transactions).toHaveLength(1));
        expect(sentFactoryCall(wallet)).toMatchObject({ functionName: "nominate", args: [electionAddress, biaAddress] });
        expect(await within(card).findByRole("button", { name: "Retirar indicação de Bia" })).toBeInTheDocument();
      });

      it("should withdraw the nomination of the party", async () => {
        const election = nominationElection({
          candidates: [{ name: "Ana", partyName: "Partido Alfa", party: partyAddress, candidate: anaAddress }],
        });
        mockChain({ owner: carol, parties: [alfa()], election });
        const wallet = connectReturningUser({ accounts: [alice] });
        const user = userEvent.setup();
        renderRoute(`/elections/${electionAddress}`);

        const card = (await screen.findByRole("heading", { name: "Indicar candidato" })).closest("section")!;
        election.candidates = [];
        await user.click(await within(card).findByRole("button", { name: "Retirar indicação de Ana" }));

        await waitFor(() => expect(wallet.transactions).toHaveLength(1));
        expect(sentFactoryCall(wallet)).toMatchObject({
          functionName: "withdraw",
          args: [electionAddress, partyAddress],
        });
        expect(await screen.findByText("Nenhum candidato indicado ainda.")).toBeInTheDocument();
      });

      it("should mark a candidate held by another election as unavailable", async () => {
        mockChain({
          owner: carol,
          parties: [
            alfa({
              candidates: [
                { address: anaAddress, name: "Ana", owner: carol, heldBy: otherElection },
                { address: biaAddress, name: "Bia", owner: bob },
              ],
            }),
          ],
          election: nominationElection({ candidates: [] }),
          details: [
            {
              address: otherElection,
              votingStart: secondsFromNow(60),
              votingEnd: secondsFromNow(3_600),
            },
          ],
        });
        connectReturningUser({ accounts: [alice] });
        renderRoute(`/elections/${electionAddress}`);

        const card = (await screen.findByRole("heading", { name: "Indicar candidato" })).closest("section")!;
        expect(await within(card).findByText(/Já concorre em outra eleição\./)).toBeInTheDocument();
        expect(within(card).getByRole("button", { name: "Indicar Ana" })).toBeDisabled();
        expect(within(card).getByRole("button", { name: "Indicar Bia" })).toBeEnabled();
      });

      it("should free a candidate whose other election is already in tally", async () => {
        mockChain({
          owner: carol,
          parties: [
            alfa({ candidates: [{ address: anaAddress, name: "Ana", owner: carol, heldBy: otherElection }] }),
          ],
          election: nominationElection({ candidates: [] }),
          details: [
            {
              address: otherElection,
              votingStart: secondsFromNow(-7_200),
              votingEnd: secondsFromNow(-60),
            },
          ],
        });
        connectReturningUser({ accounts: [alice] });
        renderRoute(`/elections/${electionAddress}`);

        const card = (await screen.findByRole("heading", { name: "Indicar candidato" })).closest("section")!;
        expect(await within(card).findByRole("button", { name: "Indicar Ana" })).toBeEnabled();
        expect(within(card).queryByText(/Já concorre em outra eleição/)).not.toBeInTheDocument();
      });

      it("should say when the party has no candidates and link to the party page", async () => {
        mockChain({ owner: carol, parties: [alfa({ candidates: [] })], election: nominationElection({ candidates: [] }) });
        connectReturningUser({ accounts: [alice] });
        renderRoute(`/elections/${electionAddress}`);

        expect(await screen.findByText(/Este partido ainda não tem candidatos\./)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Criar candidato" })).toHaveAttribute(
          "href",
          `/parties/${partyAddress}`,
        );
      });
    });

    describe("doações à candidatura", () => {
      const ana = mockCandidacyAddress(electionAddress, 0);
      const oneEth = 10n ** 18n;

      function withDonations(overrides: Partial<MockElection> = {}) {
        return nominationElection({
          candidates: [
            { name: "Ana", partyName: "Partido Alfa", owner: carol, balance: oneEth },
            { name: "Bruno", partyName: "Partido Beta", owner: bob },
          ],
          ...overrides,
        });
      }

      function donateForm() {
        return screen.getByRole("heading", { name: "Doar" }).closest("section")!;
      }

      it("should send donate() with the amount to the chosen candidacy", async () => {
        mockChain({ owner: bob, election: withDonations() });
        const wallet = connectReturningUser({ accounts: [alice] });
        const user = userEvent.setup();
        renderRoute(`/elections/${electionAddress}`);

        await screen.findByRole("list", { name: "Candidatos indicados" });
        await user.type(within(donateForm()).getByLabelText("Valor em ETH"), "1,5");
        await user.click(within(donateForm()).getByRole("button", { name: "Doar" }));

        await waitFor(() => expect(wallet.transactions).toHaveLength(1));
        const [transaction] = wallet.transactions;
        expect(getAddress(transaction.to)).toBe(ana);
        expect(BigInt(transaction.value ?? 0)).toBe(1_500_000_000_000_000_000n);
        expect(decodeFunctionData({ abi: partyAbi, data: transaction.data }).functionName).toBe("donate");
      });

      it("should donate to another nominee after choosing it", async () => {
        mockChain({ owner: bob, election: withDonations() });
        const wallet = connectReturningUser({ accounts: [alice] });
        const user = userEvent.setup();
        renderRoute(`/elections/${electionAddress}`);

        await screen.findByRole("list", { name: "Candidatos indicados" });
        await user.selectOptions(screen.getByLabelText("Doar para"), "Bruno (Partido Beta)");
        await user.type(within(donateForm()).getByLabelText("Valor em ETH"), "0,1");
        await user.click(within(donateForm()).getByRole("button", { name: "Doar" }));

        await waitFor(() => expect(wallet.transactions).toHaveLength(1));
        expect(getAddress(wallet.transactions[0].to)).toBe(mockCandidacyAddress(electionAddress, 1));
      });

      it.each(["0", "abc", "0,0000000000000000001"])("should not open the wallet for the amount %s", async (amount) => {
        mockChain({ owner: bob, election: withDonations() });
        const wallet = connectReturningUser({ accounts: [alice] });
        const user = userEvent.setup();
        renderRoute(`/elections/${electionAddress}`);

        await screen.findByRole("list", { name: "Candidatos indicados" });
        await user.type(within(donateForm()).getByLabelText("Valor em ETH"), amount);
        await user.click(within(donateForm()).getByRole("button", { name: "Doar" }));

        expect(wallet.transactions).toHaveLength(0);
      });

      it("should disable donating without a wallet and still show the data", async () => {
        mockChain({ owner: bob, election: withDonations() });
        renderRoute(`/elections/${electionAddress}`);

        await screen.findByRole("list", { name: "Candidatos indicados" });
        expect(within(donateForm()).getByRole("button", { name: "Doar" })).toBeDisabled();
        expect(within(donateForm()).getByText("Conecte a carteira para doar.")).toBeInTheDocument();
        expect(await screen.findByLabelText("Saldo de Ana")).toHaveTextContent("1 ETH");
      });

      it("should show how much the active account already donated to each candidate", async () => {
        mockChain({
          owner: bob,
          election: withDonations({
            candidates: [
              { name: "Ana", partyName: "Partido Alfa", donatedBy: { [alice]: 250_000_000_000_000_000n } },
              { name: "Bruno", partyName: "Partido Beta" },
            ],
          }),
        });
        connectReturningUser({ accounts: [alice] });
        renderRoute(`/elections/${electionAddress}`);

        await waitFor(() =>
          expect(screen.getByLabelText("Você já doou a Ana")).toHaveTextContent("0,25 ETH"),
        );
        await waitFor(() =>
          expect(screen.getByLabelText("Você já doou a Bruno")).toHaveTextContent("0 ETH"),
        );
      });

      it("should let the candidate wallet withdraw and nobody else", async () => {
        mockChain({ owner: bob, election: withDonations() });
        const wallet = connectReturningUser({ accounts: [carol] });
        const user = userEvent.setup();
        renderRoute(`/elections/${electionAddress}`);

        const own = (await screen.findByRole("heading", { name: "Suas candidaturas com saldo" })).closest("section")!;
        expect(within(own).getAllByRole("heading", { name: "Sacar" })).toHaveLength(1);
        expect(within(own).getByLabelText("Destino")).toHaveValue(carol);

        await user.click(within(own).getByRole("button", { name: "Sacar tudo" }));
        await user.click(within(own).getByRole("button", { name: "Sacar" }));

        await waitFor(() => expect(wallet.transactions).toHaveLength(1));
        const call = decodeFunctionData({ abi: partyAbi, data: wallet.transactions[0].data });
        expect(getAddress(wallet.transactions[0].to)).toBe(ana);
        expect(call).toMatchObject({ functionName: "withdraw", args: [carol, oneEth] });
      });

      it("should not show the withdraw form to other accounts", async () => {
        mockChain({ owner: bob, election: withDonations() });
        connectReturningUser({ accounts: [alice] });
        renderRoute(`/elections/${electionAddress}`);

        await screen.findByRole("list", { name: "Candidatos indicados" });
        expect(screen.queryByRole("heading", { name: "Suas candidaturas com saldo" })).not.toBeInTheDocument();
      });

      it("should not open the wallet when the withdraw amount is above the balance", async () => {
        mockChain({ owner: bob, election: withDonations() });
        const wallet = connectReturningUser({ accounts: [carol] });
        const user = userEvent.setup();
        renderRoute(`/elections/${electionAddress}`);

        const own = (await screen.findByRole("heading", { name: "Suas candidaturas com saldo" })).closest("section")!;
        await user.type(within(own).getByLabelText("Valor em ETH"), "1,000000000000000001");
        await user.click(within(own).getByRole("button", { name: "Sacar" }));

        expect(wallet.transactions).toHaveLength(0);
      });

      it("should keep a withdrawn nomination with balance withdrawable by its candidate, without donating to it", async () => {
        mockChain({
          owner: bob,
          election: withDonations({
            candidates: [
              { name: "Ana", partyName: "Partido Alfa", owner: carol, balance: oneEth, active: false },
              { name: "Bruno", partyName: "Partido Beta", owner: bob },
            ],
          }),
        });
        connectReturningUser({ accounts: [carol] });
        renderRoute(`/elections/${electionAddress}`);

        const own = (await screen.findByRole("heading", { name: "Suas candidaturas com saldo" })).closest("section")!;
        expect(within(own).getByText("Indicação retirada")).toBeInTheDocument();
        // fora da lista e das doações
        expect(screen.queryByLabelText("Saldo de Ana")).not.toBeInTheDocument();
        expect(screen.queryByRole("option", { name: /Ana/ })).not.toBeInTheDocument();
      });

      it("should hide a withdrawn nomination without balance from its candidate", async () => {
        mockChain({
          owner: bob,
          election: withDonations({
            candidates: [
              { name: "Ana", partyName: "Partido Alfa", owner: carol, active: false },
              { name: "Bruno", partyName: "Partido Beta", owner: bob },
            ],
          }),
        });
        connectReturningUser({ accounts: [carol] });
        renderRoute(`/elections/${electionAddress}`);

        await screen.findByRole("list", { name: "Candidatos indicados" });
        expect(screen.queryByRole("heading", { name: "Suas candidaturas com saldo" })).not.toBeInTheDocument();
      });
    });

    it("should offer to try again when the election cannot be read", async () => {
      mockChain({ owner: bob, election: votingElection() });
      const read = vi.mocked(publicClient.readContract).getMockImplementation()!;
      vi.mocked(publicClient.readContract).mockImplementation((async (request: { functionName: string }) => {
        if (request.functionName === "candidates") {
          throw new Error("rede fora do ar");
        }

        return read(request as never);
      }) as never);
      const user = userEvent.setup();
      renderRoute(`/elections/${electionAddress}`);

      const retry = await screen.findByRole("button", { name: "Tentar de novo" }, { timeout: 15_000 });
      vi.mocked(publicClient.readContract).mockImplementation(read);
      await user.click(retry);

      expect(await screen.findByRole("list", { name: "Candidatos indicados" })).toBeInTheDocument();
    }, 20_000);
  });

  it("should show the tally after the voting ends", async () => {
    mockChain({
      owner: bob,
      election: votingElection({
        votingStart: secondsFromNow(-7_200),
        votingEnd: secondsFromNow(-60),
        tally: [3n, 1n],
        nullVotes: 1n,
        revealed: 5n,
        unrevealed: 0n,
      }),
    });
    renderRoute(`/elections/${electionAddress}`);

    expect(await screen.findByText("3 · 60%")).toBeInTheDocument();
    expect(screen.getAllByText("1 · 20%")).toHaveLength(2);
    expect(screen.getByText("Todas as cédulas foram apuradas.")).toBeInTheDocument();
    // o eleito é quem tem mais votos entre os candidatos (nulos não contam)
    expect(screen.getByText("Eleito").closest("li")).toHaveTextContent("3 · 60%");
    expect(screen.queryByRole("button", { name: "Votar" })).not.toBeInTheDocument();
  });

  it("should not trust an address the factory did not create", async () => {
    mockChain({ owner: bob });
    renderRoute(`/elections/${electionAddress}`);

    expect(await screen.findByText("Eleição não encontrada.")).toBeInTheDocument();
  });

  describe("apuração", () => {
    const salt = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as const;
    const sealed = (n: number): MockBallot => ({
      commitment: `0x${(n + 1).toString(16).padStart(64, "a")}`,
      ciphertext: `0xc1${n.toString(16).padStart(4, "0")}`,
    });

    function endedElection(overrides: Partial<MockElection> = {}): MockElection {
      return votingElection({
        votingStart: secondsFromNow(-7_200),
        votingEnd: secondsFromNow(-60),
        ...overrides,
      });
    }

    /** Cédula 0 já apurada (Bruno), 1 abre para Ana, 2 não confere com o commitment. */
    function mixedTally() {
      mockChain({
        owner: bob,
        election: endedElection({
          ballots: [{ ...sealed(0), revealedOption: 1n }, sealed(1), sealed(2)],
          tally: [0n, 1n],
          revealed: 1n,
          unrevealed: 2n,
        }),
      });
      vi.mocked(openBallots).mockResolvedValue([
        { index: 1n, status: "opened", option: 0n, salt: salt(1) },
        { index: 2n, status: "invalid" },
      ]);
    }

    it("should publish only the ballots opened here with revealBatch", async () => {
      mixedTally();
      const wallet = connectReturningUser({ accounts: [alice] });
      const user = userEvent.setup();
      renderRoute(`/elections/${electionAddress}`);

      await user.click(await screen.findByRole("button", { name: "Apurar 1 cédula(s)" }));

      await waitFor(() => expect(wallet.transactions).toHaveLength(1));
      expect(getAddress(wallet.transactions[0].to)).toBe(electionAddress);
      const call = decodeFunctionData({ abi: electionAbi, data: wallet.transactions[0].data });
      expect(call.functionName).toBe("revealBatch");
      expect(call.args).toEqual([[1n], [0n], [salt(1)]]);

      // só as fechadas no contrato vão para o tlock, com o ciphertext do evento
      const [opened] = vi.mocked(openBallots).mock.calls[0];
      expect(opened.map((ballot) => ballot.ciphertext)).toEqual([
        sealed(0).ciphertext,
        sealed(1).ciphertext,
        sealed(2).ciphertext,
      ]);
      expect(opened[0].revealedOption).toBe(1n);
    });

    it("should preview the tally without a wallet and flag invalid ballots", async () => {
      mixedTally();
      renderRoute(`/elections/${electionAddress}`);

      const preview = await screen.findByRole("list", { name: "Prévia da apuração" });
      // Bruno (já apurado) + Ana (aberta aqui): 1 de 2 cada
      expect(within(preview).getAllByText("1 · 50%")).toHaveLength(2);
      expect(screen.getByText(/1 cédula\(s\) inválida\(s\)/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Apurar/ })).not.toBeInTheDocument();

      const ballots = screen.getByRole("list", { name: "Cédulas" });
      expect(within(ballots).getByText("Apurada: Bruno")).toBeInTheDocument();
      expect(within(ballots).getByText("Aberta aqui: Ana")).toBeInTheDocument();
      expect(within(ballots).getByText("Inválida")).toBeInTheDocument();
    });

    it("should split the reveal into batches", async () => {
      const total = REVEAL_BATCH_SIZE + 1;
      mockChain({
        owner: bob,
        election: endedElection({
          ballots: Array.from({ length: total }, (_, i) => sealed(i)),
          unrevealed: BigInt(total),
        }),
      });
      vi.mocked(openBallots).mockResolvedValue(
        Array.from({ length: total }, (_, i): OpenedBallot => ({
          index: BigInt(i),
          status: "opened",
          option: BigInt(i % 2),
          salt: salt(i),
        })),
      );
      const wallet = connectReturningUser({ accounts: [alice] });
      const user = userEvent.setup();
      renderRoute(`/elections/${electionAddress}`);

      await user.click(await screen.findByRole("button", { name: `Apurar ${total} cédula(s)` }));

      await waitFor(() => expect(wallet.transactions).toHaveLength(2));
      const [first, second] = wallet.transactions.map(
        (tx) => decodeFunctionData({ abi: electionAbi, data: tx.data }).args as readonly bigint[][],
      );
      expect(first[0]).toHaveLength(REVEAL_BATCH_SIZE);
      expect(second[0]).toEqual([BigInt(REVEAL_BATCH_SIZE)]);
    });

    it("should skip ballots someone else revealed after the page loaded", async () => {
      mockChain({
        owner: bob,
        election: endedElection({
          ballots: [{ ...sealed(0), revealedMeanwhile: true }, sealed(1)],
          unrevealed: 2n,
        }),
      });
      vi.mocked(openBallots).mockResolvedValue([
        { index: 0n, status: "opened", option: 0n, salt: salt(0) },
        { index: 1n, status: "opened", option: 1n, salt: salt(1) },
      ]);
      const wallet = connectReturningUser({ accounts: [alice] });
      const user = userEvent.setup();
      renderRoute(`/elections/${electionAddress}`);

      await user.click(await screen.findByRole("button", { name: "Apurar 2 cédula(s)" }));

      await waitFor(() => expect(wallet.transactions).toHaveLength(1));
      const call = decodeFunctionData({ abi: electionAbi, data: wallet.transactions[0].data });
      expect(call.args).toEqual([[1n], [1n], [salt(1)]]);
    });

    it("should say when ballots wait for the drand round", async () => {
      mockChain({ owner: bob, election: endedElection({ ballots: [sealed(0)], unrevealed: 1n }) });
      vi.mocked(openBallots).mockResolvedValue([
        { index: 0n, status: "too-early", availableAt: Date.now() + 60 * 60_000 },
      ]);
      renderRoute(`/elections/${electionAddress}`);

      expect(await screen.findByText(/aguardando a rodada do drand/)).toBeInTheDocument();
      expect(screen.getByText("Aguardando o drand")).toBeInTheDocument();
    });

    it("should keep ballots sealed while voting is open", async () => {
      mockChain({ owner: bob, election: votingElection({ ballots: [sealed(0)] }) });
      renderRoute(`/elections/${electionAddress}`);

      const ballots = await screen.findByRole("list", { name: "Cédulas" });
      expect(within(ballots).getByText("Selada")).toBeInTheDocument();
      expect(openBallots).not.toHaveBeenCalled();
    });

    it("should reread the tally when the election emits an event", async () => {
      mockChain({ owner: bob, election: endedElection({ tally: [1n, 0n], revealed: 1n }) });
      renderRoute(`/elections/${electionAddress}`);

      await screen.findByText("Todas as cédulas foram apuradas.");
      await waitFor(() => expect(publicClient.watchContractEvent).toHaveBeenCalled());
      const [{ address, onLogs }] = vi.mocked(publicClient.watchContractEvent).mock.calls[0] as unknown as [
        { address: Address; onLogs: (logs: { blockNumber: bigint }[]) => void },
      ];
      expect(address).toBe(electionAddress);

      const resultReads = () =>
        vi.mocked(publicClient.readContract).mock.calls.filter(
          ([call]) => (call as { functionName: string }).functionName === "results",
        ).length;
      const before = resultReads();
      onLogs([{ blockNumber: 20n }]);

      await waitFor(() => expect(resultReads()).toBeGreaterThan(before));
    });
  });
});
