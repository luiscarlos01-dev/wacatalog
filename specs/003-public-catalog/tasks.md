# Tasks: Catálogo público

**Input**: Design documents from `/specs/003-public-catalog/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/` and `quickstart.md`

**Tests**: Included because the project quality contract
(`CLAUDE.md` — Contrato de qualidade) requires unit tests for domain rules
and E2E tests for critical journeys, and because `spec.md` derives explicit
acceptance scenarios per user story.

**Gate**: These tasks define the implementation contract. Do not execute any
task below before the maintainer's Stage 09 approval. The documentation
session that authored this plan does not implement or review its own work;
execution belongs to the separate `implementer` session, and review to the
separate `contract-reviewer` session.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the feature's file boundaries and non-production test
fixtures without introducing product behavior.

- [ ] T001 Create the feature's module directories from `specs/003-public-catalog/plan.md` under `src/app/(public)/[storeSlug]/`, `src/app/stores/[storeSlug]/catalog/`, `src/features/public-catalog/`, `src/lib/public-catalog/`, and `e2e/`.
- [ ] T002 [P] Add the feature's non-production banner-seeding fixture (SQL insert helper, no UI) in `e2e/fixtures/public-catalog.ts`, for the "hero com banners" scenario.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Materialize `hero_banners` and the shared query function that
both user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete
and Stage 09 has been approved.

- [ ] T003 Create `supabase/migrations/202608250000_hero_banners.sql` implementing the `hero_banners` fields, defaults and constraints from `specs/003-public-catalog/data-model.md` (including the partial unique index on `(store_id, position) WHERE is_active`), least-privilege grants and RLS: public `SELECT` restricted to `is_active = true` and the approved public fields, no write policy (reserved for a future banner-management feature).
- [ ] T004 [P] Add structural pgTAP assertions in `supabase/tests/public-catalog.sql` for `hero_banners` fields, defaults, constraints, trigger, grants and the public-read RLS policy.
- [ ] T005 Run `supabase db reset` and `supabase test db` from an empty local or explicitly authorized non-production database, proving migration order (after `stores`/`store_memberships`/`assets`/`products`) and the read-only public policy (active banners readable, no write allowed, inactive banners never readable).
- [ ] T006 [P] Implement `src/lib/public-catalog/query-public-catalog.ts`: resolve the store by `storeSlug`, return only `is_active`+`is_visible` products and `is_active` banners ordered by `position`, and never include administrative/membership fields (`docs/data-model.md` §4).
- [ ] T007 [P] Add unit coverage for the query filters (active/visible products, active/ordered banners, no cross-store leakage, no administrative field present) in `tests/unit/public-catalog/query.test.ts`.

**Checkpoint**: The public-catalog data layer is ready. User story
implementation can begin.

---

## Phase 3: User Story 1 - Ver produtos publicados da loja (Priority: P1) 🎯 MVP

**Goal**: A cliente acessa o catálogo de uma loja e vê os produtos
publicados, sem login.

**Independent Test**: Acessar o catálogo de uma loja com produtos
ativos/visíveis e verificar que cada um aparece com nome, SKU (quando
houver), descrição, imagem e disponibilidade.

### Tests for User Story 1

- [ ] T008 [P] [US1] Playwright: catálogo de uma loja com produtos ativos/visíveis mostra cada um corretamente, sem exigir login, em `e2e/public-catalog.spec.ts`.
- [ ] T009 [P] [US1] Playwright: produto não visível, desativado, ou pertencente a outra loja não aparece no catálogo (nem produto nem, quando aplicável, banner de outra loja) — mesmo arquivo.
- [ ] T010 [P] [US1] Playwright: loja sem nenhum produto publicado mostra estado de catálogo vazio, sem erro — mesmo arquivo.
- [ ] T011 [P] [US1] Playwright: slug de loja inexistente mostra mensagem clara de "loja não encontrada" em PT-BR, sem detalhe técnico — mesmo arquivo.

### Implementation for User Story 1

- [ ] T012 [US1] Implement `GET /stores/{storeSlug}/catalog` em `src/app/stores/[storeSlug]/catalog/route.ts` (`200`/`404`), reusando `query-public-catalog.ts`, per `docs/api/openapi.yaml`.
- [ ] T013 [US1] Implement `src/features/public-catalog/get-public-catalog.ts` (orquestra a chamada de dado pro Server Component).
- [ ] T014 [US1] Implement `src/app/(public)/[storeSlug]/page.tsx` (Server Component) e `src/app/(public)/[storeSlug]/not-found.tsx` (loja inexistente).
- [ ] T015 [US1] Implement `src/app/(public)/[storeSlug]/components/product-card.tsx` e `empty-catalog.tsx`, PT-BR, sem preço.

