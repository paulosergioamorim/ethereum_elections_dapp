// Implanta Semaphore + ElectionFactory no nó local (`pnpm contracts:node:local`) e grava a configuração do
// frontend em packages/frontend/.env.e2e (ignorado pelo git), usada por `pnpm frontend:dev:e2e`.
// A primeira conta do nó vira a autoridade (owner) da factory.
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { network } from "hardhat";

const { viem } = await network.create();
const publicClient = await viem.getPublicClient();

const poseidon = await viem.deployContract("PoseidonT3");
const verifier = await viem.deployContract("SemaphoreVerifier");
const semaphore = await viem.deployContract("Semaphore", [verifier.address], {
  libraries: { PoseidonT3: poseidon.address },
});
const factory = await viem.deployContract("ElectionFactory", [semaphore.address]);
const [owner] = await viem.getWalletClients();

const chainId = await publicClient.getChainId();
const block = await publicClient.getBlockNumber();

const output = path.resolve(import.meta.dirname, "../../frontend/.env.e2e");
await writeFile(
  output,
  [
    "# Gerado por packages/contracts/scripts/deploy-local.ts. Não edite à mão: rode `pnpm contracts:deploy:local`.",
    `VITE_CHAIN_ID=${chainId}`,
    "VITE_RPC_HTTP_URL=http://127.0.0.1:8545",
    "VITE_RPC_WS_URL=ws://127.0.0.1:8545",
    `VITE_FACTORY_ADDRESS=${factory.address}`,
    `VITE_FACTORY_DEPLOY_BLOCK=${block}`,
    "",
  ].join("\n"),
);

console.log(`Semaphore:       ${semaphore.address}`);
console.log(`ElectionFactory: ${factory.address} (autoridade: ${owner.account.address})`);
console.log(`Configuração do frontend gravada em ${output}`);
