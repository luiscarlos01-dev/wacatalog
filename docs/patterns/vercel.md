---
title: Vercel
scope: Hospedagem, ambientes, variáveis e deploy
status: established / constrained
applies_to: "configuração de deploy e código dependente do ambiente"
source_of_truth: "AGENTS.md; docs/workflow/tech-spec.md"
last_reviewed: 2026-08-22
version_baseline: "N/A para plataforma; Node.js 24.19.0 no projeto"
documentation_snapshot: "Context7 /websites/vercel em 2026-08-22"
related_patterns: [nextjs, security, pnpm, quality]
---

# Vercel

## Contract summary

A aplicação full-stack será hospedada na Vercel. A plataforma é rolling e não
recebe uma versão de pacote no baseline; o runtime Node do projeto é fixado em
`24.19.0`.

## Non-negotiable rules

### MUST

- Separar variáveis públicas das secretas.
- Manter segredos fora do repositório e fora do bundle do browser.
- Separar preview e produção.
- Validar build de produção antes de declarar uma entrega pronta.
- Declarar o Node do projeto no manifesto/configuração de deploy quando o app
  existir; a documentação Vercel aceita `engines.node`.

### MUST NOT

- Colocar credenciais administrativas em variáveis expostas ao cliente.
- Fazer deploy ou alterar produção sem autorização explícita.
- Assumir que arquivo local de ambiente existe no CI ou na Vercel.

### SHOULD

- Documentar nomes e finalidade das variáveis sem registrar valores.
- Reproduzir localmente o build usado no ambiente de deploy.
- Manter configuração de plataforma mínima e versionada quando segura.

## Verification checklist

- [ ] Build de produção executado com Node 24.19.0.
- [ ] Variáveis obrigatórias identificadas sem expor valores.
- [ ] Bundle revisado para ausência de segredo.
- [ ] Preview validada quando houver mudança de UI ou integração.

## Unknowns / not approved

- Ambientes, regiões, domínio, projeto e estratégia de deploy.
- Runtime por função e limites operacionais.
- Política final de cache, headers e observabilidade.

## Sources

- `AGENTS.md`
- `docs/workflow/tech-spec.md`
- [Vercel — versões do Node.js](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)

## Change log

- `2026-08-22` — baseline alinhado à Tech Spec e Node 24.19.0.
