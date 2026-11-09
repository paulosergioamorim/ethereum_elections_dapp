import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { journey, technologies } from "@/about";
import { factoryAddress } from "@/contracts";
import { mockChain } from "../helpers/mock-chain";
import { bob } from "../helpers/mock-wallet";
import { renderRoute } from "../helpers/render";

const semaphore = "0x0000000000000000000000000000000000005e3a";

describe("About (página Sobre)", () => {
  it("should be reachable from the main navigation", async () => {
    renderRoute("/");

    const nav = await screen.findByRole("navigation", { name: "Principal" });
    expect(within(nav).getByRole("link", { name: "Sobre" })).toHaveAttribute("href", "/about");
  });

  it("should explain each technology with links to its documentation", async () => {
    renderRoute("/about");

    expect(
      await screen.findByRole("heading", { level: 1, name: "As tecnologias por trás do voto" }),
    ).toBeInTheDocument();

    for (const technology of technologies) {
      const card = screen.getByRole("heading", { level: 2, name: technology.title }).closest("section")!;
      expect(card).toHaveAttribute("id", technology.id);

      const links = within(card).getAllByRole("link", { name: /abre em nova aba/ });
      expect(links.map((link) => link.getAttribute("href"))).toEqual(
        technology.docs.map((doc) => doc.href),
      );

      for (const link of links) {
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noreferrer");
      }
    }
  });

  it("should point each journey shortcut to a card on the page", async () => {
    const { container } = renderRoute("/about");
    await screen.findByRole("heading", { name: "O caminho de um voto" });

    for (const step of journey) {
      const shortcuts = within(
        screen.getByRole("list", { name: `Tecnologias da etapa ${step.title}` }),
      ).getAllByRole("link");

      for (const shortcut of shortcuts) {
        const target = shortcut.getAttribute("href")!.slice(1);
        expect(container.querySelector(`#${target}`), target).not.toBeNull();
      }
    }
  });

  it("should show the real contracts of this deployment, with explorer links", async () => {
    mockChain({ owner: bob });
    renderRoute("/about");

    const deployment = (
      await screen.findByRole("heading", { level: 2, name: "Nesta implantação" })
    ).closest("section")!;

    expect(within(deployment).getByText(/Sepolia · chain ID 11155111/)).toBeInTheDocument();
    expect(
      within(deployment).getByText(factoryAddress).closest("a"),
    ).toHaveAttribute("href", `https://sepolia.etherscan.io/address/${factoryAddress}`);
    expect(await within(deployment).findByText(bob)).toBeInTheDocument();
    expect(within(deployment).getByText(semaphore)).toBeInTheDocument();
    expect(within(deployment).getByText("Grupo nº 1 do Semaphore")).toBeInTheDocument();
    // os testes simulam um RPC com WebSocket (test/setup.ts)
    expect(within(deployment).getByText(/Ativos, por WebSocket/)).toBeInTheDocument();
  });

  it("should state the known limitations, starting with who sends the vote", async () => {
    renderRoute("/about");

    const limits = (
      await screen.findByRole("heading", { level: 2, name: "Premissas e limitações" })
    ).closest("section")!;
    const titles = within(limits)
      .getAllByRole("listitem")
      .map((item) => item.querySelector("p")?.textContent);

    expect(titles[0]).toBe("O voto sai da carteira do eleitor.");
    expect(within(limits).getByRole("link", { name: /MACI/ })).toHaveAttribute(
      "href",
      "https://maci.pse.dev/",
    );
  });
});
