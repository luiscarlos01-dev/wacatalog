import { getAuthenticatedStore } from "@/lib/auth/get-authenticated-store";
import { toAuthErrorResponse } from "@/lib/auth/auth-errors";
import { jsonError } from "@/lib/http/api-error";
import { confirmStoreWhatsapp } from "@/lib/store/confirm-store-whatsapp";
import { getServerSupabaseClientWithHeaders } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const { supabase, responseHeaders } = await getServerSupabaseClientWithHeaders();
  const authorization = await getAuthenticatedStore(undefined, supabase);

  if (!authorization.ok) {
    return toAuthErrorResponse(authorization.code, responseHeaders);
  }

  const result = await confirmStoreWhatsapp(supabase);

  if (!result.ok) {
    if (result.kind === "no_number") {
      return jsonError(
        409,
        "conflict",
        "Configure um número de WhatsApp antes de confirmar a verificação.",
        { headers: responseHeaders },
      );
    }

    return jsonError(
      500,
      "service_unavailable",
      "Não foi possível concluir agora. Tente novamente mais tarde.",
      { headers: responseHeaders },
    );
  }

  return Response.json(result.store, { headers: responseHeaders });
}
