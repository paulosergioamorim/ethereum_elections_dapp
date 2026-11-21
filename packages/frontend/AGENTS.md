# Frontend (React + Vite SPA)

## Frontend features

Whenever a feature adds or changes something in the frontend (screens, routes, forms, components the
user sees), test it in a real browser before calling it done: start the dev server (`pnpm frontend:dev`) and
drive the app with the Playwright MCP tools (`mcp__playwright__browser_*`) in **Chromium**. Vitest
alone is not enough. Report what was exercised (and any flow that couldn't be, e.g. no wallet).

**Run this validation in a subagent**, not in the main session: the subagent starts the dev server
(and the local node, when a wallet is needed), drives the browser, and reports what it exercised and
what it saw. The browser snapshots and screenshots stay out of the main context. Stop what it started
when it finishes.

### Test wallet and local node

To exercise flows that need a wallet: `pnpm contracts:node:local` (Hardhat node), `pnpm contracts:deploy:local` (deploys
Semaphore + factory and writes `packages/frontend/.env.e2e`), `pnpm frontend:dev:e2e` (frontend against the
local node). Inject `packages/frontend/e2e/test-wallet.js` into the browser context with
`addInitScript`: it announces an EIP-6963 wallet backed by the node's unlocked accounts
(`window.__testWallet.select(i)` switches account; 0 is the authority). No private keys involved.
