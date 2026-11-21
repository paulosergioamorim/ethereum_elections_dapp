# Review: candidacy (commits after 045a25d, working tree clean)

## Verdict

The feature is implemented and correct. Every sentence of the request and all 54 criteria are met in the code. I found no bug that blocks shipping. There are four small problems: two deviations from the plan's wording and two gaps in test coverage. One stray file was committed by mistake. None of them changes behaviour that the user asked for.

How I checked:
- Ran `pnpm contracts:test` (198 passing: 168 Solidity, 30 Node), `pnpm frontend:test` (312 passing, 31 files) and `pnpm frontend:build` (ok).
- Read `Candidacy.sol`, `ElectionFactory.sol`, `Election.sol`, `DonationHolder.sol`, `Types.sol` and the Solidity tests.
- Read the frontend code (election route, the three new cards, queries/hooks, form, phase, errors) and its tests.
- **I did not open the running app.** No local node, deploy or browser session was started, so nothing in the UI was checked visually or against a real chain. The screen criteria (35-54) were checked only through the route and component tests, which render the page against a mocked chain (`test/helpers/mock-chain.ts`). No data was changed anywhere.

## Request, sentence by sentence

| Request | Built | Result |
| --- | --- | --- |
| Contract `Candidacy`, an n:n association between Election and Candidate | `Candidacy.sol` is a clone per (election, candidate) pair. `candidacyOf[election][candidate]` is created once and reused. It holds `election`, `candidate` and `party`. | OK |
| Candidacy replaces the string array in the election | `CreateElectionCommand.candidates` and `InvalidCandidatesQuantity` are removed. `Election.candidates()` returns `Candidacy[]` from `factory.nomineesOf`. The tally is `mapping _votes` and `results()` is sized to the nominee count. A grep finds no remaining reference except in the plan text. | OK |
| New election state where parties publish candidates, one per party | `ElectionPhase.Nomination` is value 0, ended by `nominationEnd` (`nominationEnd > now`, `<= votingStart`). `nominate` is restricted to the party president (`Party.owner()`). `nomineeOf[election][party]` holds one entry. Nominating another candidate of the same party replaces the nominee at the same list position. `withdraw` removes the nominee. | OK |
| A candidate cannot run in more than one election at a time | `heldBy[candidate]` is set on nomination. It is cleared on withdraw or replacement. `CandidateBusy(held)` is raised while `held.votingEnd() > now`. It is free from `votingEnd` on. | OK |
| Follow-up: the candidacy can also receive donations | `Candidacy is DonationHolder`. `donate` refuses with `NominationInactive` once the nomination is withdrawn or replaced. The candidate wallet is `owner()` and can always withdraw, so the balance stays reachable. The frontend has a donate form per nominee and a "Suas candidaturas com saldo" card. | OK |
| Follow-up: do everything in `ElectionFactory` | No registry contract. `nominate`, `withdraw`, `nomineesOf`, `nomineeOf`, `candidacyOf`, `isActive` and `heldBy` are all in `ElectionFactory`. Deployed factory size is 14,899 bytes, well under 24 KB. | OK |

The request.md answers also say the deadline is called `candidacyEnd` and the phase "Candidacy". The plan and code use `nominationEnd` / `Nomination`. The plan names this choice and the user approved the plan ("implemente"), so I treat it as settled.

## Does each test fail if its rule is wrong?

I reasoned from each assertion. I did not mutate the code.

