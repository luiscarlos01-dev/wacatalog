import { mapProviderAuthError } from "@/lib/auth/auth-errors";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

type PasswordAuthClient = {
  signInWithPassword(credentials: { email: string; password: string }): Promise<{
    error: unknown;
  }>;
};

export type SignInResult =
  { ok: true } | { ok: false; code: ReturnType<typeof mapProviderAuthError> };

export async function signIn(email: string, password: string): Promise<SignInResult> {
  try {
    const auth = getBrowserSupabaseClient().auth as unknown as PasswordAuthClient;
    const { error } = await auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { ok: false, code: mapProviderAuthError(error) };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, code: mapProviderAuthError(error) };
  }
}
