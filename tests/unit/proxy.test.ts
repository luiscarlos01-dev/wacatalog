import { describe, expect, it, vi } from "vitest";

const { createServerClientMock, nextResponseNextMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  nextResponseNextMock: vi.fn(),
}));

vi.mock("@/lib/config/env", () => ({
  getPublicEnv: () => ({
    supabaseUrl: "https://example.supabase.co",
    supabasePublishableKey: "public-anon-key",
  }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    next: (...args: unknown[]) => nextResponseNextMock(...args),
  },
}));

describe("proxy", () => {
  it("forwards refreshed cookies and cache headers after auth refresh", async () => {
    const response = {
      cookies: {
        set: vi.fn(),
      },
      headers: {
        set: vi.fn(),
      },
    };

    nextResponseNextMock.mockReturnValue(response);

    createServerClientMock.mockImplementation(
      (
        _supabaseUrl: string,
        _supabasePublishableKey: string,
        options: {
          cookies: {
            setAll: (
              cookiesToSet: Array<{
                name: string;
                value: string;
                options: { path: string };
              }>,
              headers: Record<string, string>,
            ) => Promise<void> | void;
          };
        },
      ) => ({
        auth: {
          getClaims: async () => {
            await options.cookies.setAll(
              [
                {
                  name: "sb-auth-token",
                  value: "new-session",
                  options: { path: "/" },
                },
              ],
              {
                "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
                Expires: "0",
                Pragma: "no-cache",
              },
            );

            return { data: { claims: { sub: "user-a" } }, error: null };
          },
        },
      }),
    );

    const cookieState = new Map([["sb-auth-token", "old-session"]]);
    const request = {
      cookies: {
        getAll: () => Array.from(cookieState, ([name, value]) => ({ name, value })),
        set: (name: string, value: string) => {
          cookieState.set(name, value);
          request.headers.set(
            "cookie",
            Array.from(
              cookieState,
              ([cookieName, cookieValue]) => `${cookieName}=${cookieValue}`,
            ).join("; "),
          );
        },
      },
      headers: new Headers({ cookie: "sb-auth-token=old-session" }),
    };

    const { proxy } = await import("@/proxy");
    const result = await proxy(request as never);

    expect(result).toBe(response);
    expect(nextResponseNextMock).toHaveBeenCalledTimes(1);
    expect(nextResponseNextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          headers: expect.any(Headers),
        }),
      }),
    );

    const nextCall = nextResponseNextMock.mock.calls[0]?.[0] as {
      request?: { headers?: Headers };
    };

    expect(nextCall.request?.headers?.get("cookie")).toBe("sb-auth-token=new-session");
    expect(response.cookies.set).toHaveBeenCalledWith("sb-auth-token", "new-session", {
      path: "/",
    });
    expect(response.headers.set).toHaveBeenCalledWith(
      "cache-control",
      "private, no-cache, no-store, must-revalidate, max-age=0",
    );
    expect(response.headers.set).toHaveBeenCalledWith("expires", "0");
    expect(response.headers.set).toHaveBeenCalledWith("pragma", "no-cache");
  });
});
