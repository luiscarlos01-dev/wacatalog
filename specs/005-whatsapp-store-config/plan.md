# Implementation Plan: WhatsApp da loja

**Branch**: `005-whatsapp-store-config` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-whatsapp-store-config/spec.md`

## Summary

Esta feature entrega a configuração, normalização, teste e confirmação do
número de WhatsApp da loja, sobre o contrato já aprovado
(`docs/data-model.md` §2.1, `PATCH /admin/store` e
`POST /admin/store/whatsapp/verification` em `docs/api/openapi.yaml`).
Nenhum endpoint novo é necessário — os dois já existem no contrato, sem
implementação ainda. O algoritmo de normalização usa exatamente o padrão
já aprovado em outro schema do mesmo contrato (`^55[0-9]{10,11}$`, visto
em `PublicCatalog`), sem inventar regra nova de validação de DDD.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Node.js 24.19.0

**Primary Dependencies**: Next.js 16.3.2 App Router, React 19.2.8,
`@supabase/supabase-js` 2.112.3. Nenhuma dependência nova — normalização é
manipulação de string simples, sem necessidade de biblioteca de telefone
internacional (fora de escopo: só números brasileiros, já com padrão fixo
no contrato aprovado).

**Storage**: Nenhuma tabela nova, nenhum campo novo. `stores.whatsapp_number`,
`whatsapp_verification_status`, `whatsapp_verified_at` já existem
(`docs/data-model.md` §2.1, materializados desde a feature 001).

**Correção 2026-08-28 (achado A-1 do `contract-reviewer`)**: esta premissa
de "nenhuma migration necessária" estava incompleta — a feature 001 só
concedeu `SELECT` em `stores` para `authenticated`; nenhuma feature até
aqui concedeu `UPDATE` nem criou policy de `UPDATE`. `PATCH /admin/store` e
`POST /admin/store/whatsapp/verification` falham com `42501 permission
denied` contra o banco real sem uma migration nova cobrindo isso
(`tasks.md` T025). Mesma classe de lacuna já vista na feature 003
("plano assumiu privilégio que feature anterior revogou/nunca concedeu") —
vale virar checagem fixa de planejamento ao escrever numa tabela de outra
feature.

**Correção 2026-08-28 (achado A-2 do `contract-reviewer`, sobre a correção
acima)**: o `grant update on table` de T025 era de tabela inteira — a
policy de RLS só escopa linha, não coluna. Uma administradora conseguia
escrever `name`/`slug`/status de verificação diretamente. Substituído
(`tasks.md` T028-T030) por duas funções `security definer` que resolvem a
loja só via sessão, sem nenhum `UPDATE` direto concedido a `authenticated`.
Terceira ocorrência do mesmo tipo de lacuna nesta feature (grant/privilégio
de banco mal escopado) — reforça que virar checagem fixa de planejamento
não é opcional.

**Testing**: Vitest 4.1.10 para a normalização/validação de número
(formatos aceitos, rejeitados, e o reset de verificação ao alterar);
Playwright 1.62.1 para os dois user stories, desktop e mobile.

**Target Platform**: Next.js web application na Vercel (mesma aplicação
das features 001-004).

**Project Type**: Full-stack web application.

**Performance Goals**: Sem meta numérica independente.

**Constraints**: Autorização sempre server-side via `getAuthenticatedStore`
e RLS (ADR-0002), sem exceção; normalização determinística, sem chamada a
serviço externo de validação de telefone; teste abre o link `wa.me` sem
mensagem pré-preenchida (FR-005); alterar o número sempre reseta a
verificação, sem exceção (FR-004, já uma regra aprovada em
`docs/data-model.md` §2.1).

**Emenda 2026-08-28 (pedido do mantenedor, pós-teste manual)**: o campo de
número ganha máscara de digitação (FR-011) — só dígitos, formatação
`(DD) NNNNN-NNNN`/`(DD) NNNN-NNNN` em tempo real. Mesma restrição de "sem
dependência nova" já valia pra normalização; a máscara é uma função pura
sem biblioteca de telefone, mesmo espírito. Validação/normalização
server-side (FR-002/FR-003) não muda — a máscara é só uma restrição de UI
sobre o campo já existente.

**Scale/Scope**: Validação moderada reusa a loja e a administradora já
provisionadas pelas features 001-004.

## Constitution Check

_GATE: PASS — aguardando aprovação do mantenedor na etapa 09 antes de
qualquer execução pelo `implementer`._

- **Contract Before Code**: PASS — os dois endpoints e os três campos já
  estão aprovados desde a feature 001; nenhuma mudança de contrato é
  necessária.
- **Simple and Accessible Experience**: PASS — dois user stories, PT-BR
  simples, sem tela nova (extensão do dashboard já existente,
  `admin/page.tsx`).
- **Tenant Isolation and Least Privilege**: PASS — toda operação escopada
  pela loja resolvida via `getAuthenticatedStore`/RLS; FR-008/SC-005
  cobrem isolamento cross-tenant.
- **Evidence Before Completion**: PASS — Vitest, Playwright, typecheck,
  lint, build e revisão de segurança fazem parte do guia de validação.
- **Simplicity With Traceability**: PASS — nenhuma dependência nova,
  nenhuma abstração nova; reusa exatamente o padrão de normalização já
  aprovado em `PublicCatalog`.

## Project Structure

### Documentation (this feature)

```text
specs/005-whatsapp-store-config/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── whatsapp-store-config.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/
├── app/(admin)/admin/
│   ├── page.tsx                          # ganha a seção de WhatsApp
│   ├── store/route.ts                    # já existe (GET); ganha PATCH
│   └── store/whatsapp/
│       └── verification/route.ts         # POST /admin/store/whatsapp/verification
│   └── components/
│       └── whatsapp-settings.tsx         # formulário + teste + confirmação
│
├── features/store-access/
│   └── update-store-whatsapp.ts          # chamadas client-side às rotas acima
│
└── lib/store/
    ├── normalize-whatsapp-number.ts      # aceita formatos familiares, valida ^55[0-9]{10,11}$
    ├── format-whatsapp-input.ts          # máscara de digitação client-side (FR-011)
    ├── update-store-whatsapp.ts          # mutação + reset de verificação
    └── confirm-store-whatsapp.ts         # confirmação: verified + timestamp

