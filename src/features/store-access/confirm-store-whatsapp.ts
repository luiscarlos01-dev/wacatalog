import type { AdminStore } from "@/lib/store/get-admin-store";

export type ConfirmStoreWhatsappResult =
  { ok: true; store: AdminStore } | { ok: false; kind: "no_number" | "service_error" };

export async function confirmStoreWhatsapp(): Promise<ConfirmStoreWhatsappResult> {
  try {
    const response = await fetch("/admin/store/whatsapp/verification", { method: "POST" });

    if (response.status === 200) {
      return { ok: true, store: (await response.json()) as AdminStore };
    }

    if (response.status === 409) {
      return { ok: false, kind: "no_number" };
    }

    return { ok: false, kind: "service_error" };
  } catch {
    return { ok: false, kind: "service_error" };
  }
}
