"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/config/env";
import type { Database } from "@/types/database";

let publicClient: SupabaseClient<Database> | undefined;

export function getPublicSupabaseClient(): SupabaseClient<Database> {
  if (publicClient) {
    return publicClient;
  }

  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
  publicClient = createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
  return publicClient;
}
