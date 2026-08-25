import { toAuthErrorResponse } from "@/lib/auth/auth-errors";
import { getAuthenticatedStore } from "@/lib/auth/get-authenticated-store";
import { jsonError } from "@/lib/http/api-error";
import { zodFieldErrors } from "@/lib/http/zod-fields";
import { createProduct } from "@/lib/products/create-product";
import { listProducts } from "@/lib/products/list-products";
import { productInputSchema } from "@/lib/products/product-input-schema";
import { getServerSupabaseClientWithHeaders } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, responseHeaders } = await getServerSupabaseClientWithHeaders();
  const authorization = await getAuthenticatedStore(undefined, supabase);

  if (!authorization.ok) {
    return toAuthErrorResponse(authorization.code, responseHeaders);
  }

  const result = await listProducts(supabase, authorization.value.storeId);

  if (!result.ok) {
    return jsonError(
      500,
      "service_unavailable",
      "Não foi possível concluir agora. Tente novamente mais tarde.",
      {
        headers: responseHeaders,
      },
    );
  }

  return Response.json({ items: result.items }, { headers: responseHeaders });
}

export async function POST(request: Request) {
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

  const parsed = productInputSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(422, "validation_error", "Os dados informados são inválidos.", {
      fields: zodFieldErrors(parsed.error),
      headers: responseHeaders,
    });
  }

  const result = await createProduct(supabase, {
    storeId: authorization.value.storeId,
    ...parsed.data,
  });

  if (!result.ok) {
    if (result.kind === "sku_conflict") {
      return jsonError(409, "conflict", "Este SKU já está em uso por outro produto da loja.", {
        headers: responseHeaders,
      });
    }

    if (result.kind === "validation_error") {
      return jsonError(422, "validation_error", "Os dados informados são inválidos.", {
        headers: responseHeaders,
      });
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

  return Response.json(result.product, { headers: responseHeaders, status: 201 });
}
