import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "../helpers/render";

// Nenhum teste deste arquivo cria carteira falsa: o navegador "não tem carteira instalada".
describe("RootLayout", () => {
  it("should render the main navigation", async () => {
    renderRoute("/");

    const nav = await screen.findByRole("navigation", { name: "Principal" });
    expect(nav).toHaveTextContent("Eleições");
    expect(nav).toHaveTextContent("Cadastro");
    expect(nav).toHaveTextContent("Autoridade");
  });

  it("should show the app network and the latest block in the header", async () => {
    renderRoute("/");

    const header = await screen.findByRole("banner");
    expect(await within(header).findByText(/7\.000\.000/)).toBeInTheDocument();
    expect(header).toHaveTextContent("Sepolia");
  });

  it("should offer to install a wallet when none is found", async () => {
    renderRoute("/");

    const header = await screen.findByRole("banner");
    expect(within(header).getByRole("link", { name: /instalar carteira/i })).toHaveAttribute(
      "href",
      "https://metamask.io/download/",
    );
  });

  it("should invite to connect on pages that send transactions", async () => {
    renderRoute("/register");

    expect(await screen.findByText(/conecte a carteira autorizada/i)).toBeInTheDocument();
  });

  it("should show not found for an invalid election address", async () => {
    renderRoute("/elections/0x123");

    expect(await screen.findByText("Página não encontrada")).toBeInTheDocument();
  });

  it("should show not found for an unknown path", async () => {
    renderRoute("/nao-existe");

    expect(await screen.findByText("Página não encontrada")).toBeInTheDocument();
  });
});
