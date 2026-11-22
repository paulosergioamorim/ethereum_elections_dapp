# Ethereum elections dApp (pnpm monorepo)

## Packages

```
packages/contracts/   @elections/contracts — Hardhat 3 + viem: Solidity contracts, tests, Ignition modules
packages/frontend/    @elections/frontend — React + Vite SPA, deployed to GitHub Pages (see .github/workflows/deploy.yml)
packages/shared/      @elections/shared — vote crypto shared by the Hardhat tests and the frontend
```

Each package has its own `package.json` and `tsconfig.json`. The root only holds workspace,
deploy (`.github/workflows/`) and tooling (`.fallowrc.json`) config.

When working in `packages/contracts`, read `packages/contracts/AGENTS.md`.
When working in `packages/frontend`, read `packages/frontend/AGENTS.md`.

## Root scripts

```
pnpm frontend:dev              frontend dev server
pnpm frontend:build            typecheck + production build of the frontend
pnpm frontend:test             frontend tests (vitest)
pnpm shared:test               shared tests (vitest; the drand tlock tests need internet)
pnpm scripts:test              tests of the pre-commit package selection (node --test)
pnpm contracts:compile         compile the contracts
pnpm contracts:test            Solidity + TypeScript integration tests
pnpm contracts:export-abis     copy compiled ABIs to packages/frontend/src/contracts/abis.ts
```

## Pre-commit

`husky` (`pnpm install` runs `prepare` and points `core.hooksPath` to `.husky/_`). `.husky/pre-commit`
runs `fallow audit`, then `scripts/precommit.mjs`, which runs `pnpm --filter <pkg> precommit` for each
package with staged files and for the packages that depend on them (a change in `shared` also runs
frontend and contracts). Per package: contracts `hardhat test`; shared and frontend `tsc --noEmit` and
`vitest run`. Offline, or to skip once: `git commit --no-verify`.
