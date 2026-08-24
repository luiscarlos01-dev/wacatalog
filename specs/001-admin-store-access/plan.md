# Implementation Plan: Acesso da administradora e escopo da loja

**Branch**: `001-admin-store-access` | **Date**: 2026-08-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-admin-store-access/spec.md`

## Summary

Esta feature entrega o acesso autenticado da administradora ao painel da loja,
sessão persistente no dispositivo confiável, recuperação simples por email e
autorização tenant-aware. O login e a recuperação usam o Supabase Auth; a
sessão SSR usa cookies geridos por `@supabase/ssr`; a associação
administradora-loja e as policies RLS impedem acesso entre lojas. Como esta é a
primeira feature persistida, sua fundação materializa a entidade canônica
`stores` antes de criar `store_memberships`. Não haverá cadastro público,
provisionamento pelo browser, OAuth, Cognito ou MFA.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Node.js 24.19.0

**Primary Dependencies**: Next.js 16.3.2 App Router, React 19.2.8,
`@supabase/supabase-js` 2.112.3, `@supabase/ssr` 0.12.4, Zod 4.4.3,
Tailwind CSS 4.3.3

**Storage**: Supabase Auth for identities/sessions and Supabase Postgres for
`stores`/`store_memberships` with RLS. The feature introduces no new canonical
entity, but it owns the first ordered migrations that materialize both existing
canonical entities in a new Supabase project.

**Testing**: Vitest 4.1.10 for validation and authorization helpers;
`@testing-library/react` 16.3.2 for form behavior; Playwright 1.62.1 for
login, logout, recovery and cross-tenant browser journeys in desktop and mobile
contexts. Cross-tenant coverage uses two associated administrators plus a third
confirmed account without membership; credentials remain outside the repository.

**Target Platform**: Next.js web application on Vercel, Node runtime for
server-side auth boundaries, mobile and desktop browsers.

**Project Type**: Full-stack web application.

**Performance Goals**: The login and protected-panel transition support the
user-level target of completing access in up to 2 minutes. This feature adds no
independent network or throughput target.

**Constraints**: No secrets in browser, logs, fixtures or repository; no
service-role client in user flows; authorization must be checked server-side
and by RLS; error responses must not enumerate accounts or stores; visible
text is clear PT-BR and keyboard accessible. Contrast and focus follow WCAG 2.2
AA thresholds. Session return means the same browser profile with valid cookies;
the MVP adds no trust checkbox or device fingerprinting.

**Scale/Scope**: Moderated validation uses the first store and administrator.
Isolation tests use two stores, two associated administrators and one confirmed
account without membership. The schema and policies support multiple stores;
catalog CRUD remains out of scope.

## Constitution Check

_GATE: PASS — remediated Stage 09 contract approved by the maintainer on
2026-08-23. Execution must be handed to the separate `implementer` session; the
documentation/orchestrator session does not implement product code._

- **Contract Before Code**: PASS — the remediated contract received Stage 09
  approval on 2026-08-23; only the separate `implementer` session may execute
  its pending tasks.
- **Simple and Accessible Experience**: PASS — the scope is limited to four
  user journeys, clear PT-BR messaging, responsive layouts and keyboard use.
- **Tenant Isolation and Least Privilege**: PASS — membership-derived scope,
  explicit grants, RLS and server-only privileged operations are explicit.
- **Evidence Before Completion**: PASS — Vitest, browser E2E, security checks,
  typecheck, lint and build are included in the validation guide.
- **Simplicity With Traceability**: PASS — the minimum canonical tenancy
  foundation is materialized without an ORM, state library, custom auth
  protocol or competing entity.

## Project Structure

### Documentation (this feature)

```text
specs/001-admin-store-access/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── admin-access.md
│   └── authorization.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (admin-auth)/admin/login/
│   ├── (admin-auth)/admin/forgot-password/
│   ├── (admin-auth)/admin/reset-password/
│   ├── (admin)/admin/
│
├── proxy.ts
├── components/
├── features/auth/
├── features/store-access/
├── lib/config/
├── lib/supabase/
├── lib/auth/
└── types/

supabase/
├── migrations/
│   ├── 202608220000_stores.sql
│   └── 202608220001_store_memberships.sql
└── tests/

e2e/
├── fixtures/
├── admin-store-access.spec.ts
└── admin-store-access.a11y.spec.ts

tests/
├── security/
└── unit/
```

**Structure Decision**: Single Next.js application using the existing `src/`
layout. Auth UI and store-access authorization stay in focused feature modules;
Supabase clients remain in `src/lib/supabase/`; migrations and browser tests
remain at the repository-level locations fixed by the Tech Spec. No second
application is introduced.

## Browser validation design

- Run the session-return journey in desktop and mobile Playwright projects. A
  trusted return reuses the same browser profile/context while Supabase cookies
  remain valid; there is no trust checkbox or additional device identifier.
- Supply three non-production identities through local or CI-only variables:
  administrator A for store A, administrator B for store B and one confirmed
  account with no `store_memberships` row.
- Exercise the cross-tenant mutation through the existing Supabase Data API
  using administrator A's ordinary authenticated session and publishable client.
  Attempt to create a membership for store B, expect grants/RLS denial and prove
  that no row was created. Do not add a product endpoint or use `service_role`.
- Validate WCAG 2.2 AA contrast thresholds: `4.5:1` for normal text, `3:1` for
  large text and `3:1` for focus indicators and interface components. Keyboard,
  reduced-motion, mobile and desktop checks remain part of the same evidence.
- Stage 11 evidence includes moderated validation with the first administrator:
  valid login reaches the panel within two minutes without technical guidance,
  and recovery can be initiated with the next step understood without guidance
  or credential sharing.

## Migration and access order

1. Create `public.stores` from the approved canonical model, including its
   constraints, defaults and database-maintained timestamps.
2. Revoke implicit table access, grant only the minimum operations required by
   the later authenticated administrative read path and enable RLS on `stores`.
   Do not create a read policy yet: RLS must deny every browser read until the
   membership relation exists.
3. Create `public.store_memberships`, its least-privilege grants and own-row
   read policy only after `stores` exists.
4. At the end of the membership migration, add the `stores` policy that permits
   an authenticated administrator to read only the store resolved through their
   membership. Do not add anonymous access or administrator writes to `stores`
   in this feature.
5. Validate both migrations and the final policy matrix from an empty local or
   non-production Supabase database only after all database objects exist.

The executable `stores` mapping uses UUID generation in Postgres, `text` for
the approved textual fields, `timestamptz` with `now()` defaults for timestamps,
`unverified` as the initial WhatsApp status, database checks for the approved
status/number invariants and a trigger that maintains `updated_at` and resets
verification when the number changes. These are implementation details derived
from the canonical fields and lifecycle rules; they do not add product fields.

The two ordered migration files remain:

1. `202608220000_stores.sql`: table, constraints, trigger, grants and RLS with
   no browser-readable policy.
2. `202608220001_store_memberships.sql`: membership table and policy first,
   followed by the membership-dependent `stores` read policy.

The hosted project was created with automatic exposure of new tables disabled,
so every grant and RLS policy must be declared explicitly in versioned
migrations. Creating or changing stores and memberships remains a trusted,
server-only maintainer operation. Public store reads are a separate boundary;
they will be introduced only when the public-catalog feature defines the exact
fields, grants and policies.

## Complexity Tracking

No constitution violations. No complexity justification is required.
