# Tasks: Importação de catálogo via PDF

**Input**: Design documents from `/specs/004-pdf-catalog-import/`

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

- [ ] T001 Create the feature's module directories from `specs/004-pdf-catalog-import/plan.md` under `src/app/(admin)/admin/catalog-imports/`, `src/features/catalog-import/`, `src/lib/catalog-import/`, `tests/unit/catalog-import/`, and `e2e/`.
- [ ] T002 [P] Add the feature's non-production PDF fixture contract (expected local file paths for a valid PDF with a known-duplicate SKU, a text-less/scanned PDF, a corrupted file, and an oversized/too-many-pages PDF) in `e2e/fixtures/catalog-import.ts`, without committing binary fixtures.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete
and Stage 09 has been approved.

- [ ] T003 Add `pdfjs-dist` as a dependency (ADR-0008).
- [ ] T004 Create `supabase/migrations/202608270000_catalog_import_uploads.sql`: private Storage bucket `catalog-import-uploads` (`public: false`, `file_size_limit` 50 MB, `allowed_mime_types: ['application/pdf']`) and its `storage.objects` policies — `INSERT`/`SELECT`/`DELETE` restricted to the authenticated store's own path segment, mirroring `catalog-assets` (feature 002) but with no public-read policy at all (ADR-0008).
- [ ] T005 [P] Implement `src/features/catalog-import/upload-catalog-pdf.ts`: client-side direct upload of the PDF to `catalog-import-uploads` via the browser Supabase client (`src/lib/supabase/browser.ts`), using the system-generated path `{storeId}/{uuid}.pdf` — the file never goes through a Next.js route (ADR-0008, Vercel's 4.5 MB Function body limit).
- [ ] T006 [P] Implement `src/lib/catalog-import/extract-pdf-candidates.ts`: given a `storagePath`, fetch the file from `catalog-import-uploads` server-side, then run text-only extraction via `pdfjs-dist`, enforcing the size (50 MB), page count (300) and processing timeout (120 s) limits from `plan.md`/ADR-0008, never executing embedded JavaScript or fetching external resources referenced by the PDF; delete the object from Storage after processing, success or failure.
- [ ] T007 [P] Implement `src/lib/catalog-import/flag-duplicate-skus.ts`: given extracted candidates and the resolved `storeId`, query `products` for matching SKUs and mark `isDuplicateSku` per candidate, including candidates that collide with each other within the same PDF (FR-005).
- [ ] T008 [P] Add unit coverage for `extract-pdf-candidates.ts` (valid PDF, text-less/scanned PDF, corrupted file, oversized file, page-limit exceeded, timeout, a PDF with a price printed next to a product — assert the candidate never carries a price field (FR-003) —, and Storage cleanup after both success and failure) and `flag-duplicate-skus.ts` (match against existing product, match between two candidates, no SKU present) in `tests/unit/catalog-import/`.
- [ ] T009 Implement `POST /admin/catalog-imports` in `src/app/(admin)/admin/catalog-imports/route.ts` (`200`/`400`/`401`/`403`/`404`/`413`/`415`/`422`/`500`), accepting `{ storagePath }` (never file bytes), reusing `getAuthenticatedStore`, `extract-pdf-candidates.ts` and `flag-duplicate-skus.ts`, per `specs/004-pdf-catalog-import/contracts/catalog-import.md`.

**Checkpoint**: extraction + duplicate-detection endpoint is ready. User
story implementation can begin.

---

## Phase 3: User Story 1 - Importar um PDF e revisar os produtos extraídos (Priority: P1) 🎯 MVP

**Goal**: A administradora envia um PDF e vê a pré-visualização dos
produtos extraídos, com duplicidade sinalizada, sem nenhuma mudança no
catálogo ainda.

**Independent Test**: Enviar um PDF com produtos e confirmar que a
pré-visualização lista cada candidato corretamente, com duplicados
sinalizados, sem criar nenhum produto.

### Tests for User Story 1

- [ ] T010 [P] [US1] Playwright: enviar PDF válido e ver a pré-visualização com os candidatos corretos, incluindo o item com SKU já existente sinalizado como duplicado, em `e2e/catalog-import.spec.ts`.
- [ ] T011 [P] [US1] Playwright: enviar arquivo corrompido/inválido mostra mensagem de erro clara, sem pré-visualização e sem alterar o catálogo — mesmo arquivo.
- [ ] T012 [P] [US1] Playwright: enviar PDF sem texto extraível (escaneado) mostra mensagem clara de "nada encontrado", sem erro técnico — mesmo arquivo.
- [ ] T013 [P] [US1] Playwright: enviar PDF acima do limite de tamanho/páginas é rejeitado com mensagem clara antes de qualquer processamento — mesmo arquivo.

### Implementation for User Story 1

- [ ] T014 [US1] Implement `src/features/catalog-import/import-catalog.ts`: chama `upload-catalog-pdf.ts` (T005) primeiro, depois `POST /admin/catalog-imports` com o `storagePath` resultante.
- [ ] T015 [US1] Implement `src/app/(admin)/admin/catalog-imports/components/import-upload.tsx`.
- [ ] T016 [US1] Implement `candidate-review-list.tsx` e `candidate-review-item.tsx` (exibição somente-leitura: nome, SKU, descrição, badge de duplicidade).

**Checkpoint**: User Story 1 está completa e testável de forma
independente.

---

## Phase 4: User Story 2 - Corrigir, completar e confirmar a criação dos produtos (Priority: P2)

**Goal**: A administradora corrige campos, anexa imagem por item, e
confirma a criação dos produtos não duplicados.

**Independent Test**: A partir de uma pré-visualização carregada, corrigir
um campo, anexar imagem, confirmar, e verificar que os produtos corretos
foram criados com os valores revisados.

### Tests for User Story 2

- [ ] T017 [P] [US2] Playwright: corrigir um campo de um item e confirmar que o valor corrigido é o que é criado, em `e2e/catalog-import.spec.ts`.
- [ ] T018 [P] [US2] Playwright: tentar confirmar um item não duplicado sem imagem anexada é bloqueado — mesmo arquivo.
- [ ] T019 [P] [US2] Playwright: confirmar a importação cria exatamente os itens não duplicados com imagem anexada (visibilidade/disponibilidade desligadas por padrão), e não cria nem altera nada para o item duplicado — mesmo arquivo.
- [ ] T020 [P] [US2] Playwright: um item com campo obrigatório inválido (ex.: nome vazio após edição) não bloqueia a confirmação dos demais itens válidos — mesmo arquivo.
- [ ] T021 [P] [US2] Playwright: administrador B (loja B) importando um PDF com um SKU que só existe na loja A não sinaliza duplicidade nem sofre nenhuma interferência da loja A — isolamento cross-tenant (FR-012/SC-006) — mesmo arquivo.

### Implementation for User Story 2

- [ ] T022 [US2] Estender `candidate-review-item.tsx` para edição inline de nome, SKU e descrição.
- [ ] T023 [US2] Estender `candidate-review-item.tsx` para anexar imagem por item, reusando `src/features/assets/upload-product-image.ts` (feature 002) sem duplicar lógica de upload.
- [ ] T024 [US2] Implement `import-summary.tsx` e a orquestração de confirmação em `import-catalog.ts`: chama `saveProduct` (feature 002) uma vez por item confirmado, na sequência, sem interromper os demais itens quando um falha (FR-010), preservando os itens já criados e permitindo tentar novamente só o item que falhou (FR-013).

**Checkpoint**: User Stories 1 e 2 funcionam de forma independente.

---

## Phase 5: User Story 3 - Cancelar a importação sem aplicar nenhuma mudança (Priority: P3)

**Goal**: A administradora cancela a qualquer momento antes de confirmar,
sem nenhuma alteração no catálogo.

**Independent Test**: Chegar até a pré-visualização, com ou sem correções,
cancelar, e confirmar que o catálogo continua idêntico ao original.

### Tests for User Story 3

- [ ] T025 [P] [US3] Playwright: cancelar em qualquer ponto antes de confirmar (com e sem correções feitas) não cria nenhum produto nem altera o catálogo, em `e2e/catalog-import.spec.ts`.

### Implementation for User Story 3

- [ ] T026 [US3] Implement a ação de cancelar em `import-upload.tsx`/`candidate-review-list.tsx`: limpa o estado local da revisão, sem nenhuma chamada de criação de asset ou produto.

**Checkpoint**: Todos os três user stories funcionam de forma
independente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T027 [P] Adicionar verificações de acessibilidade (contraste, teclado, movimento reduzido) no fluxo de revisão em `e2e/catalog-import.a11y.spec.ts`.
- [ ] T028 [P] Rodar revisão de segurança (Semgrep) confirmando ausência de execução de conteúdo ativo do PDF e ausência de qualquer biblioteca de geração de PDF no caminho desta feature (ADR-0008).
- [ ] T029 Rodar o gate completo de qualidade (`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build`, `pnpm test:e2e`) e registrar a evidência observada.
- [ ] T030 Executar o script de validação manual de `specs/004-pdf-catalog-import/quickstart.md` de ponta a ponta e registrar a evidência para a etapa 11.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup; bloqueia todos os user
  stories.
- **User Stories (Phase 3-5)**: dependem do Foundational completo; US2
  depende da tela de revisão de US1 existir; US3 depende de US1 ter algo a
  cancelar. Ainda assim, cada um é independentemente testável dado o
  estado prévio necessário.
- **Polish (Phase 6)**: depende de todos os user stories desejados
  estarem completos.

### Parallel Opportunities

- Todas as tasks `[P]` do Setup e do Foundational podem rodar em paralelo
  entre si.
- T022-T024 (US2) e T026 (US3) tocam componentes majoritariamente
  distintos, mas todos editam arquivos dentro de
  `src/app/(admin)/admin/catalog-imports/components/` — coordenar pra
  evitar conflito de edição simultânea no mesmo arquivo.

---

## Parallel Example: Foundational

```bash
Task: "Implement src/features/catalog-import/upload-catalog-pdf.ts"
Task: "Implement src/lib/catalog-import/extract-pdf-candidates.ts"
Task: "Implement src/lib/catalog-import/flag-duplicate-skus.ts"
Task: "Add unit coverage in tests/unit/catalog-import/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Setup + Foundational.
2. Completar User Story 1 (extração + pré-visualização, sem confirmar
   nada ainda).
3. Validar US1 de forma independente antes de prosseguir.

### Incremental Delivery

1. Setup + Foundational → base pronta (extração + duplicidade).
2. US1 → validar → demo (preview confiável).
3. US2 → validar → demo (criação real de produtos).
4. US3 → validar → demo (cancelar com segurança).
5. Polish → evidência completa para a etapa 11.

## Notes

- `[P]` = arquivos diferentes, sem dependência entre si.
- `[US#]` mapeia a task ao user story correspondente em `spec.md`.
- Nenhuma task deste arquivo deve ser executada antes da aprovação humana
  da etapa 09.
- A consolidação do endpoint novo (`POST /admin/catalog-imports`) em
  `docs/api/openapi.yaml` é feita pela sessão de documentação **antes**
  deste gate, não é task do implementer (Contract Before Code).
