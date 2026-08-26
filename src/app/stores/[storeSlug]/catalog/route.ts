import { jsonError } from "@/lib/http/api-error";
import { queryPublicCatalog } from "@/lib/public-catalog/query-public-catalog";
import { getServerPublicSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ storeSlug: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { storeSlug } = await params;
  const supabase = getServerPublicSupabaseClient();
  const result = await queryPublicCatalog(supabase, storeSlug);

  if (!result.ok) {
    if (result.kind === "not_found") {
      return jsonError(404, "not_found", "Loja não encontrada.");
    }

    return jsonError(
      500,
      "service_unavailable",
      "Não foi possível concluir agora. Tente novamente mais tarde.",
    );
  }

  return Response.json(result.catalog);
}
