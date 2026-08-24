# Admin Access Contract

This feature adds the administrator-facing access contract around the existing
Supabase Auth and Wacatalog admin API boundaries. It does not add a custom
credential API.

## Routes and states

| Route/state              | unauthenticated                                                            | authenticated + authorized                       | authenticated without membership |
| ------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------- |
| `/admin/login`           | Login form for provisioned reseller/admin accounts; no signup link         | Redirect to the protected panel                  | Safe denial or return to login   |
| `/admin/forgot-password` | Recovery email form and neutral confirmation                               | Same recovery flow                               | Same neutral confirmation        |
| `/admin/reset-password`  | Only reachable with a valid recovery flow for a provisioned reseller/admin | Password update flow if supplied by the provider | Safe invalid-link state          |
| `/admin`                 | Redirect to login                                                          | Store panel                                      | Deny without store data          |
| `/admin/store` API       | `401`                                                                      | `200` for the authorized store                   | `403` without store disclosure   |
| logout action            | No protected data exposed                                                  | Ends session and returns to login                | Returns to login                 |
| Public catalog           | No login or session required                                               | N/A                                              | N/A                              |

Any authentication state can also receive `500` from `/admin/store` when a
downstream Supabase query (membership or store resolution) fails, independent
of the identity/authorization outcome above.

A return session is recognized only in the same browser profile while its
Supabase cookies remain valid. The MVP has no “trust this device” checkbox or
device fingerprint; administrators must sign out explicitly on shared devices.

Visible copy is PT-BR, concise and safe. Login and recovery failures do not
confirm whether an email, user, store or membership exists. Customers use only
the public catalog and never see the administrator login or recovery flow.

## Existing HTTP contract

The feature consumes the approved `GET /admin/store` operation from
`docs/api/openapi.yaml`. It must preserve:

- bearer/session authentication;
- `401` for missing or invalid authentication;
- `403` for a valid identity without authorization for the store context;
- `500` with `{code: "service_unavailable", message}` when the underlying
  membership or store query fails, regardless of authentication state;
- no store identifier supplied by the browser can override server-side
  membership resolution.

Supabase Auth operations remain provider operations, not new Wacatalog routes:
sign-in with password, sign-out and recovery email are called through the
approved client boundary.

## Security contract

- Credentials are submitted only to the Auth provider through the approved
  client; the application does not persist passwords.
- Session cookies are handled by the SSR client and are never rendered into
  page content, logs or client props.
- Membership and tenant data are never returned by public catalog routes.
- All protected routes perform server-side identity and membership checks before
  rendering or mutating protected content.
- Browser validation covers desktop and mobile contexts without weakening the
  server-side membership check.
