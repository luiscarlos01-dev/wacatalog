# Authorization Contract

## Policy matrix

| Actor/context                     | Own store                                  | Another store                                  | No membership |
| --------------------------------- | ------------------------------------------ | ---------------------------------------------- | ------------- |
| Anonymous public catalog          | Published content only                     | Published content only when addressed publicly | N/A           |
| Authenticated `store_admin`       | Read and operate permitted admin resources | Deny without enumeration                       | Deny          |
| Maintainer provisioning operation | Explicit trusted operation                 | Explicit trusted operation                     | N/A           |

The maintainer operation is not exposed as an administrator route and is not
part of this feature's UI.

## Required checks

Every administrative operation must:

1. validate the request at the boundary;
2. obtain the authenticated user from the verified server-side session;
3. resolve the target store from `store_memberships` and the permitted role;
4. apply the store scope to the operation;
5. rely on matching Postgres RLS policies as defense in depth; and
6. map missing/foreign membership to a safe denial without target disclosure.

The client may display a store slug or route segment for navigation, but that
value is an input to resolution, never an authorization claim.

## Required negative cases

- no session;
- expired or invalid session;
- valid session with no membership;
- valid membership for store A requesting store B;
- ordinary authenticated session for store A attempting through the Supabase
  Data API to create a membership for store B; grants and RLS must deny it and
  no product endpoint or `service_role` client may be introduced for the test;
- attempt to mutate a tenant-owned resource outside the authorized store;
- public request attempting to read membership or unpublished store data.

The missing-membership browser scenario uses a third confirmed non-production
identity with no `store_memberships` row. It must not reuse or temporarily alter
either associated administrator's membership.
