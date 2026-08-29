# Tasks: Banners do hero

**Input**: Design documents from `/specs/006-hero-banners/`

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

- [ ] T001 Create the feature's module directories from `specs/006-hero-banners/plan.md` under `src/app/(admin)/admin/banners/`, `src/app/(admin)/admin/banners/components/`, `src/features/banners/`, `src/lib/banners/`, `tests/unit/banners/`, and `e2e/`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete
and Stage 09 has been approved. T002 in particular is a **known**
blocking prerequisite identified during planning (not a correction found
after the fact, unlike feature 005's A-1): `hero_banners` was created in
feature 003 with `revoke all ... from authenticated` and no admin grant
at all.

- [ ] T002 Create `supabase/migrations/202608290000_hero_banners_admin_privileges.sql` (next available timestamp after `202608280002`; re-check `ls supabase/migrations/` before naming it in case another feature landed a migration first) (never edit the already-merged `202608250000_hero_banners.sql`): `grant select, insert, update, delete on table public.hero_banners to authenticated;` + four RLS policies (`for select`/`for insert`/`for update`/`for delete`), each scoped by `exists (select 1 from public.store_memberships where store_memberships.store_id = hero_banners.store_id and store_memberships.auth_user_id = (select auth.uid()) and store_memberships.role = 'store_admin')` in `using` (select/update/delete) and `with check` (insert/update) — exact pattern of `supabase/migrations/202608240001_products.sql`. No column-scoping needed (unlike feature 005's A-2): every `hero_banners` column is legitimately administrator-writable.
- [ ] T003 [P] Add a new pgTAP file `supabase/tests/hero-banners-admin.sql` (mirror the structure/style of `supabase/tests/product-management.sql` and the write-privilege `throws_ok` assertions of `supabase/tests/admin-store-access.sql:530-549`): assert `authenticated` without a `store_admin` membership for the row gets `42501` on `select`/`insert`/`update`/`delete` against another store's banner, and that a `store_admin` succeeds only against her own store's banners. This is the same class of verification that caught achados A-1/A-2 in feature 005 — run it against the real local Postgres, not just read from the migration.
- [ ] T004 [P] Implement `src/lib/banners/banner-row.ts`: `BANNER_COLUMNS` constant + `toAdminBanner` mapper, mirroring `src/lib/store/get-admin-store.ts`'s `STORE_COLUMNS`/`toAdminStore` pattern.
- [ ] T005 [P] Implement `src/lib/banners/banner-input-schema.ts`: Zod schema for `BannerInput` (`imageAssetId` uuid, `accessibleDescription` 1-300 chars, `title`/`text` optional ≤160/≤500 chars, `position` int 1-5, `isActive` boolean default `false`), mirroring `src/lib/products/product-input-schema.ts`.
- [ ] T006 [P] Implement `src/lib/banners/list-banners.ts`: query `hero_banners` for the caller's store, ordered by `position` then `created_at` (tiebreak per `data-model.md`), mapped via `toAdminBanner`.
- [ ] T007 [P] Add unit coverage for `banner-input-schema.ts` (valid input, each field's boundary/rejection) in `tests/unit/banners/banner-input-schema.test.ts`.

**Checkpoint**: Privilege migration verified against the real database,
domain scaffolding ready. User story implementation can begin.

---

## Phase 3: User Story 1 - Criar um banner (Priority: P1) 🎯 MVP

**Goal**: A administradora cria um banner informando imagem, descrição
acessível, textos opcionais e posição.

**Independent Test**: Escolher uma imagem já enviada, informar descrição
acessível e uma posição livre, e verificar que o banner aparece na lista
administrativa.

### Tests for User Story 1

- [ ] T008 [P] [US1] Playwright: criar um banner com sucesso (imagem, descrição acessível, posição, sem título/texto) e ver o banner refletido na lista, em `e2e/hero-banners.spec.ts`.
- [ ] T009 [P] [US1] Playwright: criar um banner ativo numa posição já ocupada por outro banner ativo é rejeitado (`position_conflict`), sem criar nem alterar o existente — mesmo arquivo.
- [ ] T010 [P] [US1] Playwright: criar um 6º banner é rejeitado (`banner_limit_reached`) com 5 já existentes — mesmo arquivo.
- [ ] T011 [P] [US1] Playwright: salvar sem descrição acessível é rejeitado com mensagem clara — mesmo arquivo.

### Implementation for User Story 1

- [ ] T012 [US1] Implement `src/lib/banners/create-banner.ts`: valida `imageAssetId` pertence à própria loja (reusar/espelhar `src/lib/products/verify-owned-asset.ts`), conta banners da loja e retorna conflito tipado `banner_limit_reached` se `>= 5`, insere, mapeia violação do índice único parcial (`23505`) para conflito tipado `position_conflict`.
- [ ] T013 [US1] Add `GET`/`POST` to `src/app/(admin)/admin/banners/route.ts`: `GET` via `list-banners.ts` (`200`/`401`/`403`); `POST` via `create-banner.ts` (`201`/`400`/`401`/`403`/`409` com `code` distinto/`422`), reusando `getAuthenticatedStore`, per `specs/006-hero-banners/contracts/hero-banners.md`.
- [ ] T014 [US1] Implement `src/features/banners/list-banners.ts` e `src/features/banners/create-banner.ts` (chamadas client-side às rotas acima).
- [ ] T015 [US1] Implement `src/app/(admin)/admin/banners/components/banner-list.tsx` e `banner-form.tsx` (criar) e integrar num item de navegação/seção nova em `admin/page.tsx`.

**Checkpoint**: User Story 1 está completa e testável de forma
independente.

---

## Phase 4: User Story 2 - Editar um banner existente (Priority: P2)

**Goal**: A administradora edita imagem, textos, posição e/ou estado
ativo de um banner já criado.

**Independent Test**: Com um banner já criado, alterar seus textos e
estado ativo, e verificar que as mudanças aparecem na lista
administrativa.

### Tests for User Story 2

- [ ] T016 [P] [US2] Playwright: editar imagem/textos/posição/estado ativo com sucesso, refletido na lista e no hero público quando ativo, em `e2e/hero-banners.spec.ts`.
- [ ] T017 [P] [US2] Playwright: salvar como ativo numa posição ocupada por outro banner ativo é rejeitado (`position_conflict`), sem alterar o banner — mesmo arquivo.
- [ ] T018 [P] [US2] Playwright: administrador B (loja B) não consegue editar um banner da loja A — isolamento cross-tenant (FR-010) — mesmo arquivo.

### Implementation for User Story 2

- [ ] T019 [US2] Implement `src/lib/banners/update-banner.ts`: substituição completa dos campos editáveis (mesma validação de `create-banner.ts`), mapeando `23505` pra `position_conflict`.
- [ ] T020 [US2] Add `PATCH` to `src/app/(admin)/admin/banners/[bannerId]/route.ts` (`200`/`400`/`401`/`403`/`404`/`409`/`422`), per `contracts/hero-banners.md`.
- [ ] T021 [US2] Implement `src/features/banners/update-banner.ts` e estender `banner-form.tsx` pra edição (reusando o mesmo formulário de criar, pré-preenchido).

**Checkpoint**: User Stories 1 e 2 funcionam de forma independente.

---

## Phase 5: User Story 3 - Reordenar os banners (Priority: P2)

**Goal**: A administradora reordena de uma vez todos os banners da
própria loja.

**Independent Test**: Com 2 ou mais banners criados, enviar a nova ordem
completa e verificar que as posições exibidas mudam de acordo.

### Tests for User Story 3

- [ ] T022 [P] [US3] Playwright: reordenar 2+ banners com sucesso, **incluindo o caso de trocar a posição entre dois banners ativos** (o cenário que exige a implementação em duas fases de `research.md` — não pular este caso), em `e2e/hero-banners.spec.ts`.
- [ ] T023 [P] [US3] Playwright: enviar uma lista que não corresponde exatamente ao conjunto atual de banners da loja (faltando um ou repetido) é rejeitado por inteiro, sem aplicar nada — mesmo arquivo.
- [ ] T024 [P] [US3] Playwright: administrador B (loja B) não consegue reordenar banners incluindo um id da loja A — isolamento cross-tenant (FR-010) — mesmo arquivo.

### Implementation for User Story 3

- [ ] T025 [US3] Implement `src/lib/banners/reorder-banners.ts`: valida que `bannerIds` é exatamente o conjunto atual de banners da própria loja (senão `400`/`404`, nada aplicado); dentro de uma transação, aplica a reatribuição de posição em três passos descritos em `research.md` (desativar temporariamente os banners afetados → reposicionar cada um pro índice+1 na lista enviada → restaurar o `is_active` original de cada um) — nunca mudando o estado ativo como efeito observável.
- [ ] T026 [US3] Add `PUT` to `src/app/(admin)/admin/banners/order/route.ts` (`200`/`400`/`401`/`403`/`404`/`409`), per `contracts/hero-banners.md`.
- [ ] T027 [US3] Implement `src/features/banners/reorder-banners.ts` e a interação de reordenar em `banner-list.tsx` (mecanismo de UI — drag-and-drop ou subir/descer — fica a critério da implementação; o contrato não prescreve).

**Checkpoint**: User Stories 1-3 funcionam de forma independente,
incluindo a troca de posição entre banners ativos sem erro.

---

## Phase 6: User Story 4 - Excluir um banner (Priority: P3)

**Goal**: A administradora exclui permanentemente um banner, com
confirmação antes.

**Independent Test**: Com um banner existente, excluí-lo e confirmar que
ele some da lista administrativa e do hero público.

### Tests for User Story 4

- [ ] T028 [P] [US4] Playwright: confirmar a exclusão remove o banner permanentemente da lista administrativa e do hero público, em `e2e/hero-banners.spec.ts`.
- [ ] T029 [P] [US4] Playwright: cancelar a confirmação preserva o banner sem alteração — mesmo arquivo.
- [ ] T030 [P] [US4] Playwright: administrador B (loja B) não consegue excluir um banner da loja A — mesmo arquivo.

### Implementation for User Story 4

- [ ] T031 [US4] Implement `src/lib/banners/delete-banner.ts`.
- [ ] T032 [US4] Add `DELETE` to `src/app/(admin)/admin/banners/[bannerId]/route.ts` (`204`/`401`/`403`/`404`), per `contracts/hero-banners.md`.
- [ ] T033 [US4] Implement `src/features/banners/delete-banner.ts` e `src/app/(admin)/admin/banners/components/delete-banner-dialog.tsx` (confirmação, mesmo padrão de `delete-product-dialog.tsx`), integrado em `banner-list.tsx`.

**Checkpoint**: Todos os user stories funcionam de forma independente.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T034 [P] Adicionar verificações de acessibilidade (contraste, teclado, movimento reduzido, `alt` real da imagem) em `e2e/hero-banners.a11y.spec.ts`.
- [ ] T035 [P] Rodar revisão de segurança (Semgrep) confirmando que nenhuma operação aceita `storeId` do cliente e que a validação de posse do `imageAssetId` está presente em criar e editar.
- [ ] T036 Rodar o gate completo de qualidade (`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build`, `pnpm test:e2e`) e registrar a evidência observada.
- [ ] T037 Executar o script de validação manual de `specs/006-hero-banners/quickstart.md` de ponta a ponta e registrar a evidência para a etapa 11.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup; bloqueia todos os user
  stories. T002 (migration de privilégio) é pré-requisito real (não só
  lógico) — nenhuma rota funciona contra o banco real sem ela.
- **User Stories (Phase 3-6)**: dependem do Foundational completo. US2,
  US3 e US4 dependem de US1 pra ter pelo menos um banner configurado,
  mas cada uma é testável de forma independente dado esse pré-requisito
  de dados (não de código).
- **Polish (Phase 7)**: depende de todos os user stories completos.

### Parallel Opportunities

- Todas as tasks `[P]` do Setup e do Foundational podem rodar em
  paralelo entre si.
- T013 (US1, `banners/route.ts`), T020 (US2, `banners/[bannerId]/route.ts`)
  e T026 (US3, `banners/order/route.ts`) tocam arquivos diferentes, sem
  conflito de edição simultânea.

---

## Parallel Example: Foundational

```bash
Task: "Implement src/lib/banners/banner-row.ts"
Task: "Implement src/lib/banners/banner-input-schema.ts"
Task: "Implement src/lib/banners/list-banners.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Setup + Foundational (migration de privilégio incluída).
2. Completar User Story 1 (criar banner).
3. Validar US1 de forma independente antes de prosseguir.

### Incremental Delivery

1. Setup + Foundational → banco com privilégio correto, base pronta.
2. US1 → validar → demo (criar banner).
3. US2 → validar → demo (editar banner).
4. US3 → validar → demo (reordenar, incluindo troca entre ativos).
5. US4 → validar → demo (excluir com confirmação).
6. Polish → evidência completa para a etapa 11.

## Notes

- `[P]` = arquivos diferentes, sem dependência entre si.
- `[US#]` mapeia a task ao user story correspondente em `spec.md`.
- Nenhuma task deste arquivo deve ser executada antes da aprovação humana
  da etapa 09.
- A lacuna de privilégio administrativo em `hero_banners` foi identificada
  nesta rodada de planejamento (T002/T003), não descoberta depois da
  implementação — diferente do que aconteceu com os achados A-1/A-2 da
  feature 005.
