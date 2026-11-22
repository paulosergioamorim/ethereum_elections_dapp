# Review: package-precommit (7ff123c..58a1a58 + uncommitted)

## Verdict

The feature is implemented and works. All four requested behaviours and the four product decisions are met. I found one real bug (renamed or moved files hide the old path from the package selection) and a few minor gaps. Nothing blocks the work.

## Request, sentence by sentence

| Request | Result |
| --- | --- |
| husky, pre-commit per package | Done. Root `prepare: husky`, `.husky/pre-commit` runs `fallow audit`, then `scripts/precommit.mjs`, which runs `pnpm --filter <pkg> precommit` for each selected package. |
| contracts uses `hardhat test` | Done. `precommit` is `hardhat test`, with no typecheck (matches the answer). |
| move shared tests from contracts to shared, with vitest | Done. 4 files in `packages/shared/test/`, `vitest.config.ts`, `tsc` config. `contracts/test/shared` is gone from git. |
| frontend uses vitest | Done. `precommit` is `pnpm typecheck && pnpm test`, and `test` was already `vitest run`. |
| Answers: fallow kept, dependents, tests + typecheck, drand as is | All followed. `timelock.test.ts` still hits the real quicknet. |

## Commands run

- `pnpm scripts:test`: 9/9 pass.
- `pnpm shared:test`: 4 files, 14 tests pass (3 timelock tests hit the real drand).
- `pnpm frontend:test`: 31 files, 319 tests pass.
- `pnpm contracts:test`: 185 passing (169 solidity, 16 nodejs).
- `packages/contracts/test/shared` is not tracked. An empty directory is left on disk (see problem 2).
- `CLAUDE.md` is a symlink to `AGENTS.md`. It lists `shared:test` and has a Pre-commit section (criterion 15).

## Real hook, in a throwaway clone

I ran this in a clone under the scratchpad with `core.hooksPath=.husky/_`, with the real `fallow`. The clone is removed. The main repo's `core.hooksPath` is still `.husky/_` and its status is unchanged.

| Scenario | Observed |
| --- | --- |
| Only `.specs/` staged | "nenhum pacote tocado", exit 0, commit made |
| Only `packages/frontend/` staged | Only the frontend ran (`tsc --noEmit`, then vitest 31 files). Commit made. |
| `packages/shared/` staged | contracts (185 passing), frontend and shared all ran (tsc then vitest). Commit made. |
| Failing frontend test staged | Aborted. vitest FAIL, `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL`, the message names `@elections/frontend`, no commit. |
| `git commit --no-verify` with the same failure | Committed. |
| fallow failure (unused file or export) | Aborted before the packages ran. |

Not exercised: a failing contracts test, a failing shared test, and a frontend type error that fallow does not also catch. The code path is the same `spawnSync` loop for every package.

## Moved tests against the originals (`git show 7ff123c:...`)

They assert the same things. Only the runner and import path changed (`assert.*` became `expect().toBe/toEqual/not.toBe/toThrow`, `../../../shared/x.js` became `../x.js`).

- Test count is unchanged: 14 (ballot 5, group 3, identity 3, timelock 3).
- The `abi.encode(uint256, bytes32)` layout test (criterion 4) is intact: `encodeBallot` is compared with `concat([numberToHex(option, {size:32}), salt])`. It would fail if the layout changed.
- `timelock.test.ts`: the top-level `await` in `describe` became `beforeAll`. The round-trip test got a 30 s timeout. It is equivalent.
- Every moved test would fail if its rule were wrong: the equality assertions are strict, the `notEqual` ones cover a one-field change, and the `toThrow` has the original regex. I did not run mutations against the source.

## `scripts/select-packages.test.mjs`

There are 9 cases. For each rule, the test would fail if the rule were wrong:

- Frontend only, contracts only, shared selecting all three, `.specs` and root files giving none, empty staging, and two packages: each uses an exact `deepEqual` on the list. Wrong selection or wrong order fails.
- Prefix `packages/frontend-docs/` is not `frontend`: this guards the `${dir}/` check. Removing the slash fails the test.
- Transitive dependents (a to b to c): this fails if the closure loop is removed.
- The test passes the package list by hand. It does not cover how `precommit.mjs` builds that list from `package.json` (the `workspace:` filter). I checked that by running the hook: contracts and frontend depend on shared via `workspace:*`, and it worked.

## Problems

1. **Renames hide the old path (bug, medium).** `scripts/precommit.mjs` uses `git diff --cached --name-only --diff-filter=ACMRD`. With rename detection on, `git mv packages/shared/test/group.test.ts .specs/group.test.ts` lists only `.specs/group.test.ts`. I confirmed it in the clone: the output was just that one path, while `--no-renames` also gave `packages/shared/test/group.test.ts`. A commit that only moves files out of `packages/shared` (or out of any package) selects no package, so shared, frontend and contracts do not run. This is exactly what S1 did (a move out of `packages/contracts`). Fix: add `--no-renames` and test it.
2. **Empty `packages/contracts/test/shared/` on disk (minor).** Git does not track it, so a clone does not have it. Criterion 2 says it SHALL not exist. Remove it with `rmdir`.
3. **`scripts/precommit.mjs` has no test (minor).** Staged-file parsing, building the package list, and exit code and package name on failure (criteria 10, 12, 13) are only checked by hand. Nothing in the repo would fail if those broke. The hook wiring (`.husky/pre-commit` order, `prepare`) is also untested.
4. **The selection tests do not run in the hook (minor).** `scripts/` and root files select no package. Editing `select-packages.mjs` therefore commits without running `scripts:test`. It is not in scope, but it leaves the key rule's tests ungated.
5. **Root files that change dependencies select nothing (minor).** `pnpm-lock.yaml` and `pnpm-workspace.yaml` run no package. This follows criterion 9 as written, so it is a note and not a defect.
6. **Plan bookkeeping.** `plan.md` has "Review: sent at 58a1a58", uncommitted. "Fix pass" is still pending.
