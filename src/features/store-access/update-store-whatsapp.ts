import type { AdminStore } from "@/lib/store/get-admin-store";

export type UpdateStoreWhatsappResult =
  | { ok: true; store: AdminStore }
  | { ok: false; kind: "validation_error" | "service_error"; message?: string };

export async function updateStoreWhatsapp(
  whatsappNumber: string,
): Promise<UpdateStoreWhatsappResult> {
  try {
    const response = await fetch("/admin/store", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whatsappNumber }),
    });

    if (response.status === 200) {
      return { ok: true, store: (await response.json()) as AdminStore };
    }

    if (response.status === 422) {
      const body = (await response.json().catch(() => null)) as {
        fields?: Record<string, string>;
      } | null;
      return { ok: false, kind: "validation_error", message: body?.fields?.whatsappNumber };
    }

    return { ok: false, kind: "service_error" };
  } catch {
    return { ok: false, kind: "service_error" };
  }
}
