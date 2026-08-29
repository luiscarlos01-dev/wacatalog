export type NormalizeWhatsappNumberResult = { ok: true; value: string } | { ok: false };

const NORMALIZED_PATTERN = /^55[0-9]{10,11}$/;

// research.md: reuses the exact pattern already approved and implemented in
// `PublicCatalog.store.whatsappNumber` (docs/api/openapi.yaml, feature 003),
// so a value saved here is always consumable by the public catalog without
// further conversion.
export function normalizeWhatsappNumber(input: string): NormalizeWhatsappNumberResult {
  const digits = input.replace(/\D/g, "");

  let candidate = digits;

  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    candidate = digits;
  } else if (digits.length === 10 || digits.length === 11) {
    candidate = `55${digits}`;
  }

  if (!NORMALIZED_PATTERN.test(candidate)) {
    return { ok: false };
  }

  return { ok: true, value: candidate };
}
