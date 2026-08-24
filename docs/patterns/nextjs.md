---
title: Next.js
scope: Aplicação full-stack, renderização, rotas e fronteiras server/client
status: proposed
applies_to: "app Next.js, páginas, layouts, route handlers e server actions"
source_of_truth: "AGENTS.md; docs/workflow/tech-spec.md"
last_reviewed: 2026-08-22
version_baseline: "Next.js 16.3.2; Node.js >=20.9.0; alvo do projeto Node 24.19.0"
documentation_snapshot: "pacote oficial Next.js consultado em 2026-08-22"
related_patterns: [typescript, react, supabase, security, vercel]
---

# Next.js

## Contract summary

Next.js `16.3.2` é o framework full-stack proposto e será hospedado na Vercel.
A documentação da versão exige Node.js `>=20.9.0`; o baseline do projeto usa
Node `24.19.0`.

## Non-negotiable rules

### MUST

- Respeitar a fronteira entre código server-only e código executado no browser.
- Manter segredos e clientes administrativos apenas no servidor.
- Derivar autorização do usuário autenticado e da loja, nunca de parâmetros
  fornecidos pelo cliente isoladamente.
- Tratar cada route handler/server action como borda: validar, autorizar e
  retornar erro seguro.
- Usar App Router somente após a decisão do projeto; a documentação alvo o
  recomenda nos defaults atuais, mas o contrato local ainda não o aprovou.

### MUST NOT

- Importar credenciais administrativas ou módulos server-only em Client
  Components.
- Confiar em `tenantId` enviado pelo browser sem verificar sessão e loja.
- Colocar lógica de negócio crítica somente em código cliente.
- Misturar instruções de Pages Router e App Router sem declarar a versão/rota.

### SHOULD

- Preferir renderização server-side para dados que não exigem interatividade.
- Manter handlers finos, delegando regras de domínio para funções testáveis.
- Usar cache e revalidação somente após definir a necessidade de consistência.

## Decision rules

- **Se** o código precisa de segredo, sessão confiável ou acesso administrativo,
  **então** ele deve permanecer server-only.
- **Se** a UI precisa de evento, estado local ou API do browser, **então** a
  menor fronteira client-side necessária deve ser criada.
- **Se** a rota não está no contrato aprovado, **então** marque como `pending`.

## Verification checklist

- [ ] Typecheck, lint e build executados.
- [ ] Fronteiras server/client revisadas.
- [ ] Rotas e payloads comparados ao contrato aprovado.
- [ ] Browser QA em mobile e desktop quando houver UI.
- [ ] Node local, CI e Vercel usam o baseline compatível.

## Unknowns / not approved

- App Router versus Pages Router.
- Runtime por rota, Server Actions, cache e biblioteca de UI.

## Sources

- `AGENTS.md`
- `docs/workflow/tech-spec.md`
- [Next.js no npm](https://www.npmjs.com/package/next)

## Change log

- `2026-08-22` — baseline alinhado à Tech Spec e Next.js 16.3.2.
