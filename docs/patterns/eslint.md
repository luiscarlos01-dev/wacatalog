---
title: ESLint
scope: Lint e regras de qualidade estática
status: proposed / constrained
applies_to: "código TypeScript, TSX e configuração de lint"
source_of_truth: "AGENTS.md; docs/workflow/tech-spec.md; docs/workflow/quality-gates.md"
last_reviewed: 2026-08-22
version_baseline: "ESLint 9.39.5; eslint-config-next 16.3.2"
documentation_snapshot: "pacotes oficiais consultados em 2026-08-22"
related_patterns: [typescript, react, nextjs, quality]
---

# ESLint

## Contract summary

ESLint `9.39.5` é o linter aprovado. O projeto deve usar flat config em
`eslint.config.js` ou formato equivalente
suportado pelo setup aprovado.

## Non-negotiable rules

### MUST

- Executar lint antes de declarar código pronto.
- Configurar explicitamente arquivos TypeScript/TSX; o default do ESLint cobre
  JavaScript, não TypeScript.
- Corrigir violações reais em vez de desabilitar regras globalmente.
- Usar a API/configuração flat da versão 9.

### MUST NOT

- Usar `.eslintrc`, `ESLINT_USE_FLAT_CONFIG` ou APIs removidas do ESLint 9.
- Usar `eslint-disable` amplo para ocultar código problemático.
- Tratar lint verde como substituto de typecheck, testes ou revisão de contrato.

### SHOULD

- Escopar exceções ao menor bloco possível e explicar o motivo.
- Revisar qualquer alteração automática produzida pelo lint.

## Verification checklist

- [ ] `pnpm lint` ou script equivalente executado.
- [ ] TypeScript e TSX foram lintados explicitamente.
- [ ] Warnings novos foram revisados.
- [ ] Não há configuração legada incompatível com ESLint 9.

## Unknowns / not approved

- Plugins, parser TypeScript e regras exatas.
- Script final de lint.

## Sources

- `AGENTS.md`
- `docs/workflow/quality-gates.md`
- [ESLint no npm](https://www.npmjs.com/package/eslint)

## Change log

- `2026-08-22` — baseline ajustado para ESLint 9.39.5 após verificação de
  compatibilidade com os plugins do Next.js 16.3.2.
