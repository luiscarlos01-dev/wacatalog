# Quickstart — Acesso da administradora e escopo da loja

This guide validates the feature without using production data or committing
credentials.

## Prerequisites

- Node.js `24.19.0` and pnpm `11.22.0`.
- Supabase CLI `2.115.0` for local migration and database-policy validation.
- A local or non-production Supabase project configured outside the repository.
- Two test stores, two associated test administrator accounts and a third
  confirmed account without membership, all provisioned outside the repository.
- Test emails, passwords and private environment values supplied through the
  local shell or CI secret store; never put their values in this file, fixtures,
  logs or commits.

The credential-dependent browser suite reads only these variable names; values
remain local or in CI secrets:

```text
E2E_ADMIN_EMAIL
E2E_ADMIN_PASSWORD
E2E_SECOND_ADMIN_EMAIL
E2E_SECOND_ADMIN_PASSWORD
E2E_UNAFFILIATED_ADMIN_EMAIL
E2E_UNAFFILIATED_ADMIN_PASSWORD
```

## Database foundation checks

Validate the migrations from an empty local database before creating test data
or running credential-dependent E2E scenarios:

```sh
supabase db reset
supabase test db
```

The reset must apply the versioned migrations in this order:

1. `202608220000_stores.sql` creates the canonical `stores` table, explicit
   least-privilege grants and RLS with no browser-readable policy.
2. `202608220001_store_memberships.sql` creates `store_memberships` only after
   its `stores` foreign-key target exists, creates the own-membership policy and
   then adds the membership-dependent own-store read policy.

The database tests must first prove the canonical fields, defaults, constraints,
trigger, explicit grants and deny-by-default RLS of `stores`. After both
migrations exist, they must prove own-store administrative reads through
membership, cross-store and unaffiliated denial, absence of anonymous access in
this feature, and denial of authenticated writes to both `stores` and
`store_memberships`. A successful dashboard configuration is not evidence: the
project has automatic exposure of new tables disabled, so grants and policies
must be reproducible from the migrations.

If the local Supabase environment is unavailable, run the same ordered reset and
policy suite only against an explicitly authorized non-production project and
record the limitation. Do not apply these migrations to production or create
remote test identities without separate maintainer authorization.

## Static checks

```sh
pnpm typecheck
pnpm lint
pnpm format:check
```

Expected result: all commands exit successfully without reporting secrets or
protected environment values.

## Deterministic checks

```sh
pnpm test:unit
```

Cover at minimum: safe login/recovery error mapping, membership resolution,
missing-membership denial and foreign-store denial.

## Browser checks

Only after the ordered migrations and database policy suite pass, provision two
non-production stores, two associated administrator accounts and a third
confirmed account without membership through the trusted server-only maintainer
boundary. Start the non-production application with its environment configured,
then run:

```sh
pnpm test:e2e -- e2e/admin-store-access.spec.ts
```

The scenario must prove:

1. A provisioned administrator can log in and reach the own-store panel.
2. No public signup option is present.
3. Returning in the same browser profile/context with a valid cookie-backed
   session does not require a new login; no trust checkbox or device identifier
   exists in the MVP.
4. Logout removes access to the protected panel.
5. Recovery shows neutral PT-BR instructions and never asks for the old
   password; a valid recovery link allows the reseller/admin to set a new one.
6. An expired/invalid session returns to login before protected data appears.
7. Administrator A cannot read store B and cannot create a membership for store
   B through the Supabase Data API using an ordinary authenticated session; the
   failed operation creates no row, reveals no target content and uses neither a
   product endpoint nor `service_role`.
8. The dedicated third authenticated account without membership receives safe
   denial without changing either associated administrator's membership.
9. A customer can browse the public catalog without login, session or password
   recovery.
10. Mobile and desktop layouts are usable with keyboard navigation, reduced
    motion and visible focus. Contrast meets WCAG 2.2 AA: `4.5:1` for normal
    text, `3:1` for large text and `3:1` for focus indicators/components.

## Moderated first-administrator validation

Before the Stage 11 verdict, run two human-observed tasks with the first
administrator and record only sanitized outcomes and timings:

1. A valid login reaches the own-store panel within two minutes without
   technical guidance.
2. Recovery is started and the next step is understood without technical
   guidance or sharing a password, token or recovery code.

Do not record the administrator's email, password, token, recovery code or other
personal data in this guide, logs or evaluator evidence.

## Security evidence

Before requesting the Stage 09 gate, inspect the browser bundle, server output,
logs and diff for passwords, tokens, private keys, service-role values and
unnecessary PII. Run Semgrep through the approved MCP/CLI when available; if
it remains unavailable, record it as not executed rather than passing it.

## Superseded initial implementation evidence — 2026-08-23

The initial implementation was checked without production credentials, but its
database evidence does not satisfy the corrected foundation because
`store_memberships` referenced a missing `stores` table:

- typecheck, lint, format check, 13 unit tests and the production build passed;
- Playwright passed 7 browser checks, including login-screen copy, public-shell
  access, invalid recovery state, keyboard focus and mobile rendering;
- three credential-dependent browser checks were skipped because the local
  environment does not contain non-production administrator accounts;
- Semgrep MCP `1.173.0` scanned the changed TypeScript/TSX files with zero
  findings and no scan errors;
- the successful application checks remain historical evidence only and must be
  rerun after the migration correction;
- Supabase migration and policy tests remain pending on an empty local or
  authorized non-production instance before credential-dependent E2E tests.

## Current remediation evidence — 2026-08-23

- One provisioned local administrator completed login after the missing public
  Supabase publishable key was configured outside the repository.
- This manual result proves only the basic login path. It does not complete
  T010, T024 or the remaining browser, security, build and moderated checks.
- The maintainer approved the corrected Stage 09 contract on 2026-08-23. The
  next action belongs to the separate `implementer` session starting at T010,
  followed by a read-only `contract-reviewer` session; the documentation agent
  does not execute or review the implementation.

## Production-like validation

```sh
pnpm build
pnpm start
```

Repeat the protected-route, session and denial checks against a non-production
preview configuration. Do not use the first reseller's production account.
