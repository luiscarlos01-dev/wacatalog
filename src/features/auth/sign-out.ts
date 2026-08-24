import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

export async function signOut(): Promise<void> {
  await getBrowserSupabaseClient().auth.signOut();
}
