import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type MockTextItem = { str: string; hasEOL: boolean; transform: number[] };

const removeMock = vi.fn();
const downloadMock = vi.fn();

function supabaseMock(): SupabaseClient<Database> {
  return {
    storage: {
      from: () => ({
        download: downloadMock,
        remove: removeMock,
      }),
    },
  } as unknown as SupabaseClient<Database>;
}

const PDF_MAGIC = Buffer.from("%PDF-1.4\n");

function pdfBuffer(size = PDF_MAGIC.byteLength): Buffer {
  const buffer = Buffer.alloc(Math.max(size, PDF_MAGIC.byteLength));
  PDF_MAGIC.copy(buffer);
  return buffer;
}

function downloadOk(buffer: Buffer) {
  downloadMock.mockResolvedValue({
    data: {
      arrayBuffer: async () =>
        buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    },
    error: null,
  });
}

// Mocks `pdfjs-dist` entirely: this suite exercises `extractPdfCandidates`'s
// own orchestration (download → magic bytes → resource limits → parsing →
// cleanup) and the position-aware text-block heuristic, never real PDF
// parsing — pdfjs-dist itself is Mozilla's own, out of scope here.
let getDocumentImpl: (options: { data: Uint8Array }) => {
  promise: Promise<{
    numPages: number;
    getPage: (n: number) => Promise<{
      getTextContent: () => Promise<{ items: MockTextItem[] }>;
      cleanup: () => void;
    }>;
  }>;
  destroy: () => Promise<void>;
};

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  getDocument: (options: { data: Uint8Array }) => getDocumentImpl(options),
}));

const { extractPdfCandidates } = await import("@/lib/catalog-import/extract-pdf-candidates");

function pageOf(items: MockTextItem[]) {
  return { getTextContent: async () => ({ items }), cleanup: () => {} };
}

function mockDocument(pagesItems: MockTextItem[][]) {
  getDocumentImpl = () => ({
    promise: Promise.resolve({
      numPages: pagesItems.length,
      getPage: async (n: number) => pageOf(pagesItems[n - 1]),
    }),
    destroy: async () => {},
  });
}

// One item per line (hasEOL always true), matching a single text run per
// visual line — real PDFs emit several runs per line, but the heuristic
// only cares about each line's own text/position once assembled.
function line(text: string, options?: { x?: number; y?: number; fontSize?: number }): MockTextItem {
  const fontSize = options?.fontSize ?? 7;
  const x = options?.x ?? 90;
  const y = options?.y ?? 500;
  return { str: text, hasEOL: true, transform: [fontSize, 0, 0, fontSize, x, y] };
}

