import {
  queryPublicCatalog,
  type QueryPublicCatalogResult,
} from "@/lib/public-catalog/query-public-catalog";
import { getServerPublicSupabaseClient } from "@/lib/supabase/server";

export async function getPublicCatalog(storeSlug: string): Promise<QueryPublicCatalogResult> {
  const supabase = getServerPublicSupabaseClient();

  return queryPublicCatalog(supabase, storeSlug);
}
