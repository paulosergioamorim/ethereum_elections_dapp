/**
 * Quais pacotes o pre-commit deve verificar: os que têm arquivo em stage e, junto com eles, os que
 * dependem deles (mudou o `shared`, roda quem o consome). Função pura: o que decide o resultado
 * fica aqui, coberto por teste, e não em shell dentro do hook.
 *
 * @param {string[]} stagedFiles caminhos relativos à raiz do repositório
 * @param {{ name: string, dir: string, dependencies: string[] }[]} packages
 * @returns {string[]} nomes dos pacotes, na ordem em que aparecem em `packages`
 */
export function selectPackages(stagedFiles, packages) {
  const selected = new Set(
    packages
      .filter(({ dir }) => stagedFiles.some((file) => file.startsWith(`${dir}/`)))
      .map(({ name }) => name),
  );
  let grew = true;

  while (grew) {
    grew = false;

    for (const { name, dependencies } of packages) {
      if (!selected.has(name) && dependencies.some((dependency) => selected.has(dependency))) {
        selected.add(name);
        grew = true;
      }
    }
  }

  return packages.filter(({ name }) => selected.has(name)).map(({ name }) => name);
}
