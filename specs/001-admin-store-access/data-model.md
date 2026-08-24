# Feature Data Model — Acesso da administradora e escopo da loja

This feature reuses the canonical Wacatalog model. It does not add a competing
identity or tenancy model.

## Entities in scope

### `auth.users`

Owned by Supabase Auth. The application reads the authenticated user identity
through the server-side Auth client and does not duplicate passwords or tokens
in the public schema.

### `stores`

Canonical entity representing the tenant. Because this is the first feature to
persist Wacatalog data, its migration must create `stores` before
`store_memberships`; this is foundation work, not a new feature-owned entity.
Store identity fields remain maintainer-owned.

| Field                          | Executable rule for this feature                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| `id`                           | `uuid` primary key with `gen_random_uuid()` default.                                        |
| `slug`                         | Required `text`, unique and stable as the public identifier.                                |
| `name`                         | Required `text` public name maintained by the maintainer.                                   |
| `whatsapp_number`              | Optional `text`; when present, matches normalized Brazilian international digits.           |
| `whatsapp_verification_status` | Required `text`, default `unverified`, restricted to `unverified` or `verified`.            |
| `whatsapp_verified_at`         | Optional `timestamptz`, present only after confirmed verification.                          |
| `created_at`                   | Required `timestamptz` with `now()` default.                                                |
| `updated_at`                   | Required `timestamptz` with `now()` default and maintained on every update by the database. |

Constraints and invariants:

- `slug` is unique and is not proof of administrative authorization.
- A non-null `whatsapp_number` contains only digits and matches
  `^55[0-9]{10,11}$`, matching the accepted OpenAPI contract for `55` + DDD +
  an eight- or nine-digit subscriber number.
- `whatsapp_verification_status` accepts only `unverified` or `verified`.
- `verified` requires both `whatsapp_number` and `whatsapp_verified_at`;
  `unverified` requires `whatsapp_verified_at` to be null.
- Changing `whatsapp_number` resets the status to `unverified` and clears
  `whatsapp_verified_at`. The same database trigger maintains `updated_at` on
  every update; this feature does not expose the mutation yet.
- Authenticated administrators cannot create, update or delete stores.
- Provisioning and identity changes use a trusted server-only maintainer
  operation, outside browser flows.

### `store_memberships`

Existing canonical entity that authorizes a user to operate a store.

| Field          | Executable rule for this feature                                     |
| -------------- | -------------------------------------------------------------------- |
| `id`           | `uuid` primary key with `gen_random_uuid()` default.                 |
| `store_id`     | Required `uuid` foreign key to `stores`.                             |
| `auth_user_id` | Required `uuid` reference to `auth.users`.                           |
| `role`         | Required `text`, default `store_admin` and restricted to that value. |
| `created_at`   | Required `timestamptz` with `now()` default.                         |

Constraints:

- `(store_id, auth_user_id)` is unique.
- A membership is created, changed or removed only by the maintainer's trusted
  provisioning operation.
- An authenticated user without a valid permitted membership has no
  administrative store context.
- The initial product supports one store membership per administrator; the
  schema remains capable of multiple stores.

## Authorization rules

1. Resolve `auth_user_id` from the verified server-side Auth identity.
2. Resolve the authorized `store_id` from `store_memberships` and the permitted
   `role`; never accept a client-provided store identifier as proof.
3. Apply the resolved store scope to every administrative read or mutation.
4. Enable RLS on exposed tenant-owned tables and grant only the roles needed by
   the operation.
5. For `stores`, grant authenticated users only the read needed by the
   membership-derived administrative context; do not grant browser writes.
6. Keep anonymous/public store reads out of this feature. The public-catalog
   contract must later define their exact fields, grants and policies; public
   catalog access never grants administrative access.
7. Return a safe denial for missing or foreign membership without
   revealing the target store or resource.

## Migration order and database verification

1. Apply the `stores` migration to an empty local or non-production database.
2. Verify its fields, defaults, constraints, trigger, explicit grants and
   enabled RLS. Before membership exists, RLS has no read policy and therefore
   denies every browser read.
3. Apply the `store_memberships` migration only after `stores` exists. Create
   the membership table, grants and own-row policy before adding the
   membership-dependent `stores` read policy in that same migration.
4. After both migrations finish, verify own-membership and own-store reads plus
   anonymous, unaffiliated, cross-store and authenticated-write denials.

The Supabase project does not automatically expose new tables. Grants and RLS
policies therefore belong in the migrations rather than dashboard-only state.
The application resolves the store through membership; neither `slug` nor a
client-provided `store_id` grants access.

## State transitions

```text
unauthenticated
  → authenticated + authorized membership
  → protected panel access

authenticated + no valid membership
  → denied administrative access

authorized session
  → signed out / expired / membership removed
  → login or safe denial before protected data
```

## Data not in scope

- Passwords, refresh tokens and service-role credentials.
- A public user profile table.
- Public signup or self-service membership creation.
- Product, banner, WhatsApp, order or cart data changes.
- Detailed audit history; operational logging must remain sanitized.

## Integrity and security verification

- Test an authorized administrator reading the own-store context.
- Test two administrators attempting opposite-store reads and mutations.
- Test an authenticated user without membership.
- Test a client-supplied foreign store identifier.
- Test that the public client cannot access membership rows.
- Test that no service-role value reaches browser output or logs.
