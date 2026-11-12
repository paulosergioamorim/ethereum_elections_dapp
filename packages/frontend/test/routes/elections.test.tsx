import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Address } from "viem";
import { describe, expect, it } from "vitest";
import { mockChain, secondsFromNow } from "../helpers/mock-chain";
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
    mockChain({ owner: bob, elections: [first, second] });
    renderRoute("/");

    const links = await screen.findAllByRole("link", { name: /#\d/ });

    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      `/elections/${second}`,
      `/elections/${first}`,
    ]);
    expect(links[0]).toHaveTextContent("#2");
  });

  it("should count the elections in the stat card", async () => {
    mockChain({ owner: bob, elections: [first, second] });
    renderRoute("/");

    expect(await screen.findByText("2")).toBeInTheDocument();
  });

  it("should show the registration status of the active account", async () => {
    mockChain({ owner: bob, voters: [{ address: alice, commitment: 1n }] });
    connectReturningUser({ accounts: [alice] });
    renderRoute("/");

    const situation = screen.getByRole("group", { name: "Sua situação" });

    expect(await within(situation).findByText("Registrado")).toBeInTheDocument();
  });

  describe("busca", () => {
    function twoElections() {
      mockChain({
        owner: bob,
        elections: [first, second],
        details: [
          {
            address: first,
            title: "Representante da turma",
            votingStart: secondsFromNow(-7_200),
            votingEnd: secondsFromNow(-60),
          },
          {
            address: second,
            title: "Eleição do grêmio",
            votingStart: secondsFromNow(-60),
            votingEnd: secondsFromNow(3_600),
          },
        ],
      });
    }

    async function electionLinks() {
      return (await screen.findAllByRole("link", { name: /#\d/ })).map((link) =>
        link.getAttribute("href"),
      );
    }

    it("should show each election with its title and phase", async () => {
      twoElections();
      renderRoute("/");

      const link = await screen.findByRole("link", { name: /Eleição do grêmio/ });
      expect(within(link).getByText("Em votação")).toBeInTheDocument();
      expect(
        within(screen.getByRole("link", { name: /Representante da turma/ })).getByText("Em apuração"),
      ).toBeInTheDocument();
    });

    it("should filter by title, ignoring case and accents", async () => {
      twoElections();
      const user = userEvent.setup();
      renderRoute("/");
      await screen.findByRole("link", { name: /Eleição do grêmio/ });

      await user.type(screen.getByRole("searchbox", { name: "Buscar eleição" }), "GREMIO");

      expect(await electionLinks()).toEqual([`/elections/${second}`]);
    });

    it("should filter by number and by address", async () => {
      twoElections();
      const user = userEvent.setup();
      renderRoute("/");
      const search = await screen.findByRole("searchbox", { name: "Buscar eleição" });
      await screen.findByRole("link", { name: /Representante da turma/ });

      await user.type(search, "#1");
      expect(await electionLinks()).toEqual([`/elections/${first}`]);

      await user.clear(search);
      await user.type(search, second.slice(2, 10).toLowerCase());
      expect(await electionLinks()).toEqual([`/elections/${second}`]);
    });

    it("should say when nothing matches", async () => {
      twoElections();
      const user = userEvent.setup();
      renderRoute("/");
      await screen.findByRole("link", { name: /Representante da turma/ });

      await user.type(screen.getByRole("searchbox", { name: "Buscar eleição" }), "prefeito");

      expect(await screen.findByText("Nenhuma eleição encontrada.")).toBeInTheDocument();
    });
  });
});
