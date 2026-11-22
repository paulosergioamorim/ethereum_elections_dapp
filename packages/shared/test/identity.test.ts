import { describe, expect, it } from "vitest";
import { deriveIdentity, identityMessage } from "../identity.js";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

describe("shared/identity", () => {
  const factory = "0x123";
  const chainId = 123;
  const message = identityMessage(chainId, factory);

  // deriveIdentity(sig).commitment == deriveIdentity(sig).commitment
  it("should derive the same identity from the same signature", async () => {
    const account = privateKeyToAccount(generatePrivateKey());

    const sig1 = await account.signMessage({ message });
    const sig2 = await account.signMessage({ message });

    expect(deriveIdentity(sig1).commitment).toBe(deriveIdentity(sig2).commitment);
  });

  // assinaturas diferentes → commitments diferentes
  it("should derive different identities from different signatures", async () => {
    const a1 = privateKeyToAccount(generatePrivateKey());
    const a2 = privateKeyToAccount(generatePrivateKey());

    const sig1 = await a1.signMessage({ message });
    const sig2 = await a2.signMessage({ message });

    expect(deriveIdentity(sig1).commitment).not.toBe(deriveIdentity(sig2).commitment);
  });

  // identityMessage muda com chainId e com a factory (a mesma carteira tem identidades diferentes por implantação)
  it("should bind the message to the chain id and the factory", () => {
    expect(identityMessage(456, factory)).not.toBe(message);   // só o chainId mudou
    expect(identityMessage(chainId, "0x456")).not.toBe(message); // só a factory mudou
  });
});
