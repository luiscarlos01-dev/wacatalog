import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getPublicEnv } from "@/lib/config/env";
import type { Database } from "@/types/database";

export async function proxy(request: NextRequest) {
  const responseHeaders = new Headers();
  const pendingCookies: Array<{
    name: string;
    value: string;
    options: unknown;
  }> = [];

  try {
    const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
    const supabase = createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            pendingCookies.push({ name, value, options });
          });

          Object.entries(headers).forEach(([name, value]) => {
            responseHeaders.set(name, value);
          });
        },
      },
    });

    await supabase.auth.getClaims();
  } catch {
    // Missing local configuration should not block the public shell.
  }

  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });

  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as never);
  });

  responseHeaders.forEach((value, name) => {
    response.headers.set(name, value);
  });

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
