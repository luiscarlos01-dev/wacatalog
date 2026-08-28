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

function makeStoresSupabaseMock(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const returnsSelf = vi.fn(() => chain);

  chain.update = returnsSelf;
  chain.eq = returnsSelf;
  chain.select = returnsSelf;
  chain.maybeSingle = vi.fn(async () => result);

  const from = vi.fn(() => chain);

  return { client: { from } as unknown as SupabaseClient<Database>, chain };
}

describe("updateStoreWhatsapp", () => {
  it("resets verification to unverified when updating from an already-verified number", async () => {
    const { client, chain } = makeStoresSupabaseMock({
      data: { ...baseRow, whatsapp_verification_status: "unverified", whatsapp_verified_at: null },
      error: null,
    });

    const result = await updateStoreWhatsapp(client, "store-a", "5511987654321");

    expect(chain.update).toHaveBeenCalledWith({
      whatsapp_number: "5511987654321",
      whatsapp_verification_status: "unverified",
      whatsapp_verified_at: null,
    });
    expect(result).toEqual({
      ok: true,
      store: expect.objectContaining({ whatsappVerificationStatus: "unverified" }),
    });
  });

  it("reports not_found for a cross-tenant store id", async () => {
    const { client } = makeStoresSupabaseMock({ data: null, error: null });

    const result = await updateStoreWhatsapp(client, "store-of-another-tenant", "5511987654321");

    expect(result).toEqual({ ok: false, kind: "not_found" });
  });

  it("reports service_error instead of throwing when the update itself fails", async () => {
    const { client } = makeStoresSupabaseMock({ data: null, error: { message: "down" } });

    const result = await updateStoreWhatsapp(client, "store-a", "5511987654321");

    expect(result).toEqual({ ok: false, kind: "service_error" });
  });
});
