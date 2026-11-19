import { fileURLToPath, URL } from "node:url";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { defineConfig } from "vitest/config";

// tlock-js usa o Buffer do Node, na página e nos Workers
const bufferPolyfill = () => nodePolyfills({ include: ["buffer"], globals: { Buffer: true } });

export default defineConfig({
  // GitHub Pages serve o app num subcaminho (/<repo>/); o workflow define VITE_BASE
  base: process.env.VITE_BASE ?? "/",
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    bufferPolyfill(),
  ],
  // os Workers (tlock e prova Semaphore) têm pipeline de plugins próprio
  worker: {
    format: "es",
    plugins: () => [bufferPolyfill()],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
    setupFiles: ["./test/setup.ts"],
    css: false,
    // O Node 25+ tem `localStorage` global próprio (sem arquivo, vale `undefined`) e ele encobre
    // o do jsdom. Desligado, os testes usam o localStorage do jsdom, como o navegador.
    execArgv: ["--no-experimental-webstorage"],
    // configuração fixa nos testes, independente do .env.local de quem roda
    env: {
      VITE_CHAIN_ID: "11155111",
      VITE_RPC_HTTP_URL: "",
      VITE_RPC_WS_URL: "",
      VITE_FACTORY_ADDRESS: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      VITE_FACTORY_DEPLOY_BLOCK: "0",
    },
  },
});
