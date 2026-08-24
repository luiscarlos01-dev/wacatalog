import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

export async function hasRecoverySession(): Promise<boolean> {
  try {
    const { data } = await getBrowserSupabaseClient().auth.getSession();
    return Boolean(data.session);
  } catch {
    return false;
  }
}

export async function updateRecoveredPassword(password: string): Promise<boolean> {
  try {
    const { error } = await getBrowserSupabaseClient().auth.updateUser({ password });
    return !error;
  } catch {
    return false;
  }
}
