import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { confirmStoreWhatsapp } from "@/lib/store/confirm-store-whatsapp";
import type { Database } from "@/types/database";

const baseRow = {
  id: "store-a",
  slug: "loja-a",
  name: "Loja A",
  whatsapp_number: "5511912345678",
  whatsapp_verification_status: "verified",
  whatsapp_verified_at: "2026-08-28T12:00:00.000Z",
};

function makeStoresSupabaseMock(result: { data: unknown[] | null; error: unknown }) {
  const rpc = vi.fn(async () => result);

  return { client: { rpc } as unknown as SupabaseClient<Database>, rpc };
}

describe("confirmStoreWhatsapp", () => {
  it("marks the number verified with a timestamp on success", async () => {
    const { client, rpc } = makeStoresSupabaseMock({ data: [baseRow], error: null });

    const result = await confirmStoreWhatsapp(client);

    expect(rpc).toHaveBeenCalledWith("confirm_store_whatsapp_verification");
    expect(result).toEqual({
      ok: true,
      store: expect.objectContaining({
        whatsappVerificationStatus: "verified",
        whatsappVerifiedAt: "2026-08-28T12:00:00.000Z",
      }),
    });
  });

  it("reports a conflict when the function returns no row (no number configured)", async () => {
    const { client } = makeStoresSupabaseMock({ data: [], error: null });

    const result = await confirmStoreWhatsapp(client);

    expect(result).toEqual({ ok: false, kind: "no_number" });
  });

  it("is idempotent: reconfirming an already-verified number succeeds and updates the timestamp", async () => {
    const { client } = makeStoresSupabaseMock({
      data: [{ ...baseRow, whatsapp_verified_at: "2026-08-28T13:00:00.000Z" }],
      error: null,
    });

    const result = await confirmStoreWhatsapp(client);

    expect(result).toEqual({
      ok: true,
      store: expect.objectContaining({ whatsappVerifiedAt: "2026-08-28T13:00:00.000Z" }),
    });
  });

  it("reports service_error instead of throwing when the update itself fails", async () => {
    const { client } = makeStoresSupabaseMock({ data: null, error: { message: "down" } });

    const result = await confirmStoreWhatsapp(client);

    expect(result).toEqual({ ok: false, kind: "service_error" });
  });
});
