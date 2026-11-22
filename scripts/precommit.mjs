// Pre-commit por pacote: roda o script `precommit` de cada pacote tocado pelo commit (e dos que
// dependem dele). Chamado por `.husky/pre-commit`.
import { execFileSync, spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { selectPackages } from "./select-packages.mjs";

const staged = execFileSync("git", ["diff", "--cached", "--name-only", "--no-renames", "--diff-filter=ACMRD"], {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

const names = new Map();
const packages = readdirSync("packages", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const manifest = JSON.parse(readFileSync(`packages/${entry.name}/package.json`, "utf8"));
    names.set(manifest.name, entry.name);

    return {
      name: manifest.name,
      dir: `packages/${entry.name}`,
      dependencies: Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })
        .filter(([, version]) => String(version).startsWith("workspace:"))
        .map(([dependency]) => dependency),
    };
  });

const selected = selectPackages(staged, packages);

if (selected.length === 0) {
  console.log("pre-commit: nenhum pacote tocado, nada a verificar.");
  process.exit(0);
}

console.log(`pre-commit: ${selected.join(", ")}`);

for (const name of selected) {
  console.log(`\n▶ ${name}`);
  const result = spawnSync("pnpm", ["--filter", name, "precommit"], { stdio: "inherit" });

  if (result.status !== 0) {
    console.error(`\npre-commit: ${name} falhou. Corrija, ou use \`git commit --no-verify\` para pular.`);
    process.exit(result.status ?? 1);
  }
}
