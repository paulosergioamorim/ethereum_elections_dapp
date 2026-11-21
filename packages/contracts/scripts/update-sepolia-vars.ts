// Atualiza as variáveis do GitHub Actions (VITE_FACTORY_ADDRESS e VITE_FACTORY_DEPLOY_BLOCK) com o `gh`,
// a partir de uma implantação já feita com o Ignition (`pnpm hardhat ignition deploy ignition/modules/ElectionFactory.ts --network sepolia --deployment-id <id>`). Não usa rede nem chaves.
// Uso: DEPLOYMENT_ID=<id> pnpm update-vars:sepolia   (o mesmo <id> da implantação)
// Depois, dispare o deploy do frontend (push na main ou `gh workflow run deploy.yml`).
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const deploymentId = process.env.DEPLOYMENT_ID;
if (!deploymentId) {
  console.error("Uso: DEPLOYMENT_ID=<id> pnpm update-vars:sepolia");
  process.exit(1);
}

const packageRoot = path.resolve(import.meta.dirname, "..");
const deployment = path.resolve(packageRoot, "ignition/deployments", deploymentId);
const addresses = JSON.parse(await readFile(path.resolve(deployment, "deployed_addresses.json"), "utf8"));
const address: string | undefined = addresses["ElectionFactoryModule#ElectionFactory"];
if (!address) {
  throw new Error("Endereço da ElectionFactory não encontrado em deployed_addresses.json");
}

// o bloco de implantação vem do recibo da transação, registrado no journal
const journal = await readFile(path.resolve(deployment, "journal.jsonl"), "utf8");
let blockNumber: number | undefined;
for (const line of journal.split("\n").filter(Boolean)) {
  const entry = JSON.parse(line);
  if (entry.type === "TRANSACTION_CONFIRM" && entry.receipt?.contractAddress?.toLowerCase() === address.toLowerCase()) {
    blockNumber = entry.receipt.blockNumber;
  }
}
if (blockNumber === undefined) {
  throw new Error("Bloco de implantação não encontrado no journal");
}

console.log(`ElectionFactory em ${address}, bloco ${blockNumber}`);
const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { cwd: packageRoot, stdio: "inherit" });
run("gh", ["variable", "set", "VITE_FACTORY_ADDRESS", "--body", address]);
run("gh", ["variable", "set", "VITE_FACTORY_DEPLOY_BLOCK", "--body", String(blockNumber)]);
console.log("Variáveis do GitHub atualizadas. Dispare o deploy do frontend para publicá-las.");
