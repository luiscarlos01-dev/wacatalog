import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getAuthenticatedStore,
  resolveAuthenticatedStore,
} from "@/lib/auth/get-authenticated-store";
import type { Database } from "@/types/database";

type MockSupabase = {
  auth: {
    getClaims?: ReturnType<typeof vi.fn>;
    getUser: ReturnType<typeof vi.fn>;
  };
  from: ReturnType<typeof vi.fn>;
};

function createSupabaseMock({
  claims,
  user,
  userError = null,
  memberships = [],
  membershipError = null,
}: {
  claims?: { sub?: string } | null;
  user: { id: string } | null;
  userError?: Error | null;
  memberships?: Array<{ store_id: string; role: "store_admin" }>;
  membershipError?: Error | null;
}): MockSupabase {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    limit: vi.fn(async () => ({ data: memberships, error: membershipError })),
  };

  return {
    auth: {
      getClaims:
        claims === undefined
          ? undefined
          : vi.fn(async () => ({
              data: { claims },
              error: null,
            })),
      getUser: vi.fn(async () => ({ data: { user }, error: userError })),
    },
    from: vi.fn(() => query),
  };
}

function asSupabaseClient(mock: MockSupabase) {
  return mock as unknown as SupabaseClient<Database>;
}

describe("resolveAuthenticatedStore", () => {
  it("resolves the store from the verified user's membership", async () => {
    const result = await resolveAuthenticatedStore(
      asSupabaseClient(
        createSupabaseMock({
          user: { id: "user-a" },
          memberships: [{ store_id: "store-a", role: "store_admin" }],
        }),
      ),
    );

    expect(result).toEqual({
      ok: true,
      value: { userId: "user-a", storeId: "store-a", role: "store_admin" },
    });
  });

  it("prefers validated claims when they are available", async () => {
    const result = await resolveAuthenticatedStore(
      asSupabaseClient(
        createSupabaseMock({
          claims: { sub: "user-a" },
          user: null,
          memberships: [{ store_id: "store-a", role: "store_admin" }],
        }),
      ),
    );

    expect(result).toEqual({
      ok: true,
      value: { userId: "user-a", storeId: "store-a", role: "store_admin" },
    });
  });

  it("denies a missing or invalid session without querying membership data", async () => {
    const supabase = createSupabaseMock({ user: null, userError: new Error("invalid") });

    await expect(resolveAuthenticatedStore(asSupabaseClient(supabase))).resolves.toEqual({
      ok: false,
      code: "unauthenticated",
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("reports service_unavailable, not unauthorized, when the membership query itself fails", async () => {
    const supabase = createSupabaseMock({
      user: { id: "user-a" },
      membershipError: new Error("57P01: terminating connection due to administrator command"),
    });

    await expect(resolveAuthenticatedStore(asSupabaseClient(supabase))).resolves.toEqual({
      ok: false,
      code: "service_unavailable",
    });
  });

  it("denies an account without exactly one permitted membership", async () => {
    await expect(
      resolveAuthenticatedStore(asSupabaseClient(createSupabaseMock({ user: { id: "user-a" } }))),
    ).resolves.toEqual({ ok: false, code: "unauthorized" });
  });

  it("denies a foreign target store", async () => {
    await expect(
      resolveAuthenticatedStore(
        asSupabaseClient(
          createSupabaseMock({
            user: { id: "user-a" },
            memberships: [{ store_id: "store-a", role: "store_admin" }],
          }),
        ),
        "store-b",
      ),
    ).resolves.toEqual({ ok: false, code: "unauthorized" });
  });
});

describe("getAuthenticatedStore", () => {
  it("does not let a rejected promise escape when the client throws", async () => {
    const throwingClient = {
      auth: {
        getUser: vi.fn(() => Promise.reject(new TypeError("fetch failed"))),
      },
    } as unknown as SupabaseClient<Database>;

    await expect(getAuthenticatedStore(undefined, throwingClient)).resolves.toEqual({
      ok: false,
      code: "service_unavailable",
    });
  });
});
