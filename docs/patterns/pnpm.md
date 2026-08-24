---
title: pnpm
scope: Dependências, scripts e lockfile
status: proposed
applies_to: "package.json, pnpm-lock.yaml e comandos do projeto"
source_of_truth: "AGENTS.md; docs/workflow/tech-spec.md"
last_reviewed: 2026-08-22
version_baseline: "pnpm 11.22.0; Node.js 24.19.0"
documentation_snapshot: "pnpm 11 docs via Context7 em 2026-08-22; pacote oficial 11.22.0 consultado"
related_patterns: [00-project-conventions, eslint, prettier, quality]
---

# pnpm

## Contract summary

`pnpm 11.22.0` é o gerenciador proposto e requer Node.js 22 ou superior; o
projeto usa Node `24.19.0`. O lockfile ainda não existe.

## Non-negotiable rules

### MUST

- Fixar a versão exata em `package.json` com `packageManager` quando o projeto
  for inicializado.
- Usar lockfile e instalação congelada em CI.
- Revisar dependências novas por necessidade, licença, manutenção e risco de
  supply chain.
- Usar scripts reproduzíveis em CI e localmente.

### MUST NOT

- Misturar npm, yarn, bun e pnpm no mesmo fluxo sem decisão explícita.
- Instalar pacote global para resolver uma necessidade do projeto.
- Usar versões `next`, beta ou RC no baseline de produção.

### SHOULD

- Preferir comandos declarados em `package.json`.
- Atualizar dependências deliberadamente e revisar o diff do lockfile.
- Usar Corepack conforme a documentação de instalação do ambiente aprovado.

## Example

```json
{
  "packageManager": "pnpm@11.22.0"
}
```

## Verification checklist

- [ ] Gerenciador usado é pnpm 11.22.0.
- [ ] Lockfile está consistente.
- [ ] Instalação congelada funciona.
- [ ] Dependências novas foram justificadas.

## Unknowns / not approved

- Scripts finais e política de atualização.
- Configuração de workspace, se o projeto vier a ser monorepo.

## Sources

- `AGENTS.md`
- [pnpm — pin com packageManager](https://pnpm.io/installation)
- [pnpm no npm — 11.22.0](https://www.npmjs.com/package/pnpm)

## Change log

- `2026-08-22` — criado para o baseline pnpm 11.22.0.
