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

function makeStoresSupabaseMock(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const returnsSelf = vi.fn(() => chain);

  chain.update = returnsSelf;
  chain.eq = returnsSelf;
  chain.not = returnsSelf;
  chain.select = returnsSelf;
  chain.maybeSingle = vi.fn(async () => result);

  const from = vi.fn(() => chain);

  return { client: { from } as unknown as SupabaseClient<Database>, chain };
}

describe("confirmStoreWhatsapp", () => {
  it("marks the number verified with a timestamp on success", async () => {
    const { client, chain } = makeStoresSupabaseMock({ data: baseRow, error: null });

    const result = await confirmStoreWhatsapp(client, "store-a");

    expect(chain.not).toHaveBeenCalledWith("whatsapp_number", "is", null);
    expect(result).toEqual({
      ok: true,
      store: expect.objectContaining({
        whatsappVerificationStatus: "verified",
        whatsappVerifiedAt: "2026-08-28T12:00:00.000Z",
      }),
    });
  });

  it("reports a conflict when no number is configured", async () => {
    const { client } = makeStoresSupabaseMock({ data: null, error: null });

    const result = await confirmStoreWhatsapp(client, "store-a");

    expect(result).toEqual({ ok: false, kind: "no_number" });
  });

  it("is idempotent: reconfirming an already-verified number succeeds and updates the timestamp", async () => {
    const { client } = makeStoresSupabaseMock({
      data: { ...baseRow, whatsapp_verified_at: "2026-08-28T13:00:00.000Z" },
      error: null,
    });

    const result = await confirmStoreWhatsapp(client, "store-a");

    expect(result).toEqual({
      ok: true,
      store: expect.objectContaining({ whatsappVerifiedAt: "2026-08-28T13:00:00.000Z" }),
    });
  });

  it("reports service_error instead of throwing when the update itself fails", async () => {
    const { client } = makeStoresSupabaseMock({ data: null, error: { message: "down" } });

    const result = await confirmStoreWhatsapp(client, "store-a");

    expect(result).toEqual({ ok: false, kind: "service_error" });
  });
});
