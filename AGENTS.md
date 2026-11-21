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
pnpm contracts:compile         compile the contracts
pnpm contracts:test            Solidity + TypeScript integration tests
pnpm contracts:export-abis     copy compiled ABIs to packages/frontend/src/contracts/abis.ts
```
