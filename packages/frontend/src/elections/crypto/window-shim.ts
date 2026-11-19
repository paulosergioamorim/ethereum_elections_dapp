// O tlock-js (via age) só usa `crypto.getRandomValues` quando acha `window`; sem ele, cai no `crypto` do
// Node, que não existe no navegador. No Worker não há `window`, então ele aponta para o escopo global,
// que tem o mesmo `crypto`. Importado primeiro no Worker, antes do tlock.
const scope = globalThis as { window?: unknown };

scope.window ??= globalThis;
