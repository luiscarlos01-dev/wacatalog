import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  getAuthErrorDefinition,
  mapProviderAuthError,
  mapRecoveryError,
} from "@/lib/auth/auth-errors";

describe("safe authentication errors", () => {
  it("maps provider login failures to neutral copy", () => {
    const definition = getAuthErrorDefinition(
      mapProviderAuthError(new AuthApiError("Invalid credentials", 400, "invalid_credentials")),
    );

    expect(definition.status).toBe(401);
    expect(definition.message).not.toMatch(/email cadastrado|usuário existe/i);
  });

  it("separates retryable and unexpected failures from invalid credentials", () => {
    expect(mapProviderAuthError(new AuthRetryableFetchError("Unavailable", 503))).toBe(
      "service_unavailable",
    );
    expect(mapProviderAuthError(new Error("Unexpected"))).toBe("service_unavailable");
  });

  it("does not turn recovery provider failures into account enumeration", () => {
    expect(mapRecoveryError()).toBe("service_unavailable");
  });
});
