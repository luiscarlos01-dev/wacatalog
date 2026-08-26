# Implementation Plan: Catálogo público

**Branch**: `003-public-catalog` | **Date**: 2026-08-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-public-catalog/spec.md`

## Summary

Esta feature entrega a leitura pública do catálogo de uma loja: produtos
ativos e visíveis e banners ativos do hero, consumindo o contrato já
aprovado `GET /stores/{storeSlug}/catalog` (`docs/api/openapi.yaml`) sem
alteração. Como `hero_banners` (tabela) ainda não existe no banco — mesma
situação de `assets` antes da feature 002, mas sem bloquear nenhum user
story desta vez —, esta feature materializa a tabela para que a consulta
pública funcione; o CRUD administrativo de banners fica fora do escopo.
Carrinho, seleção de quantidade e envio via WhatsApp (PRD §4.5/§4.6)
permanecem fora do escopo.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Node.js 24.19.0

**Primary Dependencies**: Next.js 16.3.2 App Router, React 19.2.8,
`@supabase/supabase-js` 2.112.3, `@supabase/ssr` 0.12.4, Tailwind CSS 4.3.3.
Nenhuma dependência nova.

**Storage**: Supabase Postgres para `hero_banners` (RLS por loja para
escrita administrativa futura; leitura pública restrita a `is_active = true`
e aos campos aprovados). `products`/`assets`/`stores` já existem (features
001/002); esta feature só materializa `hero_banners`.

**Testing**: Vitest 4.1.10 para a regra de resolução pública (filtros de
ativo/visível, ordenação de banners, campos expostos); Playwright 1.62.1
para os dois user stories, loja inexistente, catálogo vazio e hero vazio,
em contextos desktop e mobile, sem sessão autenticada.

**Target Platform**: Next.js web application na Vercel, navegadores desktop
e mobile, sem exigência de sessão.

**Project Type**: Full-stack web application (mesma aplicação das features
001/002).

**Performance Goals**: Carregamento inicial priorizando mobile (PRD §1/§7);
sem meta numérica formal no PRD. Renderização padrão de Server Component
(ADR-0004 regra 2), sem cache/revalidação explícita — `docs/patterns/
nextjs.md` recomenda só adicionar cache após necessidade definida de
consistência, e o MVP não define uma.

**Constraints**: Rota pública não exige autenticação nem sessão (FR-008);
nenhum dado administrativo, preço ou de membership exposto (FR-004); todo
produto/banner exibido deriva exclusivamente da loja resolvida pelo slug da
URL, nunca de parâmetro alternativo (FR-009); leitura pública de `assets`
associados a conteúdo publicado já é uma policy aprovada (ADR-0003 regra 5,
`docs/data-model.md` §5); texto em PT-BR simples, WCAG 2.2 AA, preferência
de movimento reduzido.

**Scale/Scope**: Validação moderada reusa a loja e os produtos já
cadastrados pelas features 001/002; sem paginação/busca (até 50 produtos).
Segundo loja (feature 001) cobre o caso de "loja inexistente" sem precisar
de fixture nova além de um slug inválido.

## Constitution Check

_GATE: PASS — aguardando aprovação do mantenedor na etapa 09 antes de
qualquer execução pelo `implementer`._

- **Contract Before Code**: PASS — entidade e contrato HTTP já aprovados;
  nenhuma mudança de contrato é necessária, só implementação.
- **Simple and Accessible Experience**: PASS — dois user stories priorizados,
  sem login, PT-BR simples, mobile-first (ADR-0004 regra 2).
- **Tenant Isolation and Least Privilege**: PASS — toda leitura pública é
  escopada pelo `storeSlug` resolvido no servidor e reforçada por RLS
  (`docs/data-model.md` §5); nenhuma escrita nesta feature.
- **Evidence Before Completion**: PASS — Vitest, Playwright, typecheck,
  lint, build e revisão de segurança fazem parte do guia de validação.
- **Simplicity With Traceability**: PASS — nenhuma abstração nova; incluir a
  migration de `hero_banners` é rastreável à dependência de leitura da
  consulta pública (FR-005), não à expansão de escopo administrativo.

## Project Structure

### Documentation (this feature)

```text
specs/003-public-catalog/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── public-catalog.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (public)/
│   │   └── [storeSlug]/
│   │       ├── page.tsx                   # Server Component do catálogo
│   │       ├── not-found.tsx              # loja inexistente (FR-001)
│   │       └── components/
│   │           ├── product-card.tsx
│   │           ├── hero-banners.tsx
│   │           └── empty-catalog.tsx
│   └── stores/
│       └── [storeSlug]/
│           └── catalog/
│               └── route.ts               # GET /stores/{storeSlug}/catalog
│
├── features/public-catalog/
│   └── get-public-catalog.ts              # orquestra query + shape de resposta
│
├── lib/public-catalog/
│   └── query-public-catalog.ts            # query Supabase, filtros já aprovados
└── types/

