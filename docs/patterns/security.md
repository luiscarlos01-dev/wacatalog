---
title: Segurança e segredos
scope: Credenciais, autorização, entrada externa, logs e dependências
status: established
applies_to: "backend, frontend, dados, CI e integrações externas"
source_of_truth: "AGENTS.md; docs/adrs/0001-autenticacao-com-supabase-auth.md"
last_reviewed: 2026-08-22
version_baseline: "N/A — controles transversais; SDKs em versions.md"
documentation_snapshot: "N/A — regras do repositório e ADR em 2026-08-22"
related_patterns: [nextjs, supabase, supabase-auth, supabase-postgres, vercel]
---

# Segurança e segredos

## Contract summary

Segredos nunca podem aparecer em código, logs, commits, documentação ou chat.
Autorização deve ser tenant-aware e aplicada no servidor/banco, não só na UI.

## Non-negotiable rules

### MUST

- Manter senhas, tokens, chaves privadas e credenciais de service role fora do
  repositório e do output público.
- Validar e autorizar toda entrada externa na borda.
- Escopar acesso à loja autenticada e às policies correspondentes.
- Minimizar PII em logs e respostas.
- Revisar dependências novas por risco de supply chain.

### MUST NOT

- Logar headers de autorização, cookies, senhas, tokens ou PII desnecessária.
- Aceitar identidade, tenant ou papel vindo apenas do browser.
- Expor stack trace, SQL, segredo ou detalhe interno ao usuário.
- Ler arquivos protegidos do ambiente por rotas alternativas.

### SHOULD

- Usar mensagens de erro seguras e úteis.
- Aplicar menor privilégio por cliente, rota, bucket e policy.
- Rodar análise estática de segurança quando disponível.

## Verification checklist

- [ ] Busca por segredos em arquivos e diff.
- [ ] Bundle não contém chaves privadas ou service role.
- [ ] Fluxos sem autenticação e cross-tenant são negados.
- [ ] Logs e erros não expõem dados sensíveis.
- [ ] Dependências novas foram revisadas.

## Unknowns / not approved

- Ferramenta final de secret scanning, headers, rate limiting e observabilidade.
- Modelo completo de ameaças e política de retenção de logs.

## Sources

- `AGENTS.md`
- `docs/adrs/0001-autenticacao-com-supabase-auth.md`
- `docs/workflow/quality-gates.md`

## Change log

- `2026-08-22` — criado a partir das invariantes de segurança do projeto.
