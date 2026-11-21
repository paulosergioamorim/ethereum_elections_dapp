# Hardhat + viem project

## Project layout

```
contracts/        Solidity source files (*.sol) and unit tests (*.t.sol)
test/             TypeScript integration tests and Solidity unit tests (*.sol)
ignition/         Hardhat Ignition deployment modules
scripts/          Standalone scripts run with `hardhat run`
hardhat.config.ts
```

## Working in this project

When writing or modifying tests, configuring `hardhat.config.ts`, or interacting with the network from TypeScript, invoke the **`hardhat`** skill. It covers Solidity and TypeScript testing, how to choose between them, `forge-std` cheatcodes, the `network.create()` API, `networkHelpers`, and the compile-then-typecheck workflow. The skill itself points to the matching `hardhat-toolbox-*` skill for toolbox-specific guidance (clients, contract interaction, assertions).

## Docs

- Hardhat 3 — https://hardhat.org/llms.txt
- viem — https://viem.sh/llms.txt

## Contract errors

Whenever a contract gains a new `error`, add its Portuguese (pt-BR) message to the `messages` map in
`packages/frontend/src/contracts/errors.ts`, with a case in `packages/frontend/test/contracts/errors.test.ts`,
in the same change. Do it even when the UI cannot reach the error today. Re-export the ABIs first
(`pnpm contracts:export-abis`) so the frontend knows the error.