supabase/
├── migrations/
│   └── 202608250000_hero_banners.sql
└── tests/

e2e/
└── public-catalog.spec.ts

tests/
└── unit/
```

**Structure Decision**: Mesma aplicação Next.js `src/` das features 001/002.
Página pública fica em `src/app/(public)/[storeSlug]/page.tsx` — URL curta
(`/{storeSlug}`), diferente do path do contrato HTTP (`/stores/{storeSlug}/
catalog`), seguindo o mesmo padrão já usado entre página e API do admin
(`/admin` vs `/admin/store`). O route handler que implementa o contrato
aprovado fica em `src/app/stores/[storeSlug]/catalog/route.ts`, espelhando o
path exato do OpenAPI. Página e route handler reusam a mesma função de
domínio (`src/lib/public-catalog/query-public-catalog.ts`), sem duplicar a
regra de filtro (ADR-0004 regra 6). Nenhuma segunda aplicação é introduzida.

## Browser validation design

- Rodar os dois user stories em projetos Playwright desktop e mobile, sem
  sessão autenticada, reusando a loja e os produtos já cadastrados pelas
  features 001/002.
- Cenário de loja inexistente: acessar um slug inválido e confirmar a
  mensagem clara em PT-BR, sem detalhe técnico.
- Cenário de catálogo vazio: usar uma segunda loja (já disponível da feature
  001 para isolamento) sem produtos publicados.
- Cenário de hero vazio: mesma loja sem banners ativos cadastrados.
- Cenário de hero com banners: inserir banners de teste diretamente via
  fixture/SQL (sem UI administrativa, fora do escopo desta feature).
- Validar WCAG 2.2 AA (4.5:1 texto normal, 3:1 texto grande/foco), navegação
  por teclado e preferência de movimento reduzido no viewport mobile.
- Confirmar que nenhuma chamada de rede do catálogo público inclui cabeçalho
  de autenticação nem expõe campo administrativo na resposta.

## Migration and access order

1. `202608250000_hero_banners.sql`: tabela `hero_banners` (campos, defaults
   e constraints de `docs/data-model.md` §2.5, incluindo `position` entre 1
   e 5, posição única por loja e limite de cinco banners por loja), grants
   mínimos e RLS: leitura pública restrita a `is_active = true` e aos campos
   aprovados; escrita reservada para uma futura feature de gestão
   administrativa de banners (sem policy de `INSERT`/`UPDATE`/`DELETE` além
   do necessário para os testes estruturais).
2. Validar a migration e a policy de leitura pública a partir de um banco
   Supabase local ou não produtivo vazio.

Os campos executáveis seguem os mesmos tipos já aprovados nas features
anteriores: `uuid` com `gen_random_uuid()`, `text`, `integer` com
`CHECK (position BETWEEN 1 AND 5)`, índice único parcial `(store_id,
position) WHERE is_active`, `boolean` com default `false` (mesmo padrão de
`products.is_visible`), e `timestamptz` com `now()` mantido por trigger em
`updated_at`.

## Complexity Tracking

Nenhuma violação de constituição. Materializar `hero_banners` nesta feature
não é complexidade não justificada: é a fonte de dado que a consulta
pública já aprovada precisa ler (FR-005); o CRUD administrativo continua
fora do escopo, evitando expansão não solicitada.
