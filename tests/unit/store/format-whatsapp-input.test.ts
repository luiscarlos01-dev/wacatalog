import { describe, expect, it } from "vitest";

import { formatWhatsappInput } from "@/lib/store/format-whatsapp-input";

describe("formatWhatsappInput", () => {
  it("returns empty for no digits", () => {
    expect(formatWhatsappInput("")).toBe("");
    expect(formatWhatsappInput("abc")).toBe("");
  });

  it("shows an incomplete DDD without a closing parenthesis", () => {
    expect(formatWhatsappInput("1")).toBe("(1");
    expect(formatWhatsappInput("11")).toBe("(11");
  });

  it("formats an 8-digit local number (landline)", () => {
    expect(formatWhatsappInput("1134567890")).toBe("(11) 3456-7890");
  });

  it("formats a 9-digit local number (mobile), splitting 5-4", () => {
    expect(formatWhatsappInput("11912345678")).toBe("(11) 91234-5678");
  });

  it("builds the mask progressively as digits are typed one at a time", () => {
    expect(formatWhatsappInput("1")).toBe("(1");
    expect(formatWhatsappInput("11")).toBe("(11");
    expect(formatWhatsappInput("119")).toBe("(11) 9");
    expect(formatWhatsappInput("1191")).toBe("(11) 91");
    expect(formatWhatsappInput("11912")).toBe("(11) 912");
    expect(formatWhatsappInput("119123")).toBe("(11) 9123");
    expect(formatWhatsappInput("1191234")).toBe("(11) 9123-4");
    expect(formatWhatsappInput("11912345")).toBe("(11) 9123-45");
    expect(formatWhatsappInput("119123456")).toBe("(11) 9123-456");
    expect(formatWhatsappInput("1191234567")).toBe("(11) 9123-4567");
    // 9th local digit: jumps from a 4-4 split to a 5-4 split.
    expect(formatWhatsappInput("11912345678")).toBe("(11) 91234-5678");
  });

  it("strips symbols when pasting an already-formatted or +55 value", () => {
    expect(formatWhatsappInput("+55 (11) 91234-5678")).toBe("(11) 91234-5678");
  });

  it("strips a leading 55 country code only when it leaves more than 11 digits", () => {
    // Pasting store.whatsappNumber's already-normalized form (55DDNNNNNNNNN).
    expect(formatWhatsappInput("5511912345678")).toBe("(11) 91234-5678");
  });

  it("never misreads an 11-digit DDD-55 number as a country code", () => {
    // DDD 55 (Rio Grande do Sul) + 9-digit local number happens to start
    // with "55" too, but is exactly 11 digits — must not be stripped.
    expect(formatWhatsappInput("55987654321")).toBe("(55) 98765-4321");
  });

  it("caps input at 11 digits, ignoring anything typed or pasted beyond that", () => {
    expect(formatWhatsappInput("119123456789999")).toBe("(11) 91234-5678");
  });
});
