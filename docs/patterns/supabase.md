---
title: Integração Supabase
scope: Fronteira entre a aplicação e Auth, Postgres e Storage
status: proposed
applies_to: "clientes Supabase, queries, auth e uploads"
source_of_truth: "AGENTS.md; docs/adrs/0001-autenticacao-com-supabase-auth.md"
last_reviewed: 2026-08-22
version_baseline: "@supabase/supabase-js 2.112.3; @supabase/ssr 0.12.4"
documentation_snapshot: "Context7 /supabase/supabase-js e /supabase/supabase em 2026-08-22; pacotes oficiais consultados"
related_patterns: [nextjs, supabase-auth, supabase-postgres, supabase-storage, security]
---

# Integração Supabase

## Contract summary

Supabase fornece Postgres, Storage e Auth. O baseline de cliente proposto é
`@supabase/supabase-js 2.112.3` com `@supabase/ssr 0.12.4` para sessões SSR.

## Non-negotiable rules

### MUST

- Escopar todo dado pertencente a uma loja pela loja correta.
- Aplicar autorização no banco quando o recurso for tenant-owned, além da
  validação na aplicação quando necessário.
- Manter chaves privilegiadas exclusivamente no servidor confiável.
- Tratar dados retornados pelo Supabase como dados de fronteira e verificar
  erros explicitamente.
- Usar `@supabase/ssr` para cookies e sessões SSR quando o Next.js exigir.

### MUST NOT

- Enviar `service_role` para o browser.
- Usar cliente administrativo para contornar RLS em fluxo de usuário.
- Aceitar `storeId`/`tenantId` do cliente como autorização.
- Logar payloads com tokens, credenciais ou PII desnecessária.

### SHOULD

- Centralizar criação/configuração de clientes para evitar divergência.
- Manter queries próximas ao caso de uso e com seleção explícita de campos.
- Propagar erros seguros e preservar contexto para observabilidade sem segredos.

## Integration boundaries

- Auth: [`supabase-auth.md`](./supabase-auth.md).
- Banco e RLS: [`supabase-postgres.md`](./supabase-postgres.md).
- Arquivos: [`supabase-storage.md`](./supabase-storage.md).

## Unknowns / not approved

- Estratégia exata de SSR, cookies e refresh de sessão.
- Convenção final de migrations, buckets e nomes de policies.

## Verification checklist

- [ ] Caminho autorizado e não autorizado testado.
- [ ] Isolamento entre duas lojas testado.
- [ ] Nenhum segredo aparece no bundle, logs ou resposta.
- [ ] Erros do serviço são tratados sem mascarar falhas reais.

## Sources

- `AGENTS.md`
- `docs/adrs/0001-autenticacao-com-supabase-auth.md`
- [Supabase JS](https://github.com/supabase/supabase-js)
- [Supabase SSR](https://github.com/supabase/ssr)

## Change log

- `2026-08-22` — criado para a fundação Supabase com versões propostas.
