import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useWalletProviders } from "@/wallet";
import { alice, createMockWallet, type MockWallet } from "../helpers/mock-wallet";

describe("useWalletProviders (EIP-6963)", () => {
  it("should list a wallet announced before the first render", () => {
    const mock = createMockWallet({ accounts: [alice] });

    const { result } = renderHook(() => useWalletProviders());

    expect(result.current).toContain(mock.detail);
  });

  it("should add a wallet announced after the first render", () => {
    const { result } = renderHook(() => useWalletProviders());

    let mock!: MockWallet;
    act(() => {
      mock = createMockWallet({ accounts: [alice] });
    });

    expect(result.current).toContain(mock.detail);
  });

  it("should ignore repeated announcements of the same wallet", () => {
    const mock = createMockWallet({ accounts: [alice] });
    const { result } = renderHook(() => useWalletProviders());

    act(() => mock.announce());

    expect(result.current.filter((wallet) => wallet === mock.detail)).toHaveLength(1);
  });
});
