import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { updateStoreWhatsapp } from "@/lib/store/update-store-whatsapp";
import type { Database } from "@/types/database";

const baseRow = {
  id: "store-a",
  slug: "loja-a",
  name: "Loja A",
  whatsapp_number: "5511912345678",
  whatsapp_verification_status: "unverified",
  whatsapp_verified_at: null,
};

function makeStoresSupabaseMock(result: { data: unknown[] | null; error: unknown }) {
  const rpc = vi.fn(async () => result);

  return { client: { rpc } as unknown as SupabaseClient<Database>, rpc };
}

describe("updateStoreWhatsapp", () => {
  it("resets verification to unverified when updating from an already-verified number", async () => {
    const { client, rpc } = makeStoresSupabaseMock({
      data: [
        { ...baseRow, whatsapp_verification_status: "unverified", whatsapp_verified_at: null },
      ],
      error: null,
    });

    const result = await updateStoreWhatsapp(client, "5511987654321");

    // Achado A-2: no `storeId` is ever passed — the security-definer
    // function resolves the caller's own store via session/membership.
    expect(rpc).toHaveBeenCalledWith("update_store_whatsapp_number", {
      p_whatsapp_number: "5511987654321",
    });
    expect(result).toEqual({
      ok: true,
      store: expect.objectContaining({ whatsappVerificationStatus: "unverified" }),
    });
  });

  it("reports not_found when the function returns no row", async () => {
    const { client } = makeStoresSupabaseMock({ data: [], error: null });

    const result = await updateStoreWhatsapp(client, "5511987654321");

    expect(result).toEqual({ ok: false, kind: "not_found" });
  });

  it("reports service_error instead of throwing when the update itself fails", async () => {
    const { client } = makeStoresSupabaseMock({ data: null, error: { message: "down" } });

    const result = await updateStoreWhatsapp(client, "5511987654321");

    expect(result).toEqual({ ok: false, kind: "service_error" });
  });
});
