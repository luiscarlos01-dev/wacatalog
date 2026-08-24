# Research — Acesso da administradora e escopo da loja

**Date**: 2026-08-22

## Decision: SSR session with `@supabase/ssr`

Use `@supabase/ssr` for the browser and server Supabase clients. The browser
client starts the email/password flow; server-rendered pages and route handlers
read the authenticated identity through the cookie-backed server client. The
request boundary refreshes sessions and forwards refreshed cookies, while every
protected page or mutation performs its own server-side authorization check.

**Rationale**: The approved Tech Spec requires cookie-backed sessions for the
Next.js App Router and a persistent trusted-device experience. Supabase's SSR
guidance distinguishes cookie-backed SSR sessions from browser-only local
storage, and warns that server code must validate the user rather than trust a
raw session cookie.

**Alternatives considered**:

- Browser-only `supabase-js` session storage: rejected because server-rendered
  protected routes could not reliably establish the user context.
- A custom session service: rejected because it duplicates Supabase Auth and
  adds secrets, rotation and recovery behavior outside the approved stack.

## Decision: Auth flow stays delegated to Supabase Auth

Use the approved email/password operations for sign-in, sign-out and recovery
only for provisioned reseller/administrator accounts. Customers use the public
catalog without an Auth session. The application owns the PT-BR screens,
neutral messages and redirect behavior; Supabase owns credential verification,
recovery email delivery and token rotation. No custom login API, public
sign-up, OAuth, Cognito or MFA is added.

**Rationale**: The canonical ADR explicitly delegates authentication to
Supabase Auth and prohibits public provisioning paths. Keeping the application
thin reduces credential-handling risk.

**Alternatives considered**:

- Custom credential endpoint: rejected because it would make the application
  responsible for password handling and would duplicate the provider.
- Service-role calls for administrator login: rejected because service-role
  access bypasses normal user authorization and is reserved for maintainer
  provisioning.
- Requiring customer accounts: rejected because the MVP customer journey is a
  public catalog and WhatsApp handoff, not an authenticated checkout.

## Decision: Membership-derived authorization with RLS defense in depth

Resolve the target store from the authenticated user's active membership, then
apply the same scope in the application and Postgres policies. The browser or
URL may request a store context, but it never proves authorization. The
feature's initial membership role is `store_admin`; membership provisioning is
server-only and outside the administrator UI.

**Rationale**: Store membership is the approved tenancy boundary. RLS protects
direct Data API access and catches omissions in a server handler; application
checks provide safe routing and user-facing errors.

**Alternatives considered**:

- Frontend-only filtering: rejected because it is not an authorization control.
- URL-provided `store_id`: rejected because client input cannot establish a
  tenant relationship.
- Service-role access for all server operations: rejected because it bypasses
  RLS and increases the blast radius of an authorization error.

## Decision: No new canonical entity for this feature

Reuse `auth.users`, `stores`, and `store_memberships` from the approved data
model. This feature may add or complete migrations and policies needed to make
those entities executable, but it does not introduce a profile table, a custom
role hierarchy or a second membership representation.

## Resolved planning risks

- **Session refresh**: keep refresh logic at the Next.js request boundary and
  pass the resulting cookies to the response; do not treat an unverified cookie
  payload as authorization.
- **Account enumeration**: use the same recovery confirmation and safe login
  error language regardless of account existence.
- **Cross-tenant access**: test two stores and two administrators at both the
  application boundary and the database policy boundary.
- **Secret leakage**: test that public environment variables contain only the
  publishable Supabase URL/key and that service-role values are server-only.

## Sources

- `docs/workflow/tech-spec.md`
- `docs/adrs/0001-autenticacao-com-supabase-auth.md`
- `docs/adrs/0002-isolamento-multi-tenant-e-autorizacao.md`
- `docs/data-model.md`
- `docs/patterns/supabase-auth.md`
- `docs/patterns/supabase-postgres.md`
- [Supabase Server-Side Rendering](https://supabase.com/docs/guides/auth/server-side)
- [Creating a Supabase client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs&package-manager=pnpm&queryGroups=framework&queryGroups=package-manager)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
