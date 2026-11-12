import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { decodeFunctionData, getAddress, type Address } from "viem";
import { describe, expect, it, vi } from "vitest";
import { electionAbi } from "@/contracts";
import { REVEAL_BATCH_SIZE, type OpenedBallot } from "@/elections";
import { openBallots } from "@/elections/tally-crypto";
import { prepareVote } from "@/elections/vote-crypto";
import { publicClient } from "@/lib/chain";
import { shortAddress } from "@/lib/format";
import { logRetry } from "@/lib/logs";
import {
  mockChain,
  secondsFromNow,
  type MockBallot,
  type MockElection,
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
