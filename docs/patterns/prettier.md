---
title: Prettier
scope: Formatação automática do código
status: proposed / constrained
applies_to: "arquivos formatados pelo projeto"
source_of_truth: "AGENTS.md; docs/workflow/tech-spec.md; docs/workflow/quality-gates.md"
last_reviewed: 2026-08-22
version_baseline: "Prettier 3.9.6"
documentation_snapshot: "documentação oficial consultada em 2026-08-22"
related_patterns: [typescript, eslint, pnpm]
---

# Prettier

## Contract summary

Prettier `3.9.6` é o formatter proposto. A configuração exata ainda não existe
e não deve ser inventada neste pattern.

## Non-negotiable rules

### MUST

- Usar uma única configuração compartilhada do projeto.
- Formatar arquivos alterados antes da revisão.
- Usar `prettier --check` no CI quando o script for definido.
- Revisar qualquer alteração produzida por `--write`.

### MUST NOT

- Ajustar formatação manualmente contra a configuração aprovada.
- Introduzir outro formatter concorrente.
- Usar `--no-config` como padrão de projeto.

### SHOULD

- Integrar o formatter aos scripts e ao editor somente após fixar a configuração.
- Formatar apenas arquivos dentro do escopo da mudança durante desenvolvimento.

## Verification checklist

- [ ] Check de formatação executado.
- [ ] Arquivos alterados estão formatados.
- [ ] Não houve reformat global desnecessário.

## Unknowns / not approved

- Config e integração final com ESLint.
- Script final de format/check.

## Sources

- `AGENTS.md`
- `docs/workflow/quality-gates.md`
- [Prettier — instalação](https://prettier.io/docs/install.html)

## Change log

- `2026-08-22` — baseline alinhado à Tech Spec e Prettier 3.9.6.
