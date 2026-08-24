# Tasks: Acesso da administradora e escopo da loja

**Input**: Design documents from `/specs/001-admin-store-access/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/` and `quickstart.md`

**Tests**: Included because the feature specification and project quality
contract require unit, authorization and browser coverage for authentication and
tenant isolation.

**Gate**: These tasks define the implementation contract. Do not execute code
tasks before the human approval of Stage 09.

**Status note**: The maintainer approved the remediated Stage 09 contract on
2026-08-23. Checked implementation tasks record files already present from the
initial out-of-sequence implementation. Verification-only tasks represent
current evidence, so T010 and T024 remain pending until their commands are
rerun. The documentation/orchestrator session must hand execution to the
separate `implementer` session starting at T010; after evidence, a separate
read-only `contract-reviewer` session reviews the result.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the feature's file boundaries and test support without
introducing product behavior.

- [x] T001 Create the feature route-group and module directories from `specs/001-admin-store-access/plan.md` under `src/app/`, `src/features/`, `src/lib/`, and `e2e/`.
- [x] T002 [P] Define server-only and public environment validation in `src/lib/config/env.ts`, excluding secrets from client bundles and error output.
- [x] T003 [P] Add the feature's test data contract and non-production environment requirements in `e2e/fixtures/admin-store-access.ts` without committing credentials.
- [x] T004 [P] Add the feature test path and shared Vitest setup in `tests/unit/admin-store-access/` and `vitest.config.ts` without changing existing test behavior.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the canonical store, trusted session, membership and
database boundaries before any user story is implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete and
Stage 09 has been approved.

- [x] T005 Create `supabase/migrations/202608220000_stores.sql` before the membership migration, implementing the approved `stores` SQL types, defaults, constraints and update trigger from `specs/001-admin-store-access/data-model.md` without adding a competing entity or feature-specific field.
- [x] T006 In the `stores` migration, revoke implicit access, grant `authenticated` only the `SELECT` privilege needed later, enable RLS and add no read policy yet; verify that RLS therefore denies anonymous and authenticated browser access before membership exists.
- [x] T007 Rework `supabase/migrations/202608220001_store_memberships.sql` so it applies after `stores` and creates the membership table, foreign keys, defaults, constraints, least-privilege grants and own-membership read policy first.
- [x] T008 At the end of the membership migration, add the `stores` `SELECT` policy that resolves the verified `auth.uid()` through a `store_admin` membership; do not add anonymous access or authenticated writes to either table.
- [x] T009 Add structural pgTAP assertions in `supabase/tests/admin-store-access.sql` for both tables' fields, defaults, constraints, update trigger, grants, enabled RLS and expected policy definitions, without duplicating the behavioral authorization matrix.
- [ ] T010 Run `supabase db reset` and `supabase test db` from an empty local or explicitly authorized non-production database, proving migration order plus own-membership/own-store reads and anonymous, unaffiliated, cross-store and authenticated-write denials.
- [x] T011 [P] Implement the browser Supabase client in `src/lib/supabase/browser.ts` with publishable configuration only; keep privileged credentials out of the module.
- [x] T012 [P] Implement the server Supabase client in `src/lib/supabase/server.ts` with cookie read/write integration for the approved Next.js request boundary.
- [x] T013 Implement session refresh and request-boundary behavior in `src/proxy.ts`, forwarding refreshed cookies and never treating unverified cookie contents as authorization.
- [x] T014 Implement verified-user and membership resolution helpers in `src/lib/auth/get-authenticated-store.ts`, deriving the store from `auth_user_id` and `store_memberships` rather than client input.
- [x] T015 [P] Implement safe authentication and authorization error mapping in `src/lib/auth/auth-errors.ts`, with neutral account/store messages and sanitized diagnostics.
- [x] T016 [P] Add unit coverage for membership resolution and safe denial in `tests/unit/admin-store-access/membership.test.ts`.

**Checkpoint**: The trusted session and membership boundary is ready; user
story implementation can begin only after Stage 09 approval.

---

## Phase 3: User Story 1 — Entrar no painel da loja (Priority: P1) 🎯 MVP

**Goal**: A provisioned administrator can log in, reach the own-store panel,
and sign out without public signup or account enumeration.

**Independent Test**: With one non-production provisioned account, valid login
opens the protected panel, invalid login is denied neutrally, no signup exists,
and logout makes the panel inaccessible.

### Tests for User Story 1

- [x] T017 [P] [US1] Add unit tests for login input validation and neutral authentication errors in `tests/unit/admin-store-access/login.test.ts`.
- [x] T018 [P] [US1] Add browser scenarios for valid login, invalid login, absent signup and logout in `e2e/admin-store-access.spec.ts`.

### Implementation for User Story 1

