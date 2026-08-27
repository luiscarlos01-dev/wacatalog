import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/config/env";
import type { Database } from "@/types/database";

export type ServerSupabaseClientResult = {
  supabase: SupabaseClient<Database>;
  responseHeaders: Headers;
};

export async function getServerSupabaseClientWithHeaders(): Promise<ServerSupabaseClientResult> {
  const cookieStore = await cookies();
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
  const responseHeaders = new Headers();

  return {
    supabase: createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet, headers) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });

            Object.entries(headers).forEach(([name, value]) => {
              responseHeaders.set(name, value);
            });
          } catch {
            // Server Components cannot always write cookies; proxy and route handlers handle refresh.
          }
        },
      },
    }),
    responseHeaders,
  };
}

export async function getServerSupabaseClient(): Promise<SupabaseClient<Database>> {
  const { supabase } = await getServerSupabaseClientWithHeaders();

  return supabase;
}

// A visitor's browser may also carry an unrelated admin session cookie (e.g.
// a store admin previewing their own public catalog); `createServerClient`
// would forward it and run the request as that admin's `authenticated` role
// instead of `anon`. Public routes must never depend on whatever auth state
// happens to be present, so this client never reads cookies at all.
export function getServerPublicSupabaseClient(): SupabaseClient<Database> {
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();

  return createClient<Database>(supabaseUrl, supabasePublishableKey);
}
