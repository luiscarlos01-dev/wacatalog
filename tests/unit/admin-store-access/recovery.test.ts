import { describe, expect, it } from "vitest";

import { validateRecoveryEmail } from "@/features/auth/recovery-form";

describe("validateRecoveryEmail", () => {
  it("validates the email at the browser boundary", () => {
    expect(validateRecoveryEmail("nope")).toBe("Informe um email válido.");
    expect(validateRecoveryEmail("admin@example.com")).toBeUndefined();
  });
});
