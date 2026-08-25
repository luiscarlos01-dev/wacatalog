import { toAuthErrorResponse } from "@/lib/auth/auth-errors";
import { getAuthenticatedStore } from "@/lib/auth/get-authenticated-store";
import { jsonError } from "@/lib/http/api-error";
import { setProductLifecycle } from "@/lib/products/set-product-lifecycle";
import { getServerSupabaseClientWithHeaders } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ productId: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const { productId } = await params;
  const { supabase, responseHeaders } = await getServerSupabaseClientWithHeaders();
  const authorization = await getAuthenticatedStore(undefined, supabase);

  if (!authorization.ok) {
    return toAuthErrorResponse(authorization.code, responseHeaders);
  }

  const result = await setProductLifecycle(
    supabase,
    authorization.value.storeId,
    productId,
    "reactivate",
  );

  if (!result.ok) {
    if (result.kind === "not_found") {
      return jsonError(404, "not_found", "Produto não encontrado.", { headers: responseHeaders });
    }

    return jsonError(
      500,
      "service_unavailable",
      "Não foi possível concluir agora. Tente novamente mais tarde.",
      {
        headers: responseHeaders,
      },
    );
  }

  return Response.json(result.product, { headers: responseHeaders });
}
