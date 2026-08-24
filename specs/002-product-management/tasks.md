# Tasks: Gestão de produtos

**Input**: Design documents from `/specs/002-product-management/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/` and `quickstart.md`

**Tests**: Included because the project quality contract
(`CLAUDE.md` — Contrato de qualidade) requires unit tests for domain rules and
E2E tests for critical journeys (product management, tenant isolation,
uploads), and because `spec.md` derives explicit acceptance scenarios per
user story.

**Gate**: These tasks define the implementation contract. Do not execute any
task below before the maintainer's Stage 09 approval. The documentation
session that authored this plan does not implement or review its own work;
execution belongs to the separate `implementer` session, and review to the
separate `contract-reviewer` session.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the feature's file boundaries and non-production test
fixtures without introducing product behavior.

- [x] T001 Create the feature's module directories from `specs/002-product-management/plan.md` under `src/app/(admin)/admin/products/`, `src/app/(admin)/admin/assets/`, `src/features/products/`, `src/features/assets/`, `src/lib/products/`, `src/lib/assets/`, and `e2e/`.
- [x] T002 [P] Add local Supabase Storage bucket configuration (`catalog-assets`, public read) to `supabase/config.toml` for local dev parity with the bucket created by the migration in Phase 2.
- [x] T003 [P] Add the feature's non-production image fixture contract (expected local file paths for a valid JPEG, a valid HEIC, an oversized file, and an unsupported format) in `e2e/fixtures/product-management.ts`, without committing binary fixtures to the repository.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Materialize `assets` and `products`, their Storage bucket/policies,
and the shared data-access layer that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete and
Stage 09 has been approved. `assets` blocks `products` (FK `image_asset_id`),
and both block every user story because `imageAssetId` is required to create
a product.

