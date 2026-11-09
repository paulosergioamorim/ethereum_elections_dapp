// Copia as ABIs compiladas para o frontend, como `as const` (o viem infere os tipos das chamadas).
// Rode depois de mudar os contratos: pnpm export-abis (o `hardhat run` compila antes).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const contracts = [
  { name: "electionFactoryAbi", artifact: "artifacts/contracts/ElectionFactory.sol/ElectionFactory.json" },
  { name: "electionAbi", artifact: "artifacts/contracts/Election.sol/Election.json" },
  // eventos do grupo (MemberAdded/MemberRemoved) e erros do LeanIMT
  { name: "semaphoreAbi", artifact: "artifacts/@semaphore-protocol/contracts/Semaphore.sol/Semaphore.json" },
];

const output = "frontend/src/contracts/abis.ts";

const parts = [
  "// Gerado por scripts/export-abis.ts a partir de artifacts/. Não edite à mão: rode `pnpm export-abis`.",
  "",
];

for (const { name, artifact } of contracts) {
  const { abi } = JSON.parse(await readFile(artifact, "utf8"));
  parts.push(`export const ${name} = ${JSON.stringify(abi, null, 2)} as const;`, "");
}

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, parts.join("\n"));

console.log(`ABIs exportadas para ${output}`);