- [x] T019 [P] [US1] Create the PT-BR login screen with labeled email/password fields, validation, loading, error and focus states in `src/app/(admin-auth)/admin/login/page.tsx` and `src/features/auth/login-form.tsx`.
- [x] T020 [US1] Implement email/password sign-in through the browser Supabase client in `src/features/auth/sign-in.ts` without persisting credentials.
- [x] T021 [US1] Create the protected administrator layout and redirect behavior in `src/app/(admin)/admin/layout.tsx` using the server-side membership guard.
- [x] T022 [US1] Implement the initial own-store panel read against the approved `/admin/store` contract in `src/app/(admin)/admin/page.tsx` and `src/features/store-access/get-admin-store.ts`.
- [x] T023 [US1] Implement explicit logout and post-logout redirect in `src/features/auth/sign-out.ts` and `src/app/(admin)/admin/components/sign-out-button.tsx`.
- [ ] T024 [US1] Run and stabilize the independent US1 browser journey in `e2e/admin-store-access.spec.ts` without adding production credentials to fixtures.

**Checkpoint**: US1 is independently demonstrable with a provisioned
non-production administrator and one authorized store.

---

## Phase 4: User Story 2 — Retornar em dispositivo confiável (Priority: P1)

**Goal**: A valid session survives a return to the trusted device, while an
expired or signed-out session cannot expose the panel.

**Independent Test**: Log in, revisit the panel without entering credentials,
then invalidate/expire the session and confirm that the login appears before
protected data.

### Tests for User Story 2

- [x] T025 [P] [US2] Add unit tests for valid, expired, invalidated and signed-out session states in `tests/unit/admin-store-access/session.test.ts`.
- [x] T026 [P] [US2] Add browser scenarios for session persistence, direct protected-route access and expired-session redirect in `e2e/admin-store-access.spec.ts`.

### Implementation for User Story 2

- [x] T027 [US2] Integrate SSR cookie refresh and server-side user verification into the protected layout and data adapters in `src/lib/supabase/server.ts`, `src/proxy.ts`, and `src/lib/auth/get-authenticated-store.ts`.
- [x] T028 [US2] Add safe loading and expired-session states to `src/app/(admin)/admin/loading.tsx` and `src/app/(admin)/admin/error.tsx` without rendering protected data prematurely.
- [x] T029 [US2] Add accessible session status and sign-out feedback to `src/app/(admin)/admin/components/session-feedback.tsx`.
- [ ] T030 [US2] Add mobile and desktop Playwright projects in `playwright.config.ts`, then verify in `e2e/admin-store-access.spec.ts` that a valid session returns in the same browser profile/context without a new login and an expired session redirects before protected data.

**Checkpoint**: US1 and US2 both work independently; a valid trusted session
does not bypass membership authorization.

---

## Phase 5: User Story 4 — Operar somente a loja autorizada (Priority: P1)

**Goal**: Administrators can operate only their associated store, with database
policies and server checks denying foreign or missing membership safely.

**Independent Test**: With two non-production stores and administrators, each
administrator can read the own store and cannot read or mutate the other store.

### Tests for User Story 4

- [x] T031 [P] [US4] Add unit tests for the authorization matrix and foreign store identifier rejection in `tests/unit/admin-store-access/authorization.test.ts`.
- [x] T032 [P] [US4] Extend `e2e/fixtures/admin-store-access.ts` and `.env.example` for a third confirmed non-production account without membership, then add browser scenarios for both associated administrators, the unaffiliated account and attempted foreign-store navigation in `e2e/admin-store-access.spec.ts` without logging credentials.

### Implementation for User Story 4

- [x] T033 [US4] Complete the server-side store context guard and safe `401`/`403` mapping in `src/lib/auth/get-authenticated-store.ts` and `src/lib/auth/auth-errors.ts`.
- [x] T034 [US4] Enforce the authorized store scope in the `/admin/store` route handler and server adapter in `src/app/(admin)/admin/store/route.ts` and `src/features/store-access/get-admin-store.ts`.
- [x] T035 [US4] Ensure membership rows and foreign tenant data are excluded from client-facing responses in `src/lib/auth/get-authenticated-store.ts` and `src/lib/store/get-admin-store.ts`.
- [x] T036 [US4] In `e2e/admin-store-access.spec.ts`, obtain store B's identifier only from administrator B's authorized `/admin/store` response, authenticate administrator A through the publishable Supabase client, attempt through the Data API to create a membership for store B, assert grants/RLS denial and absence of a new row, and confirm the response reveals no target identity or content without using `service_role` or adding a product endpoint.

**Checkpoint**: The multi-tenant access boundary is independently testable and
blocks cross-store reads and mutations at both app and database layers.

---

## Phase 6: User Story 3 — Recuperar o acesso da revendedora sem compartilhar a senha (Priority: P2)

**Goal**: A provisioned reseller/administrator can start recovery in clear PT-BR,
receive neutral feedback and follow safe support guidance without sharing the
old password; public customers remain outside the auth flow.

**Independent Test**: Start recovery with a provisioned reseller/admin and an
unknown email; both receive neutral confirmation, and the screen never asks for
the old password or a credential to send to the maintainer. Open the public
catalog separately and verify that it does not request login.

### Tests for User Story 3

