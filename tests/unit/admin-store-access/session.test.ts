import { describe, expect, it } from "vitest";

import { getAuthErrorDefinition } from "@/lib/auth/auth-errors";

describe("session denial mapping", () => {
  it("uses a login response for unauthenticated sessions", () => {
    expect(getAuthErrorDefinition("unauthenticated")).toMatchObject({ status: 401 });
  });

  it("uses a safe denial for invalid memberships", () => {
    expect(getAuthErrorDefinition("unauthorized")).toMatchObject({
      status: 403,
      message: "Você não tem acesso a esta área.",
    });
  });
});
