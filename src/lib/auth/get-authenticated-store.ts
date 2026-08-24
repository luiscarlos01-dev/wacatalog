import type { SupabaseClient } from "@supabase/supabase-js";

import { getServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type StoreAuthorizationCode = "unauthenticated" | "unauthorized" | "service_unavailable";

export type AuthenticatedStore = {
  userId: string;
  storeId: string;
  role: "store_admin";
};

export type StoreAuthorizationResult =
  { ok: true; value: AuthenticatedStore } | { ok: false; code: StoreAuthorizationCode };

type StoreClient = SupabaseClient<Database>;
type AuthClaims = {
  sub?: string | null;
};

type StoreAuthClient = {
  getClaims?: () => Promise<{
    data: { claims: AuthClaims | null };
    error: unknown;
  }>;
  getUser: () => Promise<{
    data: { user: { id: string } | null };
    error: unknown;
  }>;
};

async function resolveAuthenticatedUserId(auth: StoreAuthClient): Promise<string | null> {
  if (auth.getClaims) {
    try {
      const {
        data: { claims },
        error,
      } = await auth.getClaims();

      if (!error && claims?.sub) {
        return claims.sub;
      }
    } catch {
      // Fall back to the user lookup below.
    }
  }

  const {
    data: { user },
    error,
  } = await auth.getUser();

  if (error || !user) {
    return null;
  }

  return user.id;
}

export async function resolveAuthenticatedStore(
  supabase: StoreClient,
  targetStoreId?: string,
): Promise<StoreAuthorizationResult> {
  const userId = await resolveAuthenticatedUserId(supabase.auth as StoreAuthClient);

  if (!userId) {
    return { ok: false, code: "unauthenticated" };
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("store_memberships")
    .select("store_id, role")
    .eq("auth_user_id", userId)
    .eq("role", "store_admin")
    .limit(2);

  if (membershipError) {
    return { ok: false, code: "service_unavailable" };
  }

  if (!memberships || memberships.length !== 1) {
    return { ok: false, code: "unauthorized" };
  }

  const membership = memberships[0];

  if (targetStoreId && targetStoreId !== membership.store_id) {
    return { ok: false, code: "unauthorized" };
  }

  return {
    ok: true,
    value: {
      userId,
      storeId: membership.store_id,
      // The query above already filters `.eq("role", "store_admin")`; the
      // generated column type is a plain `string` because the DB constraint
      // is a CHECK, not a native Postgres enum.
      role: membership.role as "store_admin",
    },
  };
}

export async function getAuthenticatedStore(
  targetStoreId?: string,
  supabase?: StoreClient,
): Promise<StoreAuthorizationResult> {
  try {
    const client = supabase ?? (await getServerSupabaseClient());
    return await resolveAuthenticatedStore(client, targetStoreId);
  } catch {
    return { ok: false, code: "service_unavailable" };
  }
}
