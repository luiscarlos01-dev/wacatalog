# Tasks: WhatsApp da loja

**Input**: Design documents from `/specs/005-whatsapp-store-config/`

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

- [x] T001 Create the feature's module directories from `specs/005-whatsapp-store-config/plan.md` under `src/app/(admin)/admin/store/whatsapp/verification/`, `src/features/store-access/`, `src/lib/store/`, `tests/unit/store/`, and `e2e/`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete
and Stage 09 has been approved.

- [x] T002 [P] Implement `src/lib/store/normalize-whatsapp-number.ts`: accept familiar Brazilian formats, strip non-digit characters, prefix `55` when missing, and validate the result against `^55[0-9]{10,11}$` (`research.md`); return a typed rejection when the input cannot be normalized to a valid value.
- [x] T003 [P] Add unit coverage for `normalize-whatsapp-number.ts` (with `+55`, with `55` no `+`, only DDD+number, with formatting symbols, invalid/too short, invalid/too long) in `tests/unit/store/normalize-whatsapp-number.test.ts`.
- [x] T004 [P] Implement `src/lib/store/update-store-whatsapp.ts`: update `stores.whatsapp_number` with the normalized value, always resetting `whatsapp_verification_status` to `unverified` and `whatsapp_verified_at` to `null` on success (FR-004), regardless of prior state.
- [x] T005 [P] Implement `src/lib/store/confirm-store-whatsapp.ts`: set `whatsapp_verification_status` to `verified` and `whatsapp_verified_at` to now; return a typed conflict when `whatsapp_number` is `null` (FR-007, `research.md`).
- [x] T006 [P] Add unit coverage for `update-store-whatsapp.ts` (reset behavior, including from an already-verified number) and `confirm-store-whatsapp.ts` (success, conflict without a number, idempotent re-confirmation) in `tests/unit/store/`.

**Checkpoint**: Domain rules are ready. User story implementation can
begin.

---

## Phase 3: User Story 1 - Configurar ou alterar o número de WhatsApp (Priority: P1) 🎯 MVP

**Goal**: A administradora configura ou altera o número de WhatsApp da
própria loja, com normalização e reset de verificação corretos.

**Independent Test**: Informar um número em formato familiar e confirmar
que é salvo normalizado, com verificação resetada.

### Tests for User Story 1

- [x] T007 [P] [US1] Playwright: configurar um número em formato familiar e ver o valor normalizado e "não confirmado" refletidos na tela, em `e2e/whatsapp-store-config.spec.ts`.
- [x] T008 [P] [US1] Playwright: alterar um número já confirmado para outro; confirmar que o status volta para "não confirmado" — mesmo arquivo.
- [x] T009 [P] [US1] Playwright: informar um valor inválido é rejeitado com mensagem clara, sem alterar o número já configurado — mesmo arquivo.
- [x] T010 [P] [US1] Playwright: administrador B (loja B) não consegue alterar o WhatsApp da loja A — isolamento cross-tenant (FR-008/SC-005) — mesmo arquivo.

### Implementation for User Story 1

- [x] T011 [US1] Add `PATCH` to `src/app/(admin)/admin/store/route.ts` (já existe com `GET`): `200`/`400`/`401`/`403`/`422`/`500`, reusando `getAuthenticatedStore`, `normalize-whatsapp-number.ts` e `update-store-whatsapp.ts`, per `specs/005-whatsapp-store-config/contracts/whatsapp-store-config.md`.
- [x] T012 [US1] Implement `src/features/store-access/update-store-whatsapp.ts` (chamada client-side à rota acima).
- [x] T013 [US1] Implement `src/app/(admin)/admin/components/whatsapp-settings.tsx` (formulário de configurar/alterar, exibindo número e status atuais) e integrar em `admin/page.tsx`.

**Checkpoint**: User Story 1 está completa e testável de forma
independente.

---

## Phase 4: User Story 2 - Testar e confirmar o número (Priority: P2)

**Goal**: A administradora testa o número abrindo o `wa.me` correspondente
e confirma a verificação.

**Independent Test**: Com um número configurado, acionar testar, abrir o
link, e confirmar; verificar status e data de confirmação.

### Tests for User Story 2

- [x] T014 [P] [US2] Playwright: acionar testar abre `wa.me/<número normalizado>` sem mensagem pré-preenchida, em `e2e/whatsapp-store-config.spec.ts`.
- [x] T015 [P] [US2] Playwright: confirmar a verificação muda o status para "confirmado" com data/hora — mesmo arquivo.
- [x] T016 [P] [US2] Playwright: tentar confirmar sem nenhum número configurado é rejeitado com mensagem clara — mesmo arquivo.
- [x] T017 [P] [US2] Playwright: reconfirmar um número já confirmado funciona normalmente (idempotente, atualiza a data) — mesmo arquivo.
- [x] T018 [P] [US2] Playwright: administrador B (loja B) não consegue confirmar a verificação da loja A — isolamento cross-tenant — mesmo arquivo.

### Implementation for User Story 2

