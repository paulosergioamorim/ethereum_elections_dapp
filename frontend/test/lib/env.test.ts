import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const valid = {
  VITE_CHAIN_ID: "11155111",
  VITE_RPC_HTTP_URL: "https://sepolia.infura.io/v3/chave",
  VITE_RPC_WS_URL: "wss://sepolia.infura.io/ws/v3/chave",
  VITE_FACTORY_ADDRESS: "0xd3116C4f166f8CDA5f90fAEEB03FE8E8D7eD139C",
  VITE_FACTORY_DEPLOY_BLOCK: "12093709",
};

describe("parseEnv", () => {
  it("should convert a valid configuration", () => {
    expect(parseEnv(valid)).toEqual({
      chainId: 11155111,
      rpcHttpUrl: "https://sepolia.infura.io/v3/chave",
      rpcWsUrl: "wss://sepolia.infura.io/ws/v3/chave",
      factoryAddress: "0xd3116C4f166f8CDA5f90fAEEB03FE8E8D7eD139C",
      factoryDeployBlock: 12093709n,
    });
  });

  it("should search events from block 0 when the deploy block is not set", () => {
    expect(parseEnv({ ...valid, VITE_FACTORY_DEPLOY_BLOCK: "" }).factoryDeployBlock).toBe(0n);
  });

  it("should reject a deploy block that is not a number", () => {
    expect(() => parseEnv({ ...valid, VITE_FACTORY_DEPLOY_BLOCK: "12.093.709" })).toThrow(
      /VITE_FACTORY_DEPLOY_BLOCK/,
    );
  });

  it("should treat empty RPC URLs as not configured", () => {
    const env = parseEnv({ ...valid, VITE_RPC_HTTP_URL: "", VITE_RPC_WS_URL: "  " });

    expect(env.rpcHttpUrl).toBeUndefined();
    expect(env.rpcWsUrl).toBeUndefined();
  });

  it("should checksum a lowercase factory address", () => {
    const env = parseEnv({ ...valid, VITE_FACTORY_ADDRESS: valid.VITE_FACTORY_ADDRESS.toLowerCase() });

    expect(env.factoryAddress).toBe(valid.VITE_FACTORY_ADDRESS);
  });

  it("should reject a missing chain id", () => {
    expect(() => parseEnv({ ...valid, VITE_CHAIN_ID: undefined })).toThrow(/VITE_CHAIN_ID/);
  });

  it("should reject a missing factory address", () => {
    expect(() => parseEnv({ ...valid, VITE_FACTORY_ADDRESS: "" })).toThrow(/VITE_FACTORY_ADDRESS/);
  });

  it("should reject a factory address with a wrong checksum", () => {
    // última letra trocada de maiúscula para minúscula: o checksum deixa de bater
    const typo = valid.VITE_FACTORY_ADDRESS.replace(/C$/, "c");

    expect(() => parseEnv({ ...valid, VITE_FACTORY_ADDRESS: typo })).toThrow(/VITE_FACTORY_ADDRESS/);
  });

  it("should reject an HTTP URL in the WebSocket variable", () => {
    expect(() => parseEnv({ ...valid, VITE_RPC_WS_URL: valid.VITE_RPC_HTTP_URL })).toThrow(
      /VITE_RPC_WS_URL/,
    );
  });
});
