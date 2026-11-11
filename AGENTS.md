# Ethereum elections dApp (pnpm monorepo)

## Packages

```
packages/contracts/   @elections/contracts — Hardhat 3 + viem: Solidity contracts, tests, Ignition modules
packages/frontend/    @elections/frontend — React + Vite SPA, deployed to Netlify (see netlify.toml)
packages/shared/      @elections/shared — vote crypto shared by the Hardhat tests and the frontend
```

Each package has its own `package.json` and `tsconfig.json`. The root only holds workspace,
deploy (`netlify.toml`) and tooling (`.fallowrc.json`) config.

When working in `packages/contracts`, read `packages/contracts/AGENTS.md`.

## Root scripts

```
pnpm dev               frontend dev server
pnpm build:frontend    typecheck + production build of the frontend
pnpm test:frontend     frontend tests (vitest)
pnpm compile           compile the contracts
pnpm test:contracts    Solidity + TypeScript integration tests
pnpm export-abis       copy compiled ABIs to packages/frontend/src/contracts/abis.ts
```
