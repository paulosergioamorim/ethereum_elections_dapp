import { screen, within } from "@testing-library/react";
import type { Address } from "viem";
import { describe, expect, it, vi } from "vitest";
import { publicClient } from "@/lib/chain";
import { mockChain } from "../helpers/mock-chain";
import { alice, bob, connectReturningUser } from "../helpers/mock-wallet";
import { renderRoute } from "../helpers/render";

const first: Address = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const second: Address = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

describe("Elections", () => {
  it("should show the empty state when the factory has no elections", async () => {
    renderRoute("/");

    expect(await screen.findByText("As eleições aparecem por aqui.")).toBeInTheDocument();
  });

  it("should list the factory elections, newest first, with links", async () => {
    vi.mocked(publicClient.readContract).mockResolvedValueOnce([first, second] as never);
    renderRoute("/");

    const links = await screen.findAllByRole("link", { name: /eleição #/i });

    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      `/elections/${second}`,
      `/elections/${first}`,
    ]);
    expect(links[0]).toHaveTextContent("Eleição #2");
  });

  it("should count the elections in the stat card", async () => {
    vi.mocked(publicClient.readContract).mockResolvedValueOnce([first, second] as never);
    renderRoute("/");

    expect(await screen.findByText("2")).toBeInTheDocument();
  });

  it("should show the registration status of the active account", async () => {
    mockChain({ owner: bob, voters: [{ address: alice, commitment: 1n }] });
    connectReturningUser({ accounts: [alice] });
    renderRoute("/");

    const situation = screen.getByRole("group", { name: "Sua situação" });

    expect(await within(situation).findByText("Cadastrado")).toBeInTheDocument();
  });
});
