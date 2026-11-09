import { zeroAddress } from "viem";
import { describe, expect, it } from "vitest";
import { parseVoterAddresses } from "@/authority/parse-voter-addresses";
import { alice, bob, carol } from "../helpers/mock-wallet";

describe("parseVoterAddresses", () => {
  it("should accept addresses separated by lines, commas, semicolons and spaces", () => {
    const parsed = parseVoterAddresses(`${alice}\n${bob}, ${carol};`, []);

    expect(parsed.toAuthorize).toEqual([alice, bob, carol]);
  });

  it("should checksum lowercase addresses and drop repetitions", () => {
    const parsed = parseVoterAddresses(`${alice.toLowerCase()} ${alice}`, []);

    expect(parsed.toAuthorize).toEqual([alice]);
  });

  it("should separate wallets that are already authorized", () => {
    const parsed = parseVoterAddresses(`${alice} ${bob}`, [bob]);

    expect(parsed.toAuthorize).toEqual([alice]);
    expect(parsed.alreadyAuthorized).toEqual([bob]);
  });

  it("should flag invalid text, wrong checksums and the zero address", () => {
    const wrongChecksum = alice.replace("C8", "c8");

    const parsed = parseVoterAddresses(`0x123 ${wrongChecksum} ${zeroAddress}`, []);

    expect(parsed.toAuthorize).toEqual([]);
    expect(parsed.invalid).toEqual(["0x123", wrongChecksum, zeroAddress]);
  });
});
