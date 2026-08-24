import { toAuthErrorResponse } from "@/lib/auth/auth-errors";
import { getAuthenticatedStore } from "@/lib/auth/get-authenticated-store";
import { deleteAssetIfOrphaned } from "@/lib/assets/delete-asset-if-orphaned";
import { jsonError } from "@/lib/http/api-error";
import { zodFieldErrors } from "@/lib/http/zod-fields";
import { deleteProduct } from "@/lib/products/delete-product";
import { productInputSchema } from "@/lib/products/product-input-schema";
import { PRODUCT_COLUMNS, toAdminProduct } from "@/lib/products/product-row";
import { updateProduct } from "@/lib/products/update-product";
import { getServerSupabaseClientWithHeaders } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ productId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { productId } = await params;
  const { supabase, responseHeaders } = await getServerSupabaseClientWithHeaders();
  const authorization = await getAuthenticatedStore(undefined, supabase);

  if (!authorization.ok) {
    return toAuthErrorResponse(authorization.code, responseHeaders);
  }

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("id", productId)
    .eq("store_id", authorization.value.storeId)
    .maybeSingle();

  if (error) {
    return jsonError(
      500,
      "service_unavailable",
      "Não foi possível concluir agora. Tente novamente mais tarde.",
      {
        headers: responseHeaders,
      },
    );
  }

  if (!data) {
    return jsonError(404, "not_found", "Produto não encontrado.", { headers: responseHeaders });
  }

  return Response.json(toAdminProduct(data), { headers: responseHeaders });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { productId } = await params;
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

  const result = await updateProduct(supabase, {
    storeId: authorization.value.storeId,
    productId,
    ...parsed.data,
  });

  if (!result.ok) {
    if (result.kind === "not_found") {
      return jsonError(404, "not_found", "Produto não encontrado.", { headers: responseHeaders });
    }

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

  return Response.json(result.product, { headers: responseHeaders });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { productId } = await params;
  const { supabase, responseHeaders } = await getServerSupabaseClientWithHeaders();
  const authorization = await getAuthenticatedStore(undefined, supabase);

  if (!authorization.ok) {
    return toAuthErrorResponse(authorization.code, responseHeaders);
  }

  const result = await deleteProduct(supabase, authorization.value.storeId, productId);

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

  await deleteAssetIfOrphaned(supabase, result.imageAssetId);

  return new Response(null, { headers: responseHeaders, status: 204 });
}
