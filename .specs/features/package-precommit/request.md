# Request (verbatim)

utilize o `husky` para criar pre-commits por pacotes, no `@elections/contracts`, deve usar o `hardhat test`, mova os testes do pacote `shared` de `@elections/contracts` para propriamente `@elections/shared`, usando vitest, no frontend use o vitest

## Answers to product decisions

- fallow audit: "Manter no husky (Recommended)" - the versioned pre-commit runs `fallow audit`, then the touched packages' checks.
- Dependents: "Sim, rodar dependentes (Recommended)" - a staged change in `packages/shared` also runs frontend and contracts.
- Checks: "Testes + typecheck" - `tsc --noEmit` is added for frontend and shared; contracts runs only `hardhat test`.
- drand network: "Mover como está (Recommended)" - `timelock.test.ts` keeps hitting the real drand quicknet; offline commits use `--no-verify`.
