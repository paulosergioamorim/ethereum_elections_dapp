# Review: Party

> Stale: written against the `new Party` + constructor shape. The spec now requires an EIP-1167 clone with `initialize` (criteria renumbered to 1-19), so this review must be redone after the rebuild.

Verdict: the request and criteria 1-16 are implemented correctly. `pnpm test:contracts` passes (115: 85 Solidity, 30 Node). One test is weak (criterion 8) and there are two minor notes. No screens, so no capture comparison. I did not mutate the code and changed no data.

## Request, sentence by sentence
- "contrato Partido (Party)": `contracts/Party.sol`. Done.
- "presidente (Ownable2Step)": `Party is IDonatable, Ownable2Step`, constructor `Ownable(president)`. Done.
- "criado pelo ElectionFactory": `createParty` is `onlyOwner`, does `new Party`, records it in `_parties` and `isParty`, and emits `PartyCreated`. Done.
- "usuários poderão realizar doações": `donate()` payable, open to anyone, with no `receive` or `fallback`. Done.
- "presidente pode resgatar o dinheiro": `withdraw(to, amount)` is `onlyOwner`. Done.
- "método de doação abstraído em classe ou interface abstrata": `IDonatable` declares `donate`, `Donated` and `ZeroDonation`. Done.

## Criteria vs tests
Would the test fail if the rule were wrong? Judged by reading, no mutation run.
- 1: yes. `ElectionFactoryCreatePartyTest` checks `owner`, `name`, `parties()`, `isParty`, and the emitted address (via `computeCreateAddress`).
- 2: yes (fuzzed non-owner). 3: yes. 4: yes.
- 5: yes. It checks `donatedBy`, the balance, the accumulation of 1 and 2 ETH, and the `Donated` event with a fuzzed amount.
- 6: yes. 7: yes (plain transfer and unknown calldata; the latter also asserts balance 0).
- 8: WEAK, see problem 1.
- 9: yes. Partial, full and zero amounts, the event, and `donatedBy` unchanged are all covered.
- 10: yes (fuzzed). 11: yes (balance+1, with the exact args). 12: yes.
- 13: yes for the revert. The "balance unchanged" assertion is implied by the revert, so it adds little.
- 14: yes. 15: yes (it also checks that the new president can withdraw). 16: yes.

## Problems
1. Low. Criterion 8 ("Party SHALL implement IDonatable") is not really tested. `test_shouldImplementIDonatable` casts `address(party)` to `IDonatable` and calls `donate()`. That passes even if `Party` stops inheriting `IDonatable`, because the selector matches. The tests also take the `Donated` and `ZeroDonation` names from `IDonatable`, and their signatures are the same either way. The inheritance is only enforced by the compiler through `is IDonatable`, and removing it would break no test. Possible fix: assert on `type(IDonatable).interfaceId` through an ERC-165 check, or accept this as compile-time enforced.
2. Info. The fuzzed `test_shouldRevertWithOnlyOwner` in the withdraw tests does not exclude the test contract or the zero address. That is harmless, since any non-president is expected to revert.
3. Info. `withdraw` sends ETH with `call` and no reentrancy guard. It is safe: only the president can call it, it holds no state to corrupt, and the event is emitted after the transfer. This needs no change.

## Not checked or out of scope
- Frontend, ABI export and Ignition: out of scope in the plan, and unchanged in the diff.
- Deployed size of the factory is about 12.4 KB unoptimised, under the 24 KB limit.
- Spec assumptions (non-clone, zero withdraw allowed, renounce disabled) match the code.