- [x] T037 [P] [US3] Add unit tests for recovery input normalization, neutral responses and provider failure mapping in `tests/unit/admin-store-access/recovery.test.ts`.
- [x] T038 [P] [US3] Add browser scenarios for provisioned and unknown administrator recovery emails, safe support guidance, invalid recovery state and public-catalog access without an administrator session in `e2e/admin-store-access.spec.ts`.

### Implementation for User Story 3

- [x] T039 [US3] Create the PT-BR recovery request screen with neutral confirmation and support guidance in `src/app/(admin-auth)/admin/forgot-password/page.tsx` and `src/features/auth/recovery-form.tsx`.
- [x] T040 [US3] Implement the recovery email request through the browser Supabase client in `src/features/auth/request-recovery.ts`, mapping provider errors without account enumeration.
- [x] T041 [US3] Implement the provider recovery callback and invalid-link states in `src/app/(admin-auth)/admin/reset-password/page.tsx` and `src/features/auth/recovery-callback.ts`, without logging tokens.
- [x] T042 [US3] Add recovery navigation from the admin login and safe fallback messaging in `src/app/(admin-auth)/admin/login/components/recovery-link.tsx` and `src/features/auth/auth-copy.ts`.
- [x] T043 [US3] Run the independent US3 browser journey with a non-production mail/recovery setup in `e2e/admin-store-access.spec.ts`.

**Checkpoint**: Recovery is understandable and safe; it does not weaken the
session or tenant boundary.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Complete evidence and quality checks across the four stories.

- [x] T044 [P] Add keyboard, reduced-motion and mobile/desktop checks plus WCAG 2.2 AA assertions for `4.5:1` normal text, `3:1` large text and `3:1` focus indicators/components in `e2e/admin-store-access.a11y.spec.ts`, without swallowing failed expectations.
- [ ] T045 [P] Add a security regression check for secrets in bundles, logs, fixtures and changed files in `tests/security/admin-store-access-secrets.test.ts`.
- [ ] T046 [P] Update `docs/workflow/checkpoint.md` and the feature quickstart with new observed verification evidence after the corrected database foundation is implemented, without adding credentials.
- [ ] T047 Re-run the scripts defined in `package.json` — `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test:unit`, applicable `pnpm test:e2e`, and `pnpm build` — and record each real output and any unavailable check in the evaluator evidence.
- [ ] T048 Re-run Semgrep through the approved MCP/CLI when available after the corrected database foundation; record unavailability as not executed and do not bypass a failing security check in `specs/001-admin-store-access/quickstart.md`.
- [ ] T049 Run the moderated SC-001/SC-005 validation with the first administrator and record sanitized evidence in `specs/001-admin-store-access/quickstart.md`: login reaches the panel within two minutes without technical guidance, and recovery starts with the next step understood without guidance or credential sharing.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately after Stage 09 approval.
- **Foundational (Phase 2)**: Depends on Setup and blocks every user story.
- **US1 (Phase 3)**: Depends on the foundational session and membership boundary; it is the MVP slice.
- **US2 (Phase 4)**: Depends on the US1 protected route and session client, then can be validated independently.
- **US4 (Phase 5)**: Depends on the foundational membership/RLS boundary; its negative tests must pass before extending the panel.
- **US3 (Phase 6)**: Depends on the auth screens and session boundary from US1/US2, but recovery tests remain independently runnable.
- **Polish (Phase 7)**: Depends on all stories selected for the sprint. T049 is
  human-observed evidence required before the Stage 11 verdict.

### User Story Dependencies

- **US1 (P1)**: Foundational only; MVP target.
- **US2 (P1)**: US1 protected route and shared auth client.
- **US4 (P1)**: Foundational membership/RLS; can proceed in parallel with US1 after the foundation.
- **US3 (P2)**: Shared auth UI and provider boundary from US1; no dependency on catalog features.

### Parallel Opportunities

- T002–T004 can run in parallel during setup.
- T005 and T006 create a deny-by-default `stores` foundation. T007 creates the
  membership boundary, T008 may then reference it from the `stores` policy, and
  T009/T010 validate the complete schema and behavior.
- T011, T012, T015 and T016 can run in parallel after the migration design is
  fixed.
- T017 and T018 can run in parallel before US1 implementation.
- T025/T026 and T031–T032 can run in parallel once their shared test fixtures exist.
- US1 and the initial US4 policy tests can be developed in parallel after Phase 2, provided they do not edit the same files concurrently.
- T044 and T045 can run in parallel with final evidence collection.

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational after Stage 09 approval.
2. Complete US1 and validate login, protected panel and logout independently.
3. Stop and evaluate the MVP slice before adding recovery polish or broader catalog work.

### Incremental Delivery

1. Add US2 for reliable return sessions and expired-session handling.
2. Add US4's two-store negative coverage, including unauthorized membership writes, before any tenant-owned CRUD feature.
3. Add US3 recovery and support guidance.
4. Run the cross-cutting quality and security evidence before the evaluator.
5. Run the moderated first-administrator validation before the Stage 11 verdict.

### Completion Gate

The task list does not authorize implementation by itself. The implementer must
wait for the human Stage 09 approval, execute only these tasks, then hand the
diff and evidence to the read-only contract reviewer.