- [x] T019 [US2] Implement `POST /admin/store/whatsapp/verification` em `src/app/(admin)/admin/store/whatsapp/verification/route.ts` (`200`/`400`/`401`/`403`/`409`/`500`), reusando `getAuthenticatedStore` e `confirm-store-whatsapp.ts`.
- [x] T020 [US2] Estender `whatsapp-settings.tsx` com o botão de testar (abre `wa.me` em nova aba) e o botão de confirmar (chama a rota acima).

**Checkpoint**: Todos os user stories funcionam de forma independente.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T021 [P] Adicionar verificações de acessibilidade (contraste, teclado, movimento reduzido) no formulário em `e2e/whatsapp-store-config.a11y.spec.ts`.
- [x] T022 [P] Rodar revisão de segurança (Semgrep) confirmando que nenhum número de WhatsApp é logado e que nenhuma operação aceita `storeId` do cliente.
- [x] T023 Rodar o gate completo de qualidade (`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build`, `pnpm test:e2e`) e registrar a evidência observada.
- [ ] T024 Executar o script de validação manual de `specs/005-whatsapp-store-config/quickstart.md` de ponta a ponta e registrar a evidência para a etapa 11.

---

## Phase 6: Contract Correction — privilégio e exposição pública de `stores` (achados A-1/L-1 do `contract-reviewer`)

**Bloqueante**: T025 é pré-requisito real (não apenas lógico) para T011 e
T019 funcionarem contra um banco de verdade — foi descoberto depois deles
já estarem implementados, por isso aparece numerado ao final em vez de
renumerar o documento. T026 corrige uma lacuna já mesclada da feature 003.

- [x] T025 Criar `supabase/migrations/202608280000_stores_whatsapp_update_policy.sql`: `grant update on table public.stores to authenticated` + uma policy de RLS `for update` em `stores` escopada por `store_memberships` (`store_memberships.store_id = stores.id and store_memberships.auth_user_id = (select auth.uid()) and store_memberships.role = 'store_admin'`) em `using` **e** `with check` — mesmo padrão de `"store admins can update own store products"` em `supabase/migrations/202608240001_products.sql`. Sem isso, `PATCH /admin/store` e `POST /admin/store/whatsapp/verification` falham com `42501 permission denied` contra o banco real.
- [x] T026 Criar `supabase/migrations/202608280001_public_catalog_whatsapp_visibility.sql`: `create or replace function public.resolve_public_store` (nunca editar `202608250001_public_catalog_access.sql`, já mesclada) trocando o `select` de `stores.whatsapp_number` por `case when stores.whatsapp_verification_status = 'verified' then stores.whatsapp_number end`, mantendo `whatsapp_available` como já está (já correto). Implementa FR-010/SC-006.
- [x] T027 [P] Adicionar um caso de teste (unit ou Playwright, no arquivo de catálogo público existente) que configure um número de WhatsApp sem confirmar e afirme que `GET /stores/{slug}/catalog` devolve `whatsappNumber: null` — cobertura que hoje não existe e passaria antes e depois de T026 sem essa asserção específica.

**Checkpoint**: `contract-reviewer` roda de novo sobre T025-T027 antes de
qualquer nova evidência de etapa 11 (T024).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup; bloqueia todos os user
  stories.
- **User Stories (Phase 3-4)**: dependem do Foundational completo; US2
  depende de US1 para ter um número configurado, mas é testável de forma
  independente dado esse pré-requisito.
- **Polish (Phase 5)**: depende de todos os user stories estarem
  completos.
- **Contract Correction (Phase 6)**: descoberta depois do Polish, pelo
  `contract-reviewer`; T025 é pré-requisito de execução real para T011/T019
  apesar de numerado depois. T024 (evidência de etapa 11) não deve rodar
  antes de T025-T027 estarem concluídas e revisadas de novo.

### Parallel Opportunities

- Todas as tasks `[P]` do Setup e do Foundational podem rodar em paralelo
  entre si.
- T011 (US1) e T019 (US2) tocam arquivos diferentes (`route.ts` de
  `/admin/store` já existe vs. novo `route.ts` de verificação); sem
  conflito de edição simultânea.

---

## Parallel Example: Foundational

```bash
Task: "Implement src/lib/store/normalize-whatsapp-number.ts"
Task: "Implement src/lib/store/update-store-whatsapp.ts"
Task: "Implement src/lib/store/confirm-store-whatsapp.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Setup + Foundational.
2. Completar User Story 1 (configurar/alterar número).
3. Validar US1 de forma independente antes de prosseguir.

### Incremental Delivery

1. Setup + Foundational → base pronta (normalização, mutação, reset).
2. US1 → validar → demo (configurar número).
3. US2 → validar → demo (testar e confirmar).
4. Polish → evidência completa para a etapa 11.

## Notes

- `[P]` = arquivos diferentes, sem dependência entre si.
- `[US#]` mapeia a task ao user story correspondente em `spec.md`.
- Nenhuma task deste arquivo deve ser executada antes da aprovação humana
  da etapa 09.
- `500` é adicionado aos dois endpoints diretamente nesta rodada (ver
  `contracts/whatsapp-store-config.md`), não registrado como débito.
