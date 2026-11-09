import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { decodeFunctionData, getAddress, type Address } from "viem";
import { describe, expect, it, vi } from "vitest";
import { electionAbi } from "@/contracts";
import { prepareVote } from "@/elections/vote-crypto";
import { mockChain, secondsFromNow, type MockElection } from "../helpers/mock-chain";
import { alice, bob, connectReturningUser, testIdentity } from "../helpers/mock-wallet";
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

/** Alice cadastrada antes da criação da eleição, com a identidade que a carteira dela gera. */
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
      await screen.findByText(/se cadastrou depois da criação desta eleição/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Votar" })).toBeDisabled();
    expect(wallet.calls).not.toContain("personal_sign");
  });

  it("should point unregistered accounts to the registration page", async () => {
    mockChain({ owner: bob, voters: [{ address: alice }], election: votingElection() });
    connectReturningUser({ accounts: [alice] });
    renderRoute(`/elections/${electionAddress}`);

    expect(await screen.findByText(/ainda não se cadastrou como eleitora/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fazer o cadastro" })).toHaveAttribute(
      "href",
      "/register",
    );
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
    expect(screen.queryByRole("button", { name: "Votar" })).not.toBeInTheDocument();
  });

  it("should not trust an address the factory did not create", async () => {
    mockChain({ owner: bob });
    renderRoute(`/elections/${electionAddress}`);

    expect(await screen.findByText("Eleição não encontrada.")).toBeInTheDocument();
  });
});
