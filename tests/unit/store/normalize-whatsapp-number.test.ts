import { describe, expect, it } from "vitest";

import { normalizeWhatsappNumber } from "@/lib/store/normalize-whatsapp-number";

describe("normalizeWhatsappNumber", () => {
  it("keeps a value already in +55 international format", () => {
    expect(normalizeWhatsappNumber("+55 11 91234-5678")).toEqual({
      ok: true,
      value: "5511912345678",
    });
  });

  it("keeps a value with 55 but no + sign", () => {
    expect(normalizeWhatsappNumber("55 (11) 91234-5678")).toEqual({
      ok: true,
      value: "5511912345678",
    });
  });

  it("prefixes 55 onto a DDD + 9-digit number without a country code", () => {
    expect(normalizeWhatsappNumber("(11) 91234-5678")).toEqual({
      ok: true,
      value: "5511912345678",
    });
  });

  it("prefixes 55 onto a DDD + 8-digit landline without a country code", () => {
    expect(normalizeWhatsappNumber("11 1234-5678")).toEqual({
      ok: true,
      value: "551112345678",
    });
  });

  it("rejects a value too short to be a Brazilian number", () => {
    expect(normalizeWhatsappNumber("1234567")).toEqual({ ok: false });
  });

  it("rejects a value too long to be a Brazilian number", () => {
    expect(normalizeWhatsappNumber("5511912345678901")).toEqual({ ok: false });
  });

  it("rejects a value with no digits at all", () => {
    expect(normalizeWhatsappNumber("não é um número")).toEqual({ ok: false });
  });
});
