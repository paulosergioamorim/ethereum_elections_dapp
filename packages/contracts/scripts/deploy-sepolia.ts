// Implanta a ElectionFactory na Sepolia. Só implanta: para atualizar as variáveis do GitHub Actions,
// rode depois `DEPLOYMENT_ID=<id> pnpm update-vars:sepolia` (scripts/update-sepolia-vars.ts).
// Uso: DEPLOYMENT_ID=v4_0_0 pnpm deploy:sepolia   (o `hardhat run` não repassa argumentos; o id precisa ser novo para criar outro contrato)
import { network } from "hardhat";
import ElectionFactoryModule from "../ignition/modules/ElectionFactory.js";

const deploymentId = process.env.DEPLOYMENT_ID;
if (!deploymentId) {
  console.error("Uso: DEPLOYMENT_ID=<id> pnpm deploy:sepolia");
  process.exit(1);
}

// Tudo no mesmo processo: o keystore do Hardhat resolve `SEPOLIA_RPC_URL` e `SEPOLIA_PRIVATE_KEY`
// (`configVariable` no hardhat.config.ts) e pergunta a senha uma vez, sem subprocesso sem terminal.
const { ignition } = await network.create("sepolia");
const { factory } = await ignition.deploy(ElectionFactoryModule, { deploymentId });

console.log(`ElectionFactory em ${factory.address} (deployment ${deploymentId})`);
console.log(`Para atualizar o GitHub: DEPLOYMENT_ID=${deploymentId} pnpm update-vars:sepolia`);
