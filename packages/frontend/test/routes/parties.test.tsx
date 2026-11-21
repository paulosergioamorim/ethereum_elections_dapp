import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { publicClient } from "@/lib/chain";
import { shortAddress } from "@/lib/format";
import { mockChain, type MockParty } from "../helpers/mock-chain";
import { alice, bob, carol } from "../helpers/mock-wallet";
import { renderRoute } from "../helpers/render";

const pt: MockParty = { address: alice, name: "PT", owner: bob, balance: 1_500_000_000_000_000_000n };
const verde: MockParty = { address: carol, name: "Partido Verde", owner: alice };

async function partyLinks() {
  return (await screen.findAllByRole("link", { name: /Presidente/ })).map((link) =>
    link.getAttribute("href"),
  );
}

describe("Parties (aba Partidos)", () => {
  it("should be reachable from the header for everyone, without a wallet", async () => {
    mockChain({ owner: bob, parties: [pt] });
    renderRoute("/");

    const nav = screen.getByRole("navigation", { name: "Principal" });
    await userEvent.setup().click(within(nav).getByRole("link", { name: "Partidos" }));

    expect(await screen.findByRole("link", { name: /PT/ })).toBeInTheDocument();
  });

  it("should list one row per party, newest first, with name, president, balance and link", async () => {
    mockChain({ owner: bob, parties: [pt, verde] });
    renderRoute("/parties");

    expect(await partyLinks()).toEqual([`/parties/${carol}`, `/parties/${alice}`]);

    const row = screen.getByRole("link", { name: /PT/ });
    expect(within(row).getByText("PT")).toBeInTheDocument();
    expect(within(row).getByText(shortAddress(bob))).toBeInTheDocument();
    expect(await within(row).findByText("1,5 ETH")).toBeInTheDocument();
  });

  it("should show the empty state when there are no parties", async () => {
    mockChain({ owner: bob });
    renderRoute("/parties");

    expect(await screen.findByText("Nenhum partido criado ainda.")).toBeInTheDocument();
  });

  describe("busca", () => {
    it("should filter by name, ignoring case", async () => {
      mockChain({ owner: bob, parties: [pt, verde] });
      const user = userEvent.setup();
      renderRoute("/parties");
      await screen.findByRole("link", { name: /Partido Verde/ });

      await user.type(screen.getByRole("searchbox", { name: "Buscar partido" }), "VERDE");

      expect(await partyLinks()).toEqual([`/parties/${carol}`]);
    });

    it("should filter by the president address", async () => {
      mockChain({ owner: bob, parties: [pt, verde] });
      const user = userEvent.setup();
      renderRoute("/parties");
      await screen.findByRole("link", { name: /Partido Verde/ });

      await user.type(screen.getByRole("searchbox", { name: "Buscar partido" }), bob.slice(2, 12));

      expect(await partyLinks()).toEqual([`/parties/${alice}`]);
    });

    it("should say when nothing matches", async () => {
      mockChain({ owner: bob, parties: [pt] });
      const user = userEvent.setup();
      renderRoute("/parties");
      await screen.findByRole("link", { name: /PT/ });

      await user.type(screen.getByRole("searchbox", { name: "Buscar partido" }), "prefeito");

      expect(await screen.findByText("Nenhum partido encontrado.")).toBeInTheDocument();
    });
  });

  it("should show an error with a retry button when the list cannot be read", async () => {
    mockChain({ owner: bob, parties: [pt] });
    const read = vi.mocked(publicClient.readContract).getMockImplementation()!;
    vi.mocked(publicClient.readContract).mockImplementation(((parameters: { functionName: string }) =>
      parameters.functionName === "parties"
        ? Promise.reject(new Error("rede fora do ar"))
        : read(parameters as never)) as never);
    const user = userEvent.setup();
    renderRoute("/parties");

    expect(await screen.findByText("Não foi possível carregar os partidos.")).toBeInTheDocument();

    vi.mocked(publicClient.readContract).mockImplementation(read);
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(await screen.findByRole("link", { name: /PT/ })).toBeInTheDocument();
  });
});
