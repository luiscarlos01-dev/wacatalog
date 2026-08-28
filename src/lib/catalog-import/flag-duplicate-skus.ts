import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { CatalogImportCandidate } from "@/lib/catalog-import/extract-pdf-candidates";

export type FlaggedCatalogImportCandidate = CatalogImportCandidate & { isDuplicateSku: boolean };

export type FlagDuplicateSkusResult =
  { ok: true; candidates: FlaggedCatalogImportCandidate[] } | { ok: false };

// FR-004/FR-005: a candidate is a duplicate when its SKU already belongs to
// an existing product of the same store, OR collides with another
// candidate's SKU within the same PDF — either way, neither is created.
export async function flagDuplicateSkus(
  supabase: SupabaseClient<Database>,
  storeId: string,
  candidates: CatalogImportCandidate[],
): Promise<FlagDuplicateSkusResult> {
  const extractedSkus = candidates
    .map((candidate) => candidate.sku)
    .filter((sku): sku is string => sku !== null);

  const skuCounts = new Map<string, number>();

  for (const sku of extractedSkus) {
    skuCounts.set(sku, (skuCounts.get(sku) ?? 0) + 1);
  }

  const existingSkus = new Set<string>();

  if (extractedSkus.length > 0) {
    const { data, error } = await supabase
      .from("products")
      .select("sku")
      .eq("store_id", storeId)
      .in("sku", extractedSkus);

    if (error) {
      return { ok: false };
    }

    for (const row of data) {
      if (row.sku) {
        existingSkus.add(row.sku);
      }
    }
  }

  return {
    ok: true,
    candidates: candidates.map((candidate) => ({
      ...candidate,
      isDuplicateSku:
        candidate.sku !== null &&
        (existingSkus.has(candidate.sku) || (skuCounts.get(candidate.sku) ?? 0) > 1),
    })),
  };
}