tests/
└── unit/store/

e2e/
└── whatsapp-store-config.spec.ts

supabase/migrations/
├── 202608280000_stores_whatsapp_update_policy.sql   # T025 — GRANT UPDATE + policy escopada (achado A-1, superada por T028)
├── 202608280001_public_catalog_whatsapp_visibility.sql  # T026 — resolve_public_store: só devolve número verificado (achado L-1)
└── 202608280002_stores_whatsapp_write_functions.sql  # T028 — revoga o grant/policy de T025; duas funções security definer (achado A-2)
```

**Structure Decision**: Mesma aplicação Next.js `src/` das features
001-004. `PATCH /admin/store` é adicionado ao `route.ts` já existente
(que só tinha `GET`, feature 001) em vez de criar um arquivo novo — mesmo
padrão de acumular métodos HTTP no mesmo path que `/admin/products/{id}`
já usa (`GET`/`PATCH`/`DELETE` no mesmo arquivo). A seção de configuração
de WhatsApp fica no dashboard já existente (`admin/page.tsx`), sem rota
nova — mesma decisão já tomada para a lista de produtos (feature 002,
achado L-1: `page.tsx` e `route.ts` não coexistem no mesmo segmento do App
Router).

## Browser validation design

- Rodar os dois user stories em Playwright desktop e mobile, reusando a
  loja/administrador já provisionados.
- Cenário de normalização: testar ao menos três formatos de entrada
  familiares (com `+55`, com `55` sem `+`, só DDD+número) resultando no
  mesmo valor normalizado.
- Cenário de reset: configurar, confirmar, alterar para outro número,
  confirmar que o status volta a "não confirmado".
- Cenário de conflito: tentar confirmar verificação sem número configurado
  (loja recém-criada ou número nunca definido), esperar rejeição clara.
- Cenário cross-tenant: administrador B não consegue alterar nem confirmar
  o WhatsApp da loja A.
- Validar WCAG 2.2 AA, navegação por teclado no formulário, e que o link
  de teste abre em nova aba/janela sem perder o estado do formulário.

## Complexity Tracking

Nenhuma violação de constituição. Nenhuma tabela, endpoint ou dependência
nova — a feature inteira é comportamento sobre um contrato e um schema já
aprovados. Duas migrations novas foram adicionadas em 2026-08-28 (achados
A-1/L-1 do `contract-reviewer`), mas são correções de privilégio/semântica
sobre `stores` já existente, não schema novo — ver as duas seções de
correção acima e `data-model.md` desta feature.
