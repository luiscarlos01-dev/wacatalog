---
title: Supabase Auth
scope: Login, logout, sessão, provisionamento e recuperação
status: proposed
applies_to: "fluxos de autenticação e código que acessa sessão"
source_of_truth: "docs/adrs/0001-autenticacao-com-supabase-auth.md; AGENTS.md"
last_reviewed: 2026-08-22
version_baseline: "@supabase/supabase-js 2.112.3; @supabase/ssr 0.12.4"
documentation_snapshot: "Context7 /supabase/supabase e /supabase/ssr em 2026-08-22"
related_patterns: [supabase, nextjs, security]
---

# Supabase Auth

## Contract summary

O MVP usa Supabase Auth com email e senha, contas provisionadas pelo mantenedor,
sessão persistente em dispositivo confiável e recuperação por email. Não há
cadastro público, OAuth, Cognito ou MFA.

## Non-negotiable rules

### MUST

- Criar contas por operação administrativa server-only.
- Usar `@supabase/ssr` para o cliente SSR quando o fluxo Next.js for definido.
- Verificar a sessão no servidor com o método recomendado pela documentação da
  versão, sem confiar apenas em dados de cookie não validados.
- Oferecer login, logout, sessão persistente e recuperação em PT-BR simples.
- Permitir suporte do mantenedor sem solicitar, registrar ou retransmitir senha.
- Verificar identidade e loja antes de acessar recurso tenant-owned.

### MUST NOT

- Criar tela ou endpoint de cadastro público.
- Colocar `service_role` no browser, repositório, logs ou documentação.
- Armazenar ou logar senha, token ou credencial inicial.
- Implementar OAuth, Cognito ou MFA no MVP.

### SHOULD

- Explicar falhas de recuperação sem revelar se um email existe.
- Oferecer saída explícita da conta em dispositivo confiável.
- Testar sessão expirada e acesso sem autorização.

## Decision rules

- **Se** a operação cria ou gerencia usuários, **então** use contexto
  administrativo server-only.
- **Se** a operação é iniciada pela administradora, **então** use fluxo de
  usuário autenticado e policies normais.
- **Se** o mantenedor precisa ajudar, **então** oriente recuperação; nunca peça
  a senha.

## Verification checklist

- [ ] Login válido e inválido.
- [ ] Logout e sessão persistente.
- [ ] Sessão expirada ou inválida.
- [ ] Recuperação por email.
- [ ] Acesso de uma loja não alcança outra.
- [ ] Busca por segredos no bundle e nos logs.

## Unknowns / not approved

- Duração e renovação exatas de sessão.
- Implementação final de middleware/proxy e cookies no Next.js.
- Configuração operacional de email.

## Sources

- `docs/adrs/0001-autenticacao-com-supabase-auth.md`
- `docs/workflow/checkpoint.md`
- [Supabase Auth](https://supabase.com/docs/reference/javascript/auth)
- [Supabase SSR](https://github.com/supabase/ssr/tree/v0.12.4)

## Change log

- `2026-08-22` — criado para o baseline Supabase Auth proposto.
