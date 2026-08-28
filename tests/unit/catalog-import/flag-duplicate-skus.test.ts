import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { flagDuplicateSkus } from "@/lib/catalog-import/flag-duplicate-skus";
import type { CatalogImportCandidate } from "@/lib/catalog-import/extract-pdf-candidates";
import type { Database } from "@/types/database";

function supabaseMock(existingSkus: string[]) {
  const inMock = vi.fn().mockResolvedValue({
    data: existingSkus.map((sku) => ({ sku })),
    error: null,
  });
  const eqMock = vi.fn(() => ({ in: inMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));

  return { client: { from: fromMock } as unknown as SupabaseClient<Database>, inMock, eqMock };
}

function candidate(name: string, sku: string | null): CatalogImportCandidate {
  return { name, sku, description: "" };
}

describe("flagDuplicateSkus", () => {
  it("flags a candidate whose SKU matches an existing product of the same store", async () => {
    const { client } = supabaseMock(["EXIST-1"]);

    const result = await flagDuplicateSkus(client, "store-a", [
      candidate("Produto novo", "NEW-1"),
      candidate("Produto repetido", "EXIST-1"),
    ]);

    expect(result).toEqual({
      ok: true,
      candidates: [
        { name: "Produto novo", sku: "NEW-1", description: "", isDuplicateSku: false },
        { name: "Produto repetido", sku: "EXIST-1", description: "", isDuplicateSku: true },
      ],
    });
  });

  it("flags two candidates that share the same SKU within the same PDF", async () => {
    const { client } = supabaseMock([]);

    const result = await flagDuplicateSkus(client, "store-a", [
      candidate("Item 1", "SAME"),
      candidate("Item 2", "SAME"),
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.candidates.every((c) => c.isDuplicateSku)).toBe(true);
  });

  it("never flags a candidate without a SKU as a duplicate", async () => {
    const { client } = supabaseMock([]);

    const result = await flagDuplicateSkus(client, "store-a", [candidate("Sem SKU", null)]);

    expect(result).toEqual({
      ok: true,
      candidates: [{ name: "Sem SKU", sku: null, description: "", isDuplicateSku: false }],
    });
  });

  it("scopes the existing-product lookup to the resolved store", async () => {
    const { client, eqMock } = supabaseMock([]);

    await flagDuplicateSkus(client, "store-a", [candidate("Produto", "SKU-1")]);

    expect(eqMock).toHaveBeenCalledWith("store_id", "store-a");
  });

  it("skips the query entirely when no candidate has a SKU", async () => {
    const { client, inMock } = supabaseMock([]);

    await flagDuplicateSkus(client, "store-a", [candidate("Produto", null)]);

    expect(inMock).not.toHaveBeenCalled();
  });

  it("returns ok: false when the existing-product lookup fails", async () => {
    const inMock = vi.fn().mockResolvedValue({ data: null, error: { message: "down" } });
    const client = {
      from: () => ({ select: () => ({ eq: () => ({ in: inMock }) }) }),
    } as unknown as SupabaseClient<Database>;

    const result = await flagDuplicateSkus(client, "store-a", [candidate("Produto", "SKU-1")]);

    expect(result).toEqual({ ok: false });
  });
});
