# Review: page-layout

**Verdict: the request and criteria S1 1-8 and S2 1-7 are implemented and work; two criteria have no test that guards them. No blocking defect.**

How it was checked: read the diff 9e1a649..HEAD against the request and plan; `vitest run` in the frontend (32 files, 332 tests, all green); drove the real app (local Hardhat node, deployed factory, `pnpm frontend:dev:e2e`, test wallet, Chromium) at 1280, 800 and 390 px. Data: only a scratch local chain was used; two parties ("Alfa", "Partido Beta") were created on it. No captures exist, so the comparison was against the plan's text. Everything started was stopped and `.playwright-mcp` removed (the git-ignored `packages/frontend/.env.e2e` written by the deploy script was left).

## Request ("Partidos e Autoridade meio bagunçadas, explore alternativas")
Alternatives were explored in the plan phase (tabs vs grid; user answers recorded) and one was built per page. Both pages are tidier: Autoridade has tabs by subject with form + list side by side; Partidos is a title, a search/refresh row and a card grid, with the repeated "Partidos" gone.

## Screens (real app)
- `/parties` at 1280: one `h1` "Partidos", search + refresh, 3 columns (357 px each); 800: 2 columns; 390: 1 column; no horizontal overflow at any width. Newest first (Partido Beta before Alfa). Search "zzz" shows "Nenhum partido encontrado."; "beta" keeps one card; clicking goes to `/parties/<address>`. (S2 1-5)
- `/admin` at 1280/800/390: three metrics, then tabs Eleitores/Eleições/Partidos; Eleitores active by default; `?aba=xyz` opens Eleitores; Eleições and Partidos show only their form + list ("Eleições criadas", "Partidos criados"), side by side at 1280, stacked below lg. (S1 1-3)
- Tab clicks change the URL to `?aba=...`; browser Back and reload keep the tab from the URL. (S1 2, 4)
- Creating a party in the Partidos tab: banner "Partido criado." and the new party at the top of the in-tab list. (S1 5, party half)
- Account 1 (not the authority): AuthorityGuard screen, no tabs. (S1 7)
- Elections list empty state in the tab: shown, same as the public page. (S1 6)
- Not exercised live: "Eleição criada." banner and new election on top (needs a registered voter, i.e. a zero-knowledge registration; not stubbed). The path is the unchanged `CreateElectionCard` (banner at create-election-card.tsx:75) and `useCreateElection` invalidates `electionKeys.all`; low risk.
- S2 6 error/loading and S2 7 spinner not exercised live.

## Rule-by-rule tests
| Rule | Test | Would it fail if the rule were wrong? |
| --- | --- | --- |
| S1 3 fallback | `admin-tab.test.ts` (null, "", xyz, "Partidos", valid) + admin.test fallback for `/admin`, `?aba=xyz` | Yes |
| S1 1/2 tabs + URL | admin.test "open on Eleitores and switch tabs through the URL" (selected tab, other content absent, `router.state.location.search`) | Yes |
| S1 7 no tabs for non-authority | admin.test "show no tabs..." | Yes |
| S1 8 forms unchanged | existing admin tests, only `?aba=` added to paths | Yes |
| S1 4 reload/back | only "open the tab named in the URL" | Partly: Back not tested (works live) |
| S1 5 banner + new item on top in the tab | party test creates a party but then navigates to `/parties`; in-tab list not asserted; "Eleição criada." asserted nowhere | No. Breaking the in-tab refresh would pass. Gap. |
| S1 6 empty state | partidos tab checks "Nenhum partido criado ainda."; elections tab empty state untested | Parties yes, elections no |
| S2 1 single title, no wrapping card | parties.test: one heading, refresh button present | Title yes; "no wrapping card" not asserted |
| S2 2 content/link, S2 3 order | existing list test | Yes |
| S2 4 columns | asserts class names `grid sm:grid-cols-2 lg:grid-cols-3` | Class check only (jsdom has no CSS); real widths verified live |
| S2 5 search, S2 6 states | existing tests | Yes |
| S2 7 refresh spins | none (`animate-spin` in no test) | No. Gap. |

## Problems
1. (minor, test gap) S1 5 is unguarded: no test shows the created party/election in the tab's own list, nor the "Eleição criada." banner. Evidence: admin.test.tsx "create a party..." leaves the tab and checks `/parties`; no "Eleição criada" under `test/`.
2. (minor, test gap) S2 7 (spinner while refetching) has no test.
3. (nit) The test title "list it under Partidos" now reads as the public page; `registered` (voter count) is computed in both `routes/admin.tsx` and `authority/components/admin-tabs.tsx`; `setParams({ aba })` replaces other query params (none exist today).

No code was changed and nothing was committed.