describe("extractPdfCandidates", () => {
  beforeEach(() => {
    downloadMock.mockReset();
    removeMock.mockReset();
    removeMock.mockResolvedValue({ data: null, error: null });
  });

  it("returns not_found when the object cannot be downloaded", async () => {
    downloadMock.mockResolvedValue({ data: null, error: { message: "not found" } });

    const result = await extractPdfCandidates(supabaseMock(), "store-a/x.pdf");

    expect(result).toEqual({ ok: false, kind: "not_found" });
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("rejects a file above 50 MB before attempting to parse it", async () => {
    downloadOk(pdfBuffer(100 * 1024 * 1024 + 1));

    const result = await extractPdfCandidates(supabaseMock(), "store-a/x.pdf");

    expect(result).toEqual({ ok: false, kind: "too_large" });
    expect(removeMock).toHaveBeenCalledWith(["store-a/x.pdf"]);
  });

  it("rejects a file without the PDF magic bytes as unsupported_format", async () => {
    downloadOk(Buffer.from("not a pdf at all"));

    const result = await extractPdfCandidates(supabaseMock(), "store-a/x.pdf");

    expect(result).toEqual({ ok: false, kind: "unsupported_format" });
    expect(removeMock).toHaveBeenCalledWith(["store-a/x.pdf"]);
  });

  it("reports corrupted when pdfjs-dist fails to load the document", async () => {
    downloadOk(pdfBuffer());
    getDocumentImpl = () => ({
      promise: Promise.reject(new Error("bad xref")),
      destroy: async () => {},
    });

    const result = await extractPdfCandidates(supabaseMock(), "store-a/x.pdf");

    expect(result).toEqual({ ok: false, kind: "corrupted" });
    expect(removeMock).toHaveBeenCalledWith(["store-a/x.pdf"]);
  });

  it("rejects a document above the 300-page limit without extracting", async () => {
    downloadOk(pdfBuffer());
    getDocumentImpl = () => ({
      promise: Promise.resolve({
        numPages: 301,
        getPage: async () => {
          throw new Error("must not be called past the page-limit check");
        },
      }),
      destroy: async () => {},
    });

    const result = await extractPdfCandidates(supabaseMock(), "store-a/x.pdf");

    expect(result).toEqual({ ok: false, kind: "too_many_pages" });
    expect(removeMock).toHaveBeenCalledWith(["store-a/x.pdf"]);
  });

  it("times out instead of hanging past the configured limit", async () => {
    downloadOk(pdfBuffer());
    getDocumentImpl = () => ({
      promise: new Promise(() => {
        // Never resolves — simulates a pathological/adversarial PDF.
      }),
      destroy: async () => {},
    });

    const result = await extractPdfCandidates(supabaseMock(), "store-a/x.pdf", { timeoutMs: 10 });

    expect(result).toEqual({ ok: false, kind: "timeout" });
  });

  it("extracts a text-less (scanned) PDF as zero candidates, not an error", async () => {
    downloadOk(pdfBuffer());
    mockDocument([[]]);

    const result = await extractPdfCandidates(supabaseMock(), "store-a/x.pdf");

    expect(result).toEqual({ ok: true, candidates: [] });
  });

  it("extracts name, bare-code SKU and description from a well-formed block", async () => {
    downloadOk(pdfBuffer());
    mockDocument([
      [
        line("87805", { x: 90, y: 520 }),
        line("PRIMER ROLL-ON", { x: 90, y: 505 }),
        line("HYALURONIC, 45 ml", { x: 90, y: 490 }),
      ],
    ]);

    const result = await extractPdfCandidates(supabaseMock(), "store-a/x.pdf");

    expect(result).toEqual({
      ok: true,
      candidates: [{ name: "HYALURONIC, 45 ml", sku: "87805", description: "PRIMER ROLL-ON" }],
    });
  });

  it("still recognizes a labeled SKU line (SKU:/Código:/Ref:)", async () => {
    downloadOk(pdfBuffer());
    mockDocument([
      [
        line("Sabonete Artesanal", { y: 520 }),
        line("SKU: SAB-001", { y: 505 }),
        line("Feito à mão", { y: 490 }),
      ],
    ]);

    const result = await extractPdfCandidates(supabaseMock(), "store-a/x.pdf");

    expect(result).toEqual({
      ok: true,
      candidates: [{ name: "Sabonete Artesanal", sku: "SAB-001", description: "Feito à mão" }],
    });
  });

  it("requires a SKU to emit a candidate — a headline block with no code is discarded", async () => {
    downloadOk(pdfBuffer());
    mockDocument([[line("GLOW IMPECÁVEL", { y: 520 }), line("TEXTURA IMPERCEPTÍVEL", { y: 505 })]]);

    const result = await extractPdfCandidates(supabaseMock(), "store-a/x.pdf");

    expect(result).toEqual({ ok: true, candidates: [] });
  });

  it("never carries a price field, even mixed into an otherwise valid block (FR-003)", async () => {
    downloadOk(pdfBuffer());
    mockDocument([
      [
        line("90953", { y: 520 }),
        line("Creme Hidratante", { y: 505 }),
        line("R$ 39,90", { y: 490 }),
        line("200ml", { y: 475 }),
      ],
    ]);

    const result = await extractPdfCandidates(supabaseMock(), "store-a/x.pdf");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.candidates).toEqual([
      { name: "Creme Hidratante", sku: "90953", description: "200ml" },
    ]);
    expect(JSON.stringify(result.candidates)).not.toMatch(/r\$|39,90/i);
  });

  it("prefers a line with a quantity unit as the name over the first line", async () => {
    downloadOk(pdfBuffer());
    mockDocument([
      [
        line("59051", { y: 520 }),
        line("SCANDAL FULL", { y: 505 }),
        line("MASCARA, 10 g", { y: 490 }),
      ],
    ]);

    const result = await extractPdfCandidates(supabaseMock(), "store-a/x.pdf");

    expect(result).toEqual({
      ok: true,
      candidates: [{ name: "MASCARA, 10 g", sku: "59051", description: "SCANDAL FULL" }],
    });
  });

  it("drops a decorative letter-spaced headline out of the block instead of using it as the name", async () => {
    downloadOk(pdfBuffer());
    mockDocument([
      [
        line("90953", { y: 520 }),
        line("G L O W", { y: 505 }),
        line("Creme Hidratante, 200 ml", { y: 490 }),
      ],
    ]);

    const result = await extractPdfCandidates(supabaseMock(), "store-a/x.pdf");

    expect(result).toEqual({
      ok: true,
      candidates: [{ name: "Creme Hidratante, 200 ml", sku: "90953", description: "" }],
    });
  });

  it("splits into separate candidates when the vertical gap between lines is large", async () => {
    downloadOk(pdfBuffer());
    mockDocument([
      [
        line("11111", { y: 700, fontSize: 7 }),
        line("Produto A, 10 g", { y: 685, fontSize: 7 }),
        line("22222", { y: 300, fontSize: 7 }),
        line("Produto B, 20 g", { y: 285, fontSize: 7 }),
      ],
    ]);

    const result = await extractPdfCandidates(supabaseMock(), "store-a/x.pdf");

    expect(result).toEqual({
      ok: true,
      candidates: [
        { name: "Produto A, 10 g", sku: "11111", description: "" },
        { name: "Produto B, 20 g", sku: "22222", description: "" },
      ],
    });
  });

  it("strips a color/shade variant column (≥3 stacked codes at the same x) into zero candidates", async () => {
    downloadOk(pdfBuffer());
    const variantLines: MockTextItem[] = [];

    for (let i = 0; i < 5; i += 1) {
      variantLines.push(line(`9066${i}`, { x: 44, y: 600 - i * 30, fontSize: 7 }));
      variantLines.push(line(`${300 - i * 10}N`, { x: 51, y: 593 - i * 30, fontSize: 6 }));
    }

    mockDocument([variantLines]);

    const result = await extractPdfCandidates(supabaseMock(), "store-a/x.pdf");

    expect(result).toEqual({ ok: true, candidates: [] });
  });

  it("does not strip a run shorter than the variant-list threshold", async () => {
    downloadOk(pdfBuffer());
    mockDocument([
      [
        line("90664", { x: 44, y: 600, fontSize: 7 }),
        line("290N", { x: 44, y: 585, fontSize: 6 }),
        line("90673", { x: 44, y: 300, fontSize: 7 }),
        line("245Q", { x: 44, y: 285, fontSize: 6 }),
      ],
    ]);

    const result = await extractPdfCandidates(supabaseMock(), "store-a/x.pdf");

    expect(result).toEqual({
      ok: true,
      candidates: [
        { name: "290N", sku: "90664", description: "" },
        { name: "245Q", sku: "90673", description: "" },
      ],
    });
  });

  it("removes the object from Storage after a successful extraction", async () => {
    downloadOk(pdfBuffer());
    mockDocument([[line("11111", { y: 520 }), line("Produto, 1 un", { y: 505 })]]);

    await extractPdfCandidates(supabaseMock(), "store-a/x.pdf");

    expect(removeMock).toHaveBeenCalledWith(["store-a/x.pdf"]);
  });

  it("removes the object from Storage even when extraction fails", async () => {
    downloadOk(pdfBuffer());
    getDocumentImpl = () => ({
      promise: Promise.reject(new Error("bad xref")),
      destroy: async () => {},
    });

    await extractPdfCandidates(supabaseMock(), "store-a/x.pdf");

    expect(removeMock).toHaveBeenCalledWith(["store-a/x.pdf"]);
  });
});