**Checkpoint**: User Story 1 está completa e testável de forma
independente.

---

## Phase 4: User Story 2 - Ver banners do hero (Priority: P2)

**Goal**: A cliente vê os banners ativos no topo do catálogo, na ordem
configurada.

**Independent Test**: Acessar o catálogo de uma loja com banners ativos e
verificar que aparecem no topo, na ordem certa.

### Tests for User Story 2

- [ ] T016 [P] [US2] Playwright: banners ativos aparecem no topo do catálogo, na ordem de posição configurada, com descrição acessível, em `e2e/public-catalog.spec.ts`.
- [ ] T017 [P] [US2] Playwright: loja sem banners ativos mostra o catálogo sem a área de banners, sem erro — mesmo arquivo.

### Implementation for User Story 2

- [ ] T018 [US2] Implement `src/app/(public)/[storeSlug]/components/hero-banners.tsx` (ordenação por `position`, descrição acessível, título/texto opcional) e integrar em `page.tsx`; a resposta de `banners[]` já vem do endpoint implementado em T012, sem nova rota.

**Checkpoint**: User Stories 1 e 2 funcionam de forma independente.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T019 [P] Adicionar verificações de acessibilidade (contraste, teclado, movimento reduzido) em `e2e/public-catalog.a11y.spec.ts`.
- [ ] T020 [P] Rodar revisão de segurança (Semgrep) nas rotas novas, confirmando que nenhuma resposta pública inclui cabeçalho/estado de autenticação nem campo administrativo.
- [ ] T021 Rodar o gate completo de qualidade (`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build`, `pnpm test:e2e`) e registrar a evidência observada.
- [ ] T022 Executar o script de validação manual de `specs/003-public-catalog/quickstart.md` de ponta a ponta e registrar a evidência para a etapa 11.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup; bloqueia todos os user
  stories.
- **User Stories (Phase 3-4)**: dependem do Foundational completo; podem
  prosseguir em paralelo ou em ordem de prioridade (P1 → P2).
- **Polish (Phase 5)**: depende de todos os user stories desejados estarem
  completos.

### User Story Dependencies

- **US1 (P1)**: nenhuma dependência de outro user story; cria a rota e a
  página que US2 estende.
- **US2 (P2)**: reusa a rota/resposta já implementada por US1 (mesmo
  contrato retorna `products` e `banners` juntos); testável de forma
  independente com uma loja que já tenha banners de teste inseridos via
  fixture (T002).

### Parallel Opportunities

- Todas as tasks `[P]` do Setup e do Foundational podem rodar em paralelo
  entre si.
- T012-T015 (US1) e T018 (US2) tocam arquivos diferentes, exceto a
  integração final de `hero-banners.tsx` em `page.tsx` (T018 depende de
  T014 existir primeiro).

---

## Parallel Example: Foundational

```bash
Task: "Implement src/lib/public-catalog/query-public-catalog.ts"
Task: "Add unit coverage for the query filters in tests/unit/public-catalog/query.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Setup + Foundational (inclui `hero_banners`, mesmo que o MVP
   ainda não tenha banners cadastrados).
2. Completar User Story 1.
3. Validar US1 de forma independente antes de prosseguir.

### Incremental Delivery

1. Setup + Foundational → base pronta.
2. US1 → validar → demo (MVP: catálogo de produtos).
3. US2 → validar → demo (hero de banners).
4. Polish → evidência completa para a etapa 11.

## Notes

- `[P]` = arquivos diferentes, sem dependência entre si.
- `[US#]` mapeia a task ao user story correspondente em `spec.md`.
- Nenhuma task deste arquivo deve ser executada antes da aprovação humana da
  etapa 09.
- Achado fora de escopo (não uma task): `GET /stores/{storeSlug}/catalog`
  não documenta resposta `500` em `docs/api/openapi.yaml` — mesmo padrão já
  resolvido para `GET /admin/store` e registrado como pendente para
  `/admin/products*`/`/admin/assets`. Registrar para a mesma consolidação
  futura, não implementar aqui.
- CRUD administrativo de `hero_banners` (`/admin/banners*`, já aprovado em
  contrato) fica fora do escopo desta feature — fica para uma feature
  própria.
