import { resolveAuthenticatedStore } from "@/lib/auth/get-authenticated-store";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { queryAdminStore } from "@/lib/store/get-admin-store";

export async function getAdminStore() {
  let supabase: Awaited<ReturnType<typeof getServerSupabaseClient>>;

  try {
    supabase = await getServerSupabaseClient();
  } catch {
    return { ok: false as const, code: "unauthenticated" as const };
  }

  const authorization = await resolveAuthenticatedStore(supabase);

  if (!authorization.ok) {
    return authorization;
  }

  const store = await queryAdminStore(supabase, authorization.value.storeId);

  if (!store.ok) {
    return { ok: false as const, code: "unauthorized" as const };
  }

  return { ok: true as const, value: store.store };
}
