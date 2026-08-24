import { mapRecoveryError } from "@/lib/auth/auth-errors";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

export type RecoveryRequestResult =
  { ok: true } | { ok: false; code: ReturnType<typeof mapRecoveryError> };

export async function requestRecovery(email: string): Promise<RecoveryRequestResult> {
  try {
    const { error } = await getBrowserSupabaseClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });

    if (error) {
      return { ok: false, code: mapRecoveryError() };
    }

    return { ok: true };
  } catch {
    return { ok: false, code: mapRecoveryError() };
  }
}
