import { z } from "zod";

import { getAuthenticatedStore } from "@/lib/auth/get-authenticated-store";
import { toAuthErrorResponse } from "@/lib/auth/auth-errors";
import { jsonError } from "@/lib/http/api-error";
import { zodFieldErrors } from "@/lib/http/zod-fields";
import { getServerSupabaseClientWithHeaders } from "@/lib/supabase/server";
import { queryAdminStore } from "@/lib/store/get-admin-store";
import { normalizeWhatsappNumber } from "@/lib/store/normalize-whatsapp-number";
import { updateStoreWhatsapp } from "@/lib/store/update-store-whatsapp";

export const dynamic = "force-dynamic";

// docs/api/openapi.yaml UpdateWhatsappRequest: raw familiar-format bounds,
// checked before attempting normalization below.
const updateWhatsappSchema = z.object({
  whatsappNumber: z
    .string()
    .min(10, "Informe um número de WhatsApp válido.")
    .max(30, "Informe um número de WhatsApp válido."),
});

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

export async function PATCH(request: Request) {
  const { supabase, responseHeaders } = await getServerSupabaseClientWithHeaders();
  const authorization = await getAuthenticatedStore(undefined, supabase);

  if (!authorization.ok) {
    return toAuthErrorResponse(authorization.code, responseHeaders);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "bad_request", "A requisição está mal formada.", {
      headers: responseHeaders,
    });
  }

  const parsed = updateWhatsappSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(422, "validation_error", "Os dados informados são inválidos.", {
      fields: zodFieldErrors(parsed.error),
      headers: responseHeaders,
    });
  }

  const normalized = normalizeWhatsappNumber(parsed.data.whatsappNumber);

  if (!normalized.ok) {
    const message = "Informe um número de WhatsApp brasileiro válido, com DDD.";
    return jsonError(422, "validation_error", message, {
      fields: { whatsappNumber: message },
      headers: responseHeaders,
    });
  }

  const result = await updateStoreWhatsapp(supabase, authorization.value.storeId, normalized.value);

  if (!result.ok) {
    if (result.kind === "not_found") {
      return jsonError(404, "not_found", "Loja não encontrada.", { headers: responseHeaders });
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
