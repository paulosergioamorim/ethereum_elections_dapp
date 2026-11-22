# Project state

## Decisions

| ID | Decision | Rationale | Status | Date |
| --- | --- | --- | --- | --- |
| AD-001 | Componentes que usam `react-hook-form` começam com `"use no memo"` | O React Compiler memoiza o retorno de `register()`; sem refs novas a cada render, `reset()` deixa o DOM com o valor antigo (visto em create-election: o título ficava após criar a eleição) | active | 2026-11-22 |
