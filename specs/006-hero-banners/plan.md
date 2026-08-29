# Implementation Plan: Banners do hero

**Branch**: `006-hero-banners` | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-hero-banners/spec.md`

## Summary

Esta feature entrega o CRUD e a reordenação administrativa dos banners do
hero da loja, sobre o contrato já aprovado (`docs/data-model.md` §2.5
`hero_banners`; `GET`/`POST /admin/banners`,
`PATCH`/`DELETE /admin/banners/{bannerId}`, `PUT /admin/banners/order` em
`docs/api/openapi.yaml`). Nenhum endpoint novo é necessário. Diferente das
features anteriores, a tabela existe desde a feature 003 mas **sem nenhum
privilégio administrativo concedido** — a migration original deixou isso
explícito como um débito reservado pra esta feature; o plano inclui essa
migration como parte necessária do trabalho, verificada contra o schema
real antes de virar task (lição da feature 005).

## Technical Context

**Language/Version**: TypeScript 6.0.3, Node.js 24.19.0

**Primary Dependencies**: Next.js 16.3.2 App Router, React 19.2.8,
`@supabase/supabase-js` 2.112.3. Nenhuma dependência nova.

**Storage**: Nenhuma tabela ou campo novo — `hero_banners` já existe
(`docs/data-model.md` §2.5, materializada na feature 003,
`supabase/migrations/202608250000_hero_banners.sql`). Falta privilégio
administrativo: `revoke all ... from authenticated` está lá desde a
criação, comentado explicitamente como reservado pra esta feature. Uma
migration nova concede `SELECT`/`INSERT`/`UPDATE`/`DELETE` a
`authenticated` com RLS escopada por `store_memberships`/`store_admin`,
mesmo padrão de `products` (feature 002, `202608240001_products.sql`) — ao
contrário de `stores` na feature 005 (achados A-1/A-2), aqui não há campo
sensível que a administradora não devesse poder escrever (nome/slug da
loja era do mantenedor; todo campo de `hero_banners` já é
administrativo por natureza), então o grant de tabela inteira + policy
escopada por linha (padrão `products`) é suficiente — não é necessário o
desenho via função `security definer` usado para contornar o achado A-2.

A unicidade de posição (`hero_banners_store_id_position_key`, índice único
parcial `where is_active`) já impõe, no banco, que dois banners **ativos**
da mesma loja nunca compartilhem posição — a RLS/grant novos não
precisam reforçar isso, só habilitar a escrita em si. O limite de 5
banners por loja **não** tem constraint de banco (nenhum trigger de
contagem existe); fica só na camada de aplicação (mesmo nível de garantia
que outras regras de negócio deste projeto, ex. SKU único em `products` é
DB-enforced mas limites de contagem não têm precedente de enforcement em
banco neste projeto) — o `contract-reviewer` deve testar isso
especificamente contra o banco real, já que grants diretos por RPC/API
poderiam teoricamente ignorar uma checagem só de aplicação.

**Testing**: Vitest 4.1.10 para as regras de domínio (limite de 5,
conflito de posição só entre ativos, desempate de listagem); Playwright
1.62.1 para os quatro user stories, desktop e mobile.

**Target Platform**: Next.js web application na Vercel (mesma aplicação
das features 001-005).

**Project Type**: Full-stack web application.

**Performance Goals**: Sem meta numérica independente.

**Constraints**: Autorização sempre server-side via `getAuthenticatedStore`
e RLS (ADR-0002), sem exceção; upload de imagem já resolvido por
`/admin/assets` (ADR-0009) — esta feature só referencia um `imageAssetId`
já existente, nunca recebe bytes de arquivo; exclusão exige confirmação
explícita (mesmo padrão de produtos, PRD §4.2).

**Scale/Scope**: No máximo 5 banners por loja (regra de negócio + índice
parcial já aprovados); reusa a loja e a administradora já provisionadas
pelas features 001-005.

## Constitution Check

_GATE: PASS — aguardando aprovação do mantenedor na etapa 09 antes de
qualquer execução pelo `implementer`._

- **Contract Before Code**: PASS — os cinco endpoints e os campos de
  `hero_banners` já estão aprovados; nenhuma mudança de contrato HTTP é
  necessária. A migration de privilégio (Storage acima) é infraestrutura
  pra tornar o contrato já aprovado executável, não uma mudança de
  contrato.
- **Simple and Accessible Experience**: PASS — quatro user stories,
  PT-BR simples, mesma área administrativa já existente (novo item de
  navegação, sem redesenhar o dashboard).
- **Tenant Isolation and Least Privilege**: PASS — toda operação escopada
  pela loja resolvida via `getAuthenticatedStore`/RLS; FR-010/SC-004
  cobrem isolamento cross-tenant; grant de privilégio novo segue
  exatamente o padrão já revisado de `products`.
- **Evidence Before Completion**: PASS — Vitest, Playwright, typecheck,
  lint, build e revisão de segurança fazem parte do guia de validação;
  teste pgTAP direto contra o banco real cobre o achado de privilégio
  (mesmo padrão que pegou os achados A-1/A-2 na feature 005).
- **Simplicity With Traceability**: PASS — nenhuma dependência nova,
  reusa o padrão de CRUD já aprovado em `products` (grant de tabela +
  RLS por linha, sem necessidade do desenho via função `security
  definer` da feature 005, já que não há coluna sensível a proteger
  aqui).

## Project Structure

### Documentation (this feature)

```text
specs/006-hero-banners/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── hero-banners.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/
├── app/(admin)/admin/
│   ├── page.tsx                          # ganha item de navegação/seção pra banners
│   └── banners/
│       ├── route.ts                      # GET/POST /admin/banners
│       ├── [bannerId]/route.ts           # PATCH/DELETE /admin/banners/{bannerId}
│       ├── order/route.ts                # PUT /admin/banners/order
│       └── components/
│           ├── banner-list.tsx           # lista ordenada por posição + estado ativo
│           ├── banner-form.tsx           # criar/editar (imagem, textos, posição, ativo)
│           └── delete-banner-dialog.tsx  # confirmação de exclusão definitiva
│
├── features/banners/
│   ├── list-banners.ts                   # chamadas client-side às rotas acima
│   ├── create-banner.ts
│   ├── update-banner.ts
│   ├── delete-banner.ts
│   └── reorder-banners.ts
│
└── lib/banners/
    ├── banner-row.ts                     # BANNER_COLUMNS + toAdminBanner (padrão product-row.ts)
    ├── banner-input-schema.ts            # Zod, padrão product-input-schema.ts
    ├── list-banners.ts
    ├── create-banner.ts                  # valida limite de 5; conflito de posição é do banco (índice parcial)
    ├── update-banner.ts
    ├── delete-banner.ts
    └── reorder-banners.ts

