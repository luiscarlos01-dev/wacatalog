---
title: Supabase Postgres e tenancy
scope: Modelo relacional, queries, migrations e RLS
status: proposed / constrained
applies_to: "tabelas, migrations, queries e policies tenant-owned"
source_of_truth: "AGENTS.md; docs/workflow/checkpoint.md"
last_reviewed: 2026-08-22
version_baseline: "PostgreSQL 17.6; Supabase SDK conforme versions.md"
documentation_snapshot: "Context7 /postgres/postgres/rel_17_6 em 2026-08-22"
related_patterns: [supabase, supabase-auth, security, typescript]
---

# Supabase Postgres e tenancy

## Contract summary

O banco é Supabase Postgres e a arquitetura é multi-tenant desde o início. O
alvo SQL proposto é PostgreSQL `17.6`; a instância real ainda precisa ser
confirmada quando o projeto Supabase for criado.

## Non-negotiable rules

### MUST

- Associar cada registro tenant-owned à loja explicitamente.
- Garantir que queries, mutations e policies filtrem pela loja autorizada.
- Separar visibilidade de disponibilidade de produto.
- Manter SKU, quando existir, único dentro da loja, conforme contrato do produto.
- Registrar alterações estruturais por migration reproduzível.
- Definir constraints no banco para invariantes de dados, não apenas na UI.

### MUST NOT

- Usar tabela global sem justificar que o dado não pertence a uma loja.
- Confiar somente em filtro no frontend para isolamento.
- Criar colunas, relações ou índices fora do modelo aprovado.
- Excluir ou alterar dados de produção sem autorização explícita.

### SHOULD

- Selecionar somente os campos necessários.
- Usar transação quando uma operação exigir atomicidade.
- Preferir constraints e RLS simples, auditáveis e testáveis.

## Decision rules

- **Se** o dado pertence a uma loja, **então** deve carregar a chave da loja e
  uma policy correspondente.
- **Se** o modelo aprovado não define entidade ou constraint, **então** marque
  `pending` e retorne ao planejamento.
- **Se** a operação atravessa mais de uma tabela, **então** verifique o
  isolamento de todas as tabelas envolvidas.

## Verification checklist

- [ ] Migrations aplicam conforme a estratégia aprovada.
- [ ] Usuário autorizado lê e altera somente a própria loja.
- [ ] Usuário sem autorização é bloqueado no banco.
- [ ] Constraints e índices relevantes foram testados.
- [ ] SQL não expõe dados de outra loja.

## Unknowns / not approved

- Entidades, colunas, índices e policies finais.
- Estratégia de migration e geração de tipos.
- ORM ou query builder; nenhum foi aprovado.

## Sources

- `AGENTS.md`
- `docs/workflow/checkpoint.md`
- `docs/data-model.md`, quando existir
- [PostgreSQL 17.6](https://www.postgresql.org/docs/17/)

## Change log

- `2026-08-22` — criado como guardrail multi-tenant para PostgreSQL 17.6.
