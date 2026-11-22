# Review: form library

Range: 2edbfc5..HEAD (4 commits, S1-S4) plus the uncommitted plan.md change (only "Review: sent at 8c9813b").

## Verdict

Mostly done and correct. All seven forms use `react-hook-form` + valibot, behave in the real app as the criteria say, `use-form-state.ts` is gone, and tests/build pass. Two real gaps: the request's "evaluate" is only answered inside the plan, and several criteria have no test that would fail if the rule broke (wrong-chain/pending, withdraw clear-amount/keep-destination, authorize flow, most "clear error on edit").

## Request, sentence by sentence

1. "esse hook trata todos os atributos do form como String": the hook is deleted (`git diff` shows `src/lib/use-form-state.ts` removed; no remaining reference by grep). Inputs are strings in the DOM, output is typed (`bigint`, `Address`) through the valibot schema output. Done.
2. "Avalie trocar isso pelo react-hook-form": the evaluation exists only as "Evaluation findings" in plan.md (pitfalls, cost, decision). No separate parecer was written. Acceptable because the user then approved plan + migration, but note it.
3. "e sua integração com o tanstack-query": integration is `handleSubmit(output => mutation.mutate(output, {onSuccess: reset}))`, with `isPending` disabling the button. Implemented in all seven cards using the existing mutations. Done.

## Checks run

- `pnpm frontend:test`: 31 files, 314 tests pass. `pnpm frontend:build`: passes (only the pre-existing chunk-size warning).
- Repo lint: there is no lint script; `fallow` reports 53 dead-code/health items, all in elections/factory/wallet/test helpers and contracts devDependencies, none in the changed form files; `fallow dupes` finds no duplication.
- Real app: local hardhat node + `pnpm contracts:deploy:local` + `frontend:dev:e2e` + test-wallet in Chromium (Playwright). No stubbing and no existing data touched (fresh local chain). Processes stopped; dist, .env.e2e, .playwright-mcp removed.

## Forms exercised in the browser

| Form | Seen | Matches |
| --- | --- | --- |
| Authorize voters | mixed input (valid, duplicate, wrong checksum, junk, zero) -> "2 novas · 3 inválidas" with the list; button "Autorizar 2 carteiras"; after submit textarea empty, counter 2; re-entering an authorized address -> "0 novas · 1 já autorizada", button disabled | crit 14 |
| Create party | empty -> both errors; typing in name cleared only name error; zero address -> "O endereço zero não é permitido."; valid with "  Alfa " -> banner, both fields empty | crit 9, 3, 4 |
| Create election | empty title error; past dates -> three sentences (nomination, start, end==start); nomination after start -> sentence; aria-invalid/aria-describedby set; success -> banner, title cleared, dates reset | crit 6, 7 |
| Create candidate | both errors, "0x123" and zero messages, clear-on-edit, success empties fields and lists candidate | crit 1-4 |
| Donate | "", "abc", "0", 19 decimals -> correct sentences; "0,5" -> balance 0,5 ETH and field cleared | crit 12 |
| Handover | "" and "xyz" -> "Informe um endereço válido."; valid -> "Presidente pendente", field cleared | crit 13 |
| Withdraw | 0,6 over 0,5 -> "maior que o saldo"; 0 and 19 decimals messages; "Sacar tudo" = 0.5; 0,2 succeeded, amount cleared, destination kept; balance became 0,3 and 0,4 was then rejected (balance read fresh at submit) | crit 10, 11 |

Not exercised in the browser: wrong-chain message and pending-disabled state (crit 5 for each form) and the "Registre pelo menos um eleitor" block in the real app (seen only via tests), because the test wallet has no wrong-chain mode and stubbing was not worth the risk; reviewed in code: each card computes `reason` and passes `disabled={!!reason || isPending}`, and `handleSubmit` returns early on `reason`.

## Problems

1. Medium - criterion 5 has no test at all. `grep Troque test/` returns nothing: the wrong-chain message/disabled state and pending-disabled state of the migrated forms are untested. Removing `reason` from any card would not fail a test. (Pending was also untested before the change, so this is a pre-existing gap, but the plan names it as a criterion.)
2. Medium - criterion 11 untested. party/candidate withdraw tests assert the transaction and the balance only; nothing asserts the amount is cleared and the destination kept. If `resetField("amount")` were `reset()` (destination back to owner) all tests would still pass.
3. Medium - criterion 14 authorize flow has weak coverage. `authorizeVotersSchema` is not referenced by any test; coverage is the existing admin route test around line 109 plus `parseVoterAddresses` unit tests. Nothing checks that the field empties after success or that only new, deduplicated addresses reach `authorizeVoters` through the resolver (I verified by hand: works).
4. Low - criterion 4 (clear that field's error, keep the other) is tested only for create candidate. Party, withdraw, donate, handover rely on the same copy-pasted `register(..., {onChange: () => clearErrors(...)})`; a mistake in one card would pass.
5. Low - rejection tests are loose. The withdraw `it.each` (party.test.tsx ~185) accepts any `p.text-destructive` matching `/endereço|valor|Informe/i`, so a wrong sentence still passes; criterion 10 says the sentence must equal `validateWithdrawForm`'s. The exact sentences are proven only by the `validate*` unit tests, which go through `parseForm`, not through the resolver actually used by the cards. A card wired to the wrong schema field would not be caught by those.
6. Low - election start boundary. Plan criterion 7 says "119 s ahead -> error; 120 s ahead -> accepted". The test for the 120 s boundary covers only `nominationEnd`; `votingStart` is tested at 60 s only (`at(1)`), so a margin of 61-119 s on the start would pass. The `nominationEnd` boundary test does fail if the rule were wrong.
7. Low - dynamic schemas and the compiler opt-out. `withdraw-card` and the others pass `valibotResolver(withdrawSchema(balance, holder))` built at render, relying on react-hook-form re-reading the resolver each render. It works (browser: balance change 0,5 -> 0,3 was honored on the next submit), but no test pins it (crit 10 "balance at submit time"). Same for `authorizeVotersSchema(authorized)`.
8. Info - uncommitted change is only the plan header (`Review: sent at 8c9813b`); "Fix pass" still pending, as expected. Dependency versions pinned exactly, consistent with package.json style.

## Tests: would they fail if the rule were wrong?

- Create candidate/party messages (crit 2, 3): yes, exact sentences asserted in forms.test.ts (via the schema).
- Election dates (crit 7): nominationEnd boundary yes; nomination after start, end after start yes; votingStart 119/120 no (problem 6).
- Election no voters (crit 8): yes, admin.test asserts message and disabled button.
- Election reset (crit 6): yes, admin.test added `Título` toHaveValue("") after success (the plan's "defaults at that moment" is not asserted).
- Withdraw balance/zero/decimals/exact balance (crit 10): yes at schema level (withdraw.test.ts, exact-balance and one-wei-over cases).
- Donate/handover typed output (crit 12, 13): amount tests in amount.test.ts and clear-after-success assertions were added; yes.
- Crit 15: grep confirms no `useFormState` and no local `FieldError` copy remains (one shared `components/field-error.tsx`); build and tests pass.
