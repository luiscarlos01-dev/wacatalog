// FR-011: live typing mask, purely client-side display — server-side
// normalization/validation (normalize-whatsapp-number.ts) is unaffected and
// unaware of this formatting.
export function formatWhatsappInput(raw: string): string {
  let digits = raw.replace(/\D/g, "");

  // Handles pasting an already-normalized value (e.g. `store.whatsappNumber`,
  // `55DDNNNNNNNNN`) or a value typed with the country code: only strips when
  // there are more than 11 digits left over, so an 11-digit DDD that happens
  // to start with "55" (Rio Grande do Sul) is never misread as a country code.
  if (digits.length > 11 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  digits = digits.slice(0, 11);

  if (digits.length === 0) {
    return "";
  }

  if (digits.length <= 2) {
    return `(${digits}`;
  }

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (rest.length <= 4) {
    return `(${ddd}) ${rest}`;
  }

  // The mask jumps from a 4-4 split to a 5-4 split exactly when the 9th
  // local digit is typed (9-digit mobile numbers), without imposing a
  // minimum length before that point.
  const splitAt = rest.length >= 9 ? 5 : 4;

  return `(${ddd}) ${rest.slice(0, splitAt)}-${rest.slice(splitAt)}`;
}
