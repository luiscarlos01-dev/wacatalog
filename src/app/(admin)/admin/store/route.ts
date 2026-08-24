import { getAuthenticatedStore } from "@/lib/auth/get-authenticated-store";
import { toAuthErrorResponse } from "@/lib/auth/auth-errors";
import { getServerSupabaseClientWithHeaders } from "@/lib/supabase/server";
import { queryAdminStore } from "@/lib/store/get-admin-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, responseHeaders } = await getServerSupabaseClientWithHeaders();
  const authorization = await getAuthenticatedStore(undefined, supabase);

  if (!authorization.ok) {
    return toAuthErrorResponse(authorization.code, responseHeaders);
  }

  const result = await queryAdminStore(supabase, authorization.value.storeId);

  if (!result.ok) {
    return toAuthErrorResponse(
      result.kind === "service_error" ? "service_unavailable" : "unauthorized",
      responseHeaders,
    );
  }

  return Response.json(result.store, { headers: responseHeaders });
}