- [x] T004 Create `supabase/migrations/202608240000_assets.sql` implementing the `assets` fields, defaults and constraints from `specs/002-product-management/data-model.md` (no `kind` column — see that document's note), least-privilege grants and RLS scoped to `store_id`, with no `UPDATE` policy.
- [x] T005 In the same migration, create the `catalog-assets` Storage bucket (public read per ADR-0003 rule 5) and its object policies: public `SELECT`, `INSERT`/`DELETE` restricted to the authenticated store's own path segment.
- [x] T006 Create `supabase/migrations/202608240001_products.sql`, applied after `assets`, implementing the `products` fields, defaults and constraints from `specs/002-product-management/data-model.md` (including the partial unique index on `store_id`+`sku` and the `updated_at` trigger), least-privilege grants and RLS scoped to `store_id`.
- [x] T007 [P] Add structural pgTAP assertions in `supabase/tests/product-management.sql` for both tables' fields, defaults, constraints, trigger, grants, RLS and the bucket's object policies.
- [x] T008 Run `supabase db reset` and `supabase test db` from an empty local or explicitly authorized non-production database, proving migration order and the full policy matrix: own-store CRUD allowed, cross-store denied, anonymous denied except public asset read.
- [x] T009 [P] Implement content-based image validation and WebP normalization in `src/lib/assets/create-asset.ts` (`sharp`, per ADR-0003 and `docs/patterns/supabase-storage.md`), rejecting any file whose real content does not match an accepted format regardless of extension or declared `Content-Type`, and generating the system path `{storeId}/{kind}/{assetId}.webp`.
- [x] T010 [P] Implement `src/lib/assets/delete-asset-if-orphaned.ts`, removing the Storage object and row only when no remaining `products`/`hero_banners` row references the same asset (`research.md` decision).
- [x] T011 Implement `POST /admin/assets` in `src/app/(admin)/admin/assets/route.ts`, reusing `getAuthenticatedStore` and returning `201`/`400`/`401`/`403`/`413`/`415` per `docs/api/openapi.yaml`.
- [x] T012 [P] Add unit coverage for content-based validation, normalization failure and rejection cases, and for `delete-asset-if-orphaned.ts` (asset kept when another `products`/`hero_banners` row still references it, removed when it is the sole reference) in `tests/unit/product-management/assets.test.ts`.
- [x] T013 [P] Implement `src/lib/products/list-products.ts` and `src/lib/products/create-product.ts` (store-scoped query/insert, SKU uniqueness surfaced as a `409` condition, defaults per `data-model.md`).
- [x] T014 [P] Implement `src/lib/products/update-product.ts`, `src/lib/products/delete-product.ts` and `src/lib/products/set-product-lifecycle.ts` (deactivate/reactivate; reactivate always resets `is_visible`/`is_orderable` to `false` regardless of prior state, per PRD regra 7).
- [x] T015 [P] Add unit coverage for SKU uniqueness, default states, negative-quantity rejection (`quantity_available >= 0`) and the reactivate reset behavior in `tests/unit/product-management/products.test.ts`.

**Checkpoint**: `assets` and `products` data layer, Storage bucket and the
`POST /admin/assets` endpoint are ready. User story implementation can begin.

---

## Phase 3: User Story 1 - Cadastrar e visualizar produtos da loja (Priority: P1) 🎯 MVP

**Goal**: A administradora cadastra um produto com imagem e vê a lista de
produtos da própria loja.

**Independent Test**: Cadastrar um produto com nome, descrição, imagem e
quantidade e verificar que ele aparece na lista da própria loja com
visibilidade/disponibilidade desligadas por padrão.

### Tests for User Story 1

- [x] T016 [P] [US1] Playwright: cadastrar produto com imagem válida e ver o produto na lista com os estados padrão em `e2e/product-management.spec.ts`; incluir a negação cross-tenant de leitura (administrador B não vê nem acessa por URL direta o `productId` da loja A).
- [x] T017 [P] [US1] Playwright: cadastro com SKU duplicado é rejeitado sem criar o produto (mesmo arquivo).

### Implementation for User Story 1

- [x] T018 [US1] Implement `GET`/`POST /admin/products` in `src/app/(admin)/admin/products/route.ts`, retornando `200`/`201`/`400`/`401`/`403`/`409`/`422` per `docs/api/openapi.yaml`.
- [x] T019 [US1] Implement `src/features/products/list-products.ts` e `src/features/products/save-product.ts` (chamadas client-side às rotas acima).
- [x] T020 [US1] Implement `src/app/(admin)/admin/page.tsx` (Server Component da lista de produtos, movida do `products/page.tsx` original porque `page.tsx` e `route.ts` não podem coexistir no mesmo segmento do App Router) e `src/app/(admin)/admin/products/components/product-list.tsx`, incluindo estado vazio.
- [x] T021 [US1] Implement `src/app/(admin)/admin/products/components/product-form.tsx` (modo criar), com upload de imagem, rótulos/erros em PT-BR e feedback de conflito de SKU.

**Checkpoint**: User Story 1 está completa e testável de forma independente.

---

## Phase 4: User Story 2 - Editar produto e controlar visibilidade/disponibilidade (Priority: P2)

**Goal**: A administradora edita campos do produto e liga/desliga
visibilidade e disponibilidade de forma independente.

**Independent Test**: Editar um produto existente e alternar visibilidade e
disponibilidade separadamente, verificando que cada alteração não afeta a
outra.

### Tests for User Story 2

- [x] T022 [P] [US2] Playwright: editar campos e alternar visibilidade/disponibilidade de forma independente em `e2e/product-management.spec.ts`; incluir (a) substituição de imagem, verificando que a imagem anterior continua resolvendo até a nova persistir (FR-013), e (b) edição com SKU já usado por outro produto da mesma loja rejeitada sem alterar o produto (FR-005).
- [x] T023 [P] [US2] Playwright: administrador B tenta editar produto da loja A pela URL direta e é negado sem revelar dados (mesmo arquivo).

### Implementation for User Story 2

- [x] T024 [US2] Implement `GET`/`PATCH /admin/products/{productId}` em `src/app/(admin)/admin/products/[productId]/route.ts` (`200`/`400`/`401`/`403`/`404`/`409`/`422`), com `404` cross-tenant (nunca `403` que confirme existência de produto de outra loja).
- [x] T025 [US2] Estender `src/features/products/save-product.ts` para modo edição e `src/features/products/list-products.ts` para refletir a atualização.
- [x] T026 [US2] Estender `product-form.tsx` para modo edição (preenchido, substituição de imagem preservando a anterior até a nova persistir — FR-013) e os controles independentes de visibilidade/disponibilidade em `product-list.tsx`/`product-form.tsx`.

**Checkpoint**: User Stories 1 e 2 funcionam de forma independente.

---

## Phase 5: User Story 3 - Desativar produto preservando o cadastro (Priority: P3)

**Goal**: A administradora desativa um produto sem perder o cadastro.

**Independent Test**: Desativar um produto visível/disponível e confirmar que
ele some da simulação pública/carrinho mas continua na lista administrativa
como inativo, com o cadastro preservado.

### Tests for User Story 3

- [x] T027 [P] [US3] Playwright: desativar produto e confirmar preservação do cadastro na lista administrativa; verificar a elegibilidade pública/carrinho (`is_active`/`is_visible`/`is_orderable`) consultando a regra de `docs/data-model.md` §2.4 diretamente na camada de dados (`src/lib/products/`), já que o catálogo público não existe nesta feature (ver `data-model.md` "Fora do escopo"). Incluir a negação cross-tenant de desativar em `e2e/product-management.spec.ts`.

### Implementation for User Story 3

- [x] T028 [US3] Implement `POST /admin/products/{productId}/deactivate` em `src/app/(admin)/admin/products/[productId]/deactivate/route.ts`.
- [x] T029 [US3] Adicionar controle de desativar em `product-list.tsx`/`product-form.tsx`, com indicação visível do estado ativo/inativo.

**Checkpoint**: User Stories 1-3 funcionam de forma independente.

---

## Phase 6: User Story 4 - Reativar produto reconfigurando visibilidade e disponibilidade (Priority: P4)

**Goal**: A administradora reativa um produto desativado, sempre exigindo
nova configuração de visibilidade/disponibilidade.

**Independent Test**: Reativar um produto previamente visível/disponível e
confirmar que volta ativo com visibilidade e disponibilidade desligadas.

### Tests for User Story 4

- [x] T030 [P] [US4] Playwright: reativar produto e confirmar reset de visibilidade/disponibilidade independentemente do estado anterior em `e2e/product-management.spec.ts`; incluir a negação cross-tenant de reativar.

### Implementation for User Story 4

- [x] T031 [US4] Implement `POST /admin/products/{productId}/reactivate` em `src/app/(admin)/admin/products/[productId]/reactivate/route.ts`, sempre gravando `isVisible=false`/`isOrderable=false`.
- [x] T032 [US4] Adicionar controle de reativar e mensagem explicando que visibilidade/disponibilidade precisam ser reconfiguradas.

**Checkpoint**: User Stories 1-4 funcionam de forma independente.

---

## Phase 7: User Story 5 - Excluir produto definitivamente (Priority: P5)

**Goal**: A administradora exclui um produto definitivamente só após
confirmação explícita e irreversível.

**Independent Test**: Acionar excluir, cancelar (produto preservado) e depois
confirmar (produto removido permanentemente de toda listagem).

### Tests for User Story 5

- [x] T033 [P] [US5] Playwright: texto exato do aviso (PRD §6) e as duas ações; cancelar preserva, confirmar remove definitivamente; cobrir foco/teclado no diálogo; incluir a negação cross-tenant de excluir, em `e2e/product-management.spec.ts`.

### Implementation for User Story 5

- [x] T034 [US5] Implement `DELETE /admin/products/{productId}` em `src/app/(admin)/admin/products/[productId]/route.ts`, chamando `delete-asset-if-orphaned` (T010) após a remoção do produto.
- [x] T035 [US5] Implement `src/app/(admin)/admin/products/components/delete-product-dialog.tsx` com o texto literal do PRD §6, ações `Cancelar`/`Excluir definitivamente`, foco inicial no controle seguro (`Cancelar`) e fechamento por `Esc`.

**Checkpoint**: Todos os cinco user stories funcionam de forma independente.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T036 [P] Adicionar verificações de acessibilidade (contraste, teclado, movimento reduzido) em `e2e/product-management.a11y.spec.ts`.
- [x] T037 [P] Rodar revisão de segurança (Semgrep) nas rotas e módulos novos que tocam autorização e Storage antes de reportar evidência.
- [x] T038 Rodar o gate completo de qualidade (`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build`, `pnpm test:e2e`) e registrar a evidência observada.
- [x] T039 Executar o script de validação manual de `specs/002-product-management/quickstart.md` de ponta a ponta e registrar a evidência para a etapa 11.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — pode começar imediatamente após o
  gate 09.
- **Foundational (Phase 2)**: depende do Setup; bloqueia todos os user
  stories. `assets` (T004-T005) bloqueia `products` (T006) pela FK.
- **User Stories (Phase 3-7)**: todos dependem do Foundational completo.
  Podem prosseguir em paralelo se houver mais de um implementador, ou em
  ordem de prioridade (P1 → P2 → P3 → P4 → P5).
- **Polish (Phase 8)**: depende de todos os user stories desejados estarem
  completos.

### User Story Dependencies

- **US1 (P1)**: nenhuma dependência de outro user story.
- **US2 (P2)**: reusa a rota de detalhe criada por US1 indiretamente
  (`[productId]/route.ts` recebe `GET` em US1 e `PATCH`/`DELETE` depois), mas
  é testável de forma independente com um produto já existente.
- **US3 (P3)**: testável de forma independente com um produto já existente.
- **US4 (P4)**: depende de um produto já desativado existir (US3), mas o
  fluxo em si é independente.
- **US5 (P5)**: testável de forma independente com um produto já existente;
  reusa `[productId]/route.ts` para o método `DELETE` (mesmo arquivo de
  US2, métodos diferentes).

### Parallel Opportunities

- Todas as tasks `[P]` do Setup e do Foundational podem rodar em paralelo
  entre si.
- Depois do Foundational, US1-US5 podem ser trabalhados em paralelo por
  implementadores diferentes, exceto pela coincidência de arquivo em
  `src/app/(admin)/admin/products/[productId]/route.ts` (US2 adiciona
  `GET`/`PATCH`, US5 adiciona `DELETE` — evitar edição simultânea do mesmo
  arquivo).

---

## Parallel Example: Foundational

```bash
Task: "Implement content-based image validation and WebP normalization in src/lib/assets/create-asset.ts"
Task: "Implement src/lib/assets/delete-asset-if-orphaned.ts"
Task: "Implement src/lib/products/list-products.ts and src/lib/products/create-product.ts"
Task: "Implement src/lib/products/update-product.ts, delete-product.ts and set-product-lifecycle.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Setup + Foundational (inclui `assets`, obrigatório mesmo para o
   MVP).
2. Completar User Story 1.
3. Validar US1 de forma independente antes de prosseguir.

### Incremental Delivery

1. Setup + Foundational → base pronta (assets + products).
2. US1 → validar → demo (MVP).
3. US2 → validar → demo.
4. US3 → validar → demo.
5. US4 → validar → demo.
6. US5 → validar → demo.
7. Polish → evidência completa para a etapa 11.

## Notes

- `[P]` = arquivos diferentes, sem dependência entre si.
- `[US#]` mapeia a task ao user story correspondente em `spec.md`.
- Nenhuma task deste arquivo deve ser executada antes da aprovação humana da
  etapa 09.
- Achado fora de escopo (não uma task): nenhum endpoint `/admin/products*` ou
  `/admin/assets` documenta resposta `500` em `docs/api/openapi.yaml` — mesmo
  padrão já resolvido para `GET /admin/store`. Registrar para consolidação de
  documentação após a revisão desta feature, não implementar aqui.
