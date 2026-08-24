import { z } from "zod";

const publicEnvSchema = z.object({
  supabaseUrl: z.url(),
  supabasePublishableKey: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

function parseEnv<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new Error("Supabase configuration is unavailable.");
  }

  return result.data;
}

export function getPublicEnv(): PublicEnv {
  return parseEnv(publicEnvSchema, {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
