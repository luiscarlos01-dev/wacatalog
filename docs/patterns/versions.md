---
title: Baseline exato de versões da stack
scope: Versões de runtime, linguagem, framework, SDK e tooling
status: accepted
applies_to: "qualquer consulta técnica, instalação ou criação de pattern"
source_of_truth: "AGENTS.md; docs/workflow/tech-spec.md; Context7 e fontes oficiais"
last_reviewed: 2026-08-22
version_baseline: "ver tabela"
documentation_snapshot: "Context7 consultado em 2026-08-22; fontes oficiais complementares quando o catálogo não expôs a versão"
related_patterns: [nextjs, typescript, react, supabase, pnpm, eslint, prettier, vercel]
---

# Baseline exato de versões da stack

## Contract summary

Esta é a única matriz de versões dos patterns. Os valores foram aprovados na
Tech Spec para o bootstrap do projeto. Nenhum pacote deve ser instalado sem
lockfile e sem a verificação de compatibilidade prevista no bootstrap.

## Baseline aprovado

| Item | Versão exata | Status | Evidência da consulta |
| --- | --- | --- | --- |
| Node.js | `24.19.0` | accepted | documentação oficial Node; release LTS identificada |
| pnpm | `11.22.0` | accepted | pacote oficial pnpm; versão `latest` verificada em fonte oficial |
| TypeScript | `6.0.3` | proposed | pacote oficial TypeScript; versão estável fixada para o bootstrap |
| Next.js | `16.3.2` | accepted | pacote oficial Next.js; versão estável consultada |
| React | `19.2.8` | accepted | pacote oficial React; versão estável consultada |
| React DOM | `19.2.8` | accepted | mesma linha de compatibilidade do React |
| `@supabase/supabase-js` | `2.112.3` | accepted | pacote oficial Supabase; Context7 `/supabase/supabase-js` confirmou a linha 2 |
| `@supabase/ssr` | `0.12.4` | accepted | pacote oficial Supabase; fonte oficial de pacote |
| Supabase CLI | `2.115.0` | accepted | release estável oficial da CLI |
| PostgreSQL | `17.6` | accepted | Context7 `/postgres/postgres/rel_17_6` |
| Tailwind CSS | `4.3.3` | accepted | pacote oficial Tailwind; versão estável consultada |
| `@tailwindcss/postcss` | `4.3.3` | accepted | integração oficial Tailwind v4 |
| PostCSS | `8.5.23` | accepted | dependência alinhada ao Next.js consultado |
| Zod | `4.4.3` | accepted | pacote oficial Zod; versão estável consultada |
| sharp | `0.35.3` | accepted | normalização server-side em runtime Node |
| `pdfjs-dist` | `6.2.108` | accepted | extração de texto de PDF server-only (ADR-0008); pacote oficial no npm, `engines.node` compatível com a linha 24 já fixada |
| ESLint | `9.39.5` | accepted | linha de manutenção compatível com os plugins do Next.js |
| `eslint-config-next` | `16.3.2` | accepted | mesma linha do Next.js |
| Prettier | `3.9.6` | accepted | documentação oficial recomenda instalação exata |
| `eslint-config-prettier` | `10.1.8` | accepted | integração de lint e formatação |
| Vitest | `4.1.10` | accepted | pacote oficial Vitest; versão estável consultada |
| `@testing-library/react` | `16.3.2` | accepted | testes de componentes por comportamento |
| `@playwright/test` | `1.62.1` | accepted | pacote oficial Playwright; versão estável consultada |
| Vercel | `N/A` | accepted / rolling platform | plataforma não tem versão de SDK/runtime equivalente; Node será fixado |
| `anthropics/claude-code-action` | `v1` | accepted | documentação oficial da action consultada em 2026-08-22 |
| `actions/checkout` | `v6` | accepted | workflow de CI do projeto |
| `actions/setup-node` | `v6` | accepted | workflow de CI do projeto |
| `pnpm/action-setup` | `v4` | accepted | workflow de CI do projeto |

## Regras de versionamento

### MUST

- Consultar documentação versionada, preferindo o ID Context7 com `/version`.
- Registrar neste arquivo qualquer alteração de versão antes de atualizar um
  pattern dependente.
- Fixar versões no manifesto e no lockfile quando o projeto for inicializado.
- Confirmar compatibilidade entre Next.js, React, React DOM, Node.js e pnpm.
- Registrar a data da consulta e a fonte usada.

### MUST NOT

- Usar `latest`, `canary`, `next`, beta ou RC no baseline de produção.
- Misturar instruções de versões diferentes no mesmo pattern.
- Atualizar uma versão apenas porque existe uma versão mais nova sem revisar
  compatibilidade, changelog e impacto nos patterns.
- Tratar a versão do serviço Supabase como se fosse a versão do SDK JavaScript.

### SHOULD

- Preferir versões estáveis e com suporte ativo.
- Atualizar em uma mudança isolada, revisando o lockfile e todos os patterns
  afetados.
- Manter versões de pacotes relacionados na mesma família quando a documentação
  oficial exigir isso.

## Decision rules

- **Se** a documentação Context7 só expõe `latest` ou uma versão sem precisão,
  **então** complemente com fonte oficial do pacote e marque a evidência.
- **Se** a versão proposta não for compatível com a plataforma ou outro pacote,
  **então** não escreva instrução de implementação; retorne ao planejamento.
- **Se** a consulta encontrar uma versão nova depois deste snapshot, **então**
  preserve o baseline até uma revisão deliberada.

## Pontos que ainda precisam de aprovação

- O projeto ainda não tem `package.json`, lockfile, `tsconfig.json` ou config de
  lint/formatter; a instalação real ainda precisa cumprir a verificação de
  compatibilidade do bootstrap.
- A versão da instância Supabase/Postgres deve ser confirmada no projeto criado;
  `17.6` é a documentação SQL alvo, não uma migração autorizada.
- Biblioteca de componentes, ORM, estado e observabilidade não serão adotados
  no bootstrap do MVP; não possuem versão de aplicação.

## Verification checklist

- [ ] Cada pattern de tecnologia declara `version_baseline`.
- [ ] Cada instrução específica aponta para a mesma versão desta matriz.
- [ ] O manifesto e o lockfile reais foram conferidos quando existirem.
- [ ] Compatibilidade e changelogs foram revisados antes de atualizar.
- [ ] Versões não suportadas foram removidas dos exemplos.

## Sources

- `AGENTS.md`
- `docs/workflow/tech-spec.md`
- [Node.js Releases](https://nodejs.org/en/about/previous-releases)
- [Next.js no npm](https://www.npmjs.com/package/next)
- [React no npm](https://www.npmjs.com/package/react)
- [TypeScript no npm](https://www.npmjs.com/package/typescript)
- [ESLint no npm](https://www.npmjs.com/package/eslint)
- [Prettier — instalação](https://prettier.io/docs/install.html)
- [pnpm no npm — versão atual consultada](https://www.npmjs.com/package/pnpm)
- [Supabase JS no npm — versão atual consultada](https://www.npmjs.com/package/@supabase/supabase-js)
- [Supabase SSR no npm — versão atual consultada](https://www.npmjs.com/package/@supabase/ssr)

## Change log

- `2026-08-22` — baseline aprovado na Tech Spec após consultas versionadas do Context7 e
  fontes oficiais de pacotes.
- `2026-08-28` — adicionado `pdfjs-dist` (feature 004, ADR-0008), versão confirmada
  via `registry.npmjs.org/pdfjs-dist/latest` no momento da instalação.