tests/
└── unit/banners/

e2e/
├── hero-banners.spec.ts
└── hero-banners.a11y.spec.ts

supabase/migrations/
└── 202608290000_hero_banners_admin_privileges.sql  # GRANT + RLS (SELECT/INSERT/UPDATE/DELETE), padrão `products`
```

**Structure Decision**: Mesma aplicação Next.js `src/` das features
001-005. Segue exatamente a estrutura de `admin/products/` (feature 002):
`route.ts` na coleção (`GET`/`POST`), `[bannerId]/route.ts` no item
(`PATCH`/`DELETE`), mais um `order/route.ts` dedicado pro `PUT` de
reordenação (não cabe no padrão de item nem de coleção, mesmo raciocínio
já usado pra `store/whatsapp/verification/route.ts` na feature 005: uma
ação que não é nem coleção nem item ganha seu próprio path). `lib/banners/`
e `features/banners/` (não `store-access`) porque o precedente real do
código nomeia esses diretórios pela entidade (`lib/products/`,
`features/products/` já existem assim), não pela feature — `store-access`
é específico do domínio de loja/autenticação (features 001/005), não um
diretório genérico. `create-banner.ts` reusa/espelha
`lib/products/verify-owned-asset.ts` pra validar que `imageAssetId`
pertence à própria loja, mesma regra já aprovada em `docs/data-model.md`
§2.5.

## Browser validation design

- Rodar os quatro user stories em Playwright desktop e mobile, reusando a
  loja/administrador já provisionados.
- Cenário de limite: criar 5 banners, confirmar que o 6º é rejeitado.
- Cenário de conflito de posição: dois banners ativos não podem dividir
  posição; um ativo e um inativo podem.
- Cenário de reordenação: com 2+ banners, enviar nova ordem completa e
  confirmar posições atualizadas.
- Cenário de exclusão: confirmar que cancelar a confirmação preserva o
  banner, e que confirmar remove definitivamente.
- Cenário cross-tenant: administrador B não consegue ver, criar, editar,
  excluir nem reordenar banners da loja A.
- Validar WCAG 2.2 AA, navegação por teclado no formulário e na lista
  (incluindo qualquer interação de reordenar), texto alternativo da
  descrição acessível refletido de verdade na imagem renderizada.

## Complexity Tracking

Nenhuma violação de constituição. Nenhuma tabela, entidade, endpoint ou
dependência nova — a feature inteira é comportamento administrativo sobre
um contrato e um schema já aprovados, mais a migration de privilégio que
a própria criação da tabela (feature 003) já previa como pendência desta
feature.
