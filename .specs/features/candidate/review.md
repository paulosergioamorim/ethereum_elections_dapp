# Review: candidate (commits after 77dd03b)

## Verdict

Complete and correct against the request and criteria 1-32. No blocking problem. Four small findings, none changes behavior the user asked for.

Run: `pnpm contracts:test` 142 passing (112 Solidity, 30 TS); `pnpm frontend:test` 271 passing; `pnpm frontend:build` ok. Contract sizes are well under the EIP-170 limit (ElectionFactory 7659 B, Party 6127 B, Candidate 4752 B).

## Request, sentence by sentence

- "crie o contrato e o frontend para o Candidate": `Candidate.sol` (+ shared `DonationHolder.sol`), party page section, `/candidates/:address`. Done.
- "o partido cria o candidato", president only: `Party.createCandidate` is `onlyOwner`. Done.
- Fields name + wallet, no number: `initialize(candidate, name, party)`; no number anywhere. Done.
- "também pode receber doações": `Candidate` is `IDonatable` via `DonationHolder`. Done.
- No election link: untouched. Done.
- Candidate's own wallet withdraws: owner = wallet; the president gets `OwnableUnauthorizedAccount` (tested). Done.
- Screens party page + candidate page: done.
- Follow-up, Clones + initialize like Election and Party: `Clones.clone(_candidateBase)` + `initialize`, `_candidateBase` is an `immutable` (correct for a Party that is itself a clone), implementation locked by `_disableInitializers()`. Done. `request.md` still lists the superseded "new Candidate" and "name + number" lines under Answers, but each is annotated as replaced; harmless.

## Browser check (Chromium via playwright-core, 1280px and 360px; Firefox/Playwright MCP not available; no captures exist)

Local Hardhat node + freshly deployed factory, test wallet injected. Exercised and observed:
- No wallet: no create form. Non-president account: no form. President: form shown (criterion 13).
- Invalid wallet "0x123" -> "Informe um endereço válido."; whitespace name -> "Informe o nome do candidato."; zero address -> "O endereço zero não é permitido."; block number unchanged, wallet not opened (15).
- Create -> toast "Candidato criado.", row appears with name, shortened wallet, balance, link (10, 14). Duplicate wallet+name accepted (7).
- Candidate page: name, party link, wallet, balance, "Você já doou"; president sees no "Sacar"; donor sees none (17, 30).
- Donate "0,5" -> balance and "Você já doou" 0,5 ETH; "0" -> "O valor precisa ser maior que zero." (22). Without wallet the button is disabled with "Conecte a carteira para doar." and data stays (23).
- Owner wallet sees "Sacar" with destination prefilled with own address; "Sacar tudo" fills 0.5; withdraw -> balance 0 ETH (30, 31).
- Not-found screen, no donate form, for "nope", an unrelated address and the party's own address (18).
- 360px: no horizontal overflow on candidate or party page; layout fine.
Not exercised in the browser: the contract-revert toasts for InvalidCandidate/EmptyCandidateName (the form blocks both first; covered by vitest), wrong-chain state, empty/error states of the list (covered by vitest).

## Rule-by-rule: would the test fail if the rule were wrong?

Solidity (`PartyCreateCandidateTest`, `CandidateDonateTest`, `CandidateWithdrawTest`):
- 1 create: asserts owner, name, party, list, isCandidate, event emitter/topic/arg. Yes. (`isCandidate(wallet)` false also checked.)
- 2 non-president: fuzzed sender, exact error + arg. Yes.
- 3, 4: exact selectors through `createCandidate`. Yes.
- 5 re-init and locked implementation: second `initialize` reverts and fields unchanged; implementation address read from clone bytecode and its `initialize` reverts. Yes.
- 6 isolation: distinct addresses, separate owners, balance and `donatedBy` not shared. Yes (does not assert `a != implementation` directly, but the implementation lock test covers it indirectly).
- 7 duplicates: yes.
- 8 Party unchanged: the existing Party tests only changed the qualifier (`Party.X` -> `DonationHolder.X`); assertions intact.
- 19-21 donate: 1 wei, accumulation, fuzzed event, ZeroDonation, plain transfer and unknown calldata revert. Yes.
- 24-29 withdraw: partial (balance, remainder, `donatedBy` unchanged, event), full, zero, fuzzed non-owner, president, balance+1 with args, zero recipient, rejecting recipient with balance unchanged, renounce disabled with owner unchanged. Yes.

Frontend (vitest):
- 9: `abis.test.ts` names the functions/event. Yes.
- 10, 11, 12: party.test lists newest first with name, wallet, balance, href; empty state; error + retry then recovery. Yes.
- 13: form shown to president only; tested for another account and no wallet. Yes.
- 14: asserts `createCandidate` call args (name trimmed) and the new row. Yes.
- 15: forms.test and party.test cover bad address, zero, empty and whitespace name, and assert zero transactions. Yes.
- 16: `errors.test` decodes both errors raised by Candidate through a Party-ABI revert and checks the Portuguese text. Yes; it would fail if `candidateAbi` were dropped from `contractErrorName`.
- 17, 18: candidate.test covers display, "Você já doou", non-address, unlisted contract, and a forged `party()` (both a non-factory party and a real party that does not list it). Yes.
- 22, 23: donate call `to`/value, refreshed totals, invalid amounts, disabled without wallet. Yes.
- 30-32: form visible only to owner (president, other, none tested), destination default, call args, "Sacar tudo", five invalid cases with no transaction. Yes.

## Findings

1. Minor, test gap: `Party.createCandidate` for the same wallet in two different parties, and `Candidate.party` being the creating party, are covered; but nothing asserts that `createCandidate` on a party clone works when the party is created through `ElectionFactory.createParty` (tests build Party with `Clones.clone(new Party())` by hand). My browser run did this path end to end (factory-created party, then candidate), so behavior is right; only the automated test is missing.
2. Minor, robustness: `Candidate.initialize` does not reject `party == address(0)`. Only `Party` calls it and always passes `address(this)`, and nothing in the criteria asks for it, so no action needed unless the user wants a defensive check.
3. Minor, shared copy: `useDonate`/`useWithdraw` still simulate with `partyAbi` for candidate targets (`hooks.ts`). Works because the signatures are identical and errors decode through both ABIs, but it reads as a party-only call. Cosmetic.
4. Process note (mine, not the feature): while reviewing, a Hardhat node and a Vite server were already running when I started, contrary to the brief; my `pnpm contracts:deploy:local` deployed a new factory on that shared node and overwrote the git-ignored `packages/frontend/.env.e2e`. I restored the file to its previous values (factory 0xcf7e...fb0fc9, block 4). The extra factory and one test party "Alfa" with three candidates remain on that local node (not repo data). I left the node running and stopped the dev server I started.
