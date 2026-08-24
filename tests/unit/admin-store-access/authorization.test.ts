import { describe, expect, it } from "vitest";

import { getAuthErrorDefinition } from "@/lib/auth/auth-errors";

describe("authorization boundary", () => {
  it("does not disclose the requested store in foreign-store denial", () => {
    const definition = getAuthErrorDefinition("unauthorized");

    expect(definition.message).not.toContain("store-b");
    expect(definition.message).not.toContain("loja B");
  });
});
