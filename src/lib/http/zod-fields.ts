import type { z } from "zod";

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";

    if (!(key in fields)) {
      fields[key] = issue.message;
    }
  }

  return fields;
}