| Rule (criteria) | Test | Would it fail if the rule were wrong? |
| --- | --- | --- |
| Nominate creates the clone with all fields and the event (5) | `ElectionFactoryNominateTest.test_shouldNominateAndCloneACandidacy`, `test_shouldEmitNominated` | Yes. Every field and every topic is asserted. |
| Only the president (6) | fuzzed sender, plus the president of another party | Yes. |
| `UnknownElection` / forged or foreign-party candidate (7, 8) | forged `Candidate`, foreign `Party`, non-contract address | Yes. |
| Phase boundary (9, 21) | `nominationEnd - 1` accepted, `nominationEnd` gives `InvalidPhase(Scheduled, Nomination)` | Yes. The off-by-one is covered on both sides. |
| List order, `nomineeOf` (10, 11) | `test_shouldListNomineesInNominationOrder`, `test_shouldExposeTheNomineesAsElectionCandidates` | Yes. |
| Replace keeps the position, frees the old candidate (14) | `test_shouldReplaceTheNomineeKeepingItsPosition`, with a second party so the position matters | Yes. |
| `AlreadyNominated` (15) | exists | Yes. |
| Withdraw swaps the last into the freed slot, with its errors (16, 17) | `WithdrawNominationTest` | Yes. |
| `CandidateBusy`, and release at `votingEnd` (18, 19) | `...BusyUntilVotingEnd` (`votingEnd - 1`) and `...FreeAtVotingEnd` (`votingEnd`) | Yes. `>` versus `>=` would break one of them. |
| Reuse of the clone (20) | `test_shouldReuseTheCandidacyWhenNominatedAgain` asserts the same address | Yes for reuse. It does not assert that balance and `donatedBy` survive (see problem 3). |
| `nominationEnd` rules (1, 2) | `InitializeTest`: fuzz in `[0, now]`, above `votingStart`, and equal to `votingStart` accepted | Yes. |
| Phase function (4) | `ElectionPhaseTest` covers all boundaries and the skipped `Scheduled` case | Yes. |
| Vote and reveal rules (22, 23, 24, 26) | `Vote` and `RevealBatch` tests per phase, fuzz below the length gives tally, fuzz from the length up gives `nullVotes`, no-nominee election gives all null | Yes. |
| Donations (27-34) | `CandidacyTest`: 1 wei, `ZeroDonation`, inactive refusal with balance unchanged, plain transfer or unknown calldata, withdraw while inactive, the president cannot withdraw, `InsufficientBalance`, `InvalidRecipient`, `WithdrawFailed`, `RenounceDisabled` | Yes. |
| Initialize once (12) | `CandidacyTest` clone and implementation | Yes. |
| Frontend `phaseAt` (42) | `phase.test.ts` | Yes. |
| Form rules (35, 36) | `election-form.test.ts` | Yes for the empty, past and after-voting-start cases and the equal boundary. The 2-minute boundary is tested with a value far inside the limit (see problem 4). |
| Nominate, replace, withdraw, busy, free-after-tally, no-candidates link, hidden for non-presidents, no wallet or other phase (44-47, 49) | `election.test.tsx`, "indicar candidato" block | Yes. |
| Donate, donated amount, no wallet, own withdraw only, above-balance error, withdrawn with balance visible, hidden without balance (50-54) | `election.test.tsx`, "doações" block | Yes. |
| New error messages (43) | `errors.test.ts` | Yes. |

## Problems

1. **Low: the "Sacar" form is not in the nominee row (criterion 52).** The criterion says the nominee row shows it to the candidate wallet. The code puts every "Sacar" form in a separate card, `OwnCandidaciesCard` ("Suas candidaturas com saldo"). That card covers both active and withdrawn candidacies, and criterion 54 is met. Behaviour is right, only the placement differs from the wording. Evidence: `nominees-card.tsx` `NomineeRow` has no withdraw form; `own-candidacies-card.tsx` renders `WithdrawCard`.

2. **Low: the read-failure state (criterion 40) is the whole-page error.** The spec says a failure reading the nominees shows an error and a "Tentar de novo" button. `fetchElection` reads the nominees inside the election query. A failure there falls into the page-level "Não foi possível ler a eleição." screen with "Tentar de novo". That is acceptable, but it is not a nominee-specific message. The test at `election.test.tsx:646` covers it as an election read failure.

3. **Low (test gap): criterion 20 says balance and `donatedBy` are kept when a withdrawn candidate is nominated again.** The test asserts only the same address, which is what the implementation guarantees. A test that donates, withdraws, nominates again and then checks the balance would state the donor-protection reason for door 3.

4. **Low (test gap, frontend): two cases have no test.**
   - Criterion 48, the pt-BR toast when `nominate` or `withdraw` reverts, has no route test. Only `errors.test.ts` covers the messages. Whether the card sends the revert through the toast is untested.
   - The 120-second minimum for `nominationEnd` is tested only at `at(1)`, so a `<` that became `<=` would not be caught.

5. **Trivial: a stray file was committed.** `.agents/scheduled_tasks.lock` was added in f194b8c. It contains a session id and pid, is not ignored and is unrelated to the feature. It should be removed from the repository and git-ignored.

6. **Trivial: a stale comment.** `DonationHolder.sol` says "Os dois contratos são clones" but now three contracts use it (Party, Candidate, Candidacy).

## Not defects, noted for the record

- The factory must be redeployed and `VITE_FACTORY_ADDRESS` updated. The plan names this as an operator action. The old Ignition deployments under `packages/contracts/ignition/deployments` still carry the old ABI and were not touched.
- A candidacy whose election has reached tally stays `isActive` and still accepts donations. The spec does not forbid it.
- The plan header still says "Fix pass: pending". That is expected at this point.
