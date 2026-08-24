---
title: React
scope: Componentes, hooks e composição de UI
status: proposed
applies_to: "**/*.tsx, componentes e hooks React"
source_of_truth: "AGENTS.md; docs/workflow/quality-gates.md"
last_reviewed: 2026-08-22
version_baseline: "React 19.2.8; React DOM 19.2.8"
documentation_snapshot: "pacote oficial React consultado em 2026-08-22"
related_patterns: [typescript, nextjs, frontend-accessibility]
---

# React

## Contract summary

O baseline proposto é React `19.2.8` e React DOM `19.2.8`, alinhado ao Next.js
16.3.2. A arquitetura de componentes ainda aguarda o gate da Tech Spec.

## Non-negotiable rules

### MUST

- Manter componentes focados em uma responsabilidade observável.
- Tornar estados de carregamento, vazio, erro e sucesso explícitos quando o
  fluxo os possuir.
- Preservar teclado, foco e semântica do elemento nativo adequado.
- Colocar estado, refs e efeitos em Client Components; a documentação React
  19.2 informa que esses hooks não estão disponíveis em Server Components.

### MUST NOT

- Usar componente client-side apenas por conveniência quando server-side for
  suficiente.
- Duplicar estado derivável.
- Usar APIs removidas ou legadas do React 19, como `propTypes` e `defaultProps`
  em funções, sem uma razão de compatibilidade aprovada.

### SHOULD

- Preferir composição a componentes monolíticos.
- Criar hook somente quando houver lógica reutilizada ou uma fronteira clara.
- Manter props pequenas e orientadas ao comportamento.

## Decision rules

- **Se** uma interação exige browser API, estado local ou evento, **então**
  avalie um Client Component conforme `nextjs.md`.
- **Se** o componente só apresenta dados já resolvidos, **então** prefira
  Server Component.
- **Se** a abstração não possui segundo uso concreto, **então** mantenha-a local.

## Verification checklist

- [ ] Estados do fluxo foram verificados.
- [ ] Navegação por teclado e foco visível foram verificados.
- [ ] Renderização mobile e desktop foi verificada quando houver UI.
- [ ] Hooks client-only não atravessam a fronteira server.

## Unknowns / not approved

- Biblioteca de componentes, design system e gerenciamento global de estado.
- Convenções de testes de componentes.

## Sources

- `AGENTS.md`
- `docs/workflow/quality-gates.md`
- [React no npm](https://www.npmjs.com/package/react)

## Change log

- `2026-08-22` — baseline alinhado à Tech Spec e React 19.2.8.
