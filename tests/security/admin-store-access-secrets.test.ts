import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const browserModules = [
  "src/lib/config/env.ts",
  "src/lib/supabase/browser.ts",
  "src/lib/supabase/public.ts",
  "src/features/auth/sign-in.ts",
  "src/features/auth/request-recovery.ts",
];

describe("admin access secret boundary", () => {
  it("keeps the service-role environment value out of browser modules", async () => {
    const contents = await Promise.all(browserModules.map((file) => readFile(file, "utf8")));

    expect(contents.join("\n")).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(contents.join("\n")).not.toContain("service_role");
  });
});
