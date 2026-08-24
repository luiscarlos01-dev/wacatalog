import { describe, expect, it } from "vitest";

import { validateLoginInput } from "@/features/auth/login-form";

describe("validateLoginInput", () => {
  it("rejects empty and malformed values", () => {
    expect(validateLoginInput({ email: "  ", password: "" })).toEqual({
      email: "Informe um email válido.",
      password: "Informe sua senha.",
    });
  });

  it("accepts a trimmed email and password", () => {
    expect(validateLoginInput({ email: "admin@example.com ", password: "secret" })).toEqual({});
  });
});
