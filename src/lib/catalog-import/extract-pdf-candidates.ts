// The main `pdfjs-dist` build assumes browser globals (e.g. `DOMMatrix`) that
// don't exist in a plain Node.js server runtime — pdfjs-dist's own console
// warning ("Please use the `legacy` build in Node.js environments") and its
// internal `isNodeJS` Node-worker fallback both point at this entry instead.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

const BUCKET = "catalog-import-uploads";
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_PAGES = 300;
const DEFAULT_TIMEOUT_MS = 120_000;
const PDF_MAGIC_BYTES = Buffer.from("%PDF-", "ascii");

export type CatalogImportCandidate = {
  name: string;
  sku: string | null;
  description: string;
};

export type ExtractPdfCandidatesResult =
  | { ok: true; candidates: CatalogImportCandidate[] }
  | {
      ok: false;
      kind:
        | "not_found"
        | "too_large"
        | "unsupported_format"
        | "corrupted"
        | "too_many_pages"
        | "timeout"
        | "service_error";
    };

// A candidate comes from one spatial block of lines on one page (ADR-0008/
// spec.md leave the exact PDF layout undefined and require manual review
// either way — this is an implementer-chosen heuristic, tuned against a real
// catalog, ver `docs/patterns` n/a; the fixture used for `quickstart.md`
// validation should follow the same conventions documented below):
//
// - A bare 4-6 digit line (no label) is a product code — used as SKU when
//   the block isn't a color/shade variant list (see below).
// - A line starting with one of these labels is also a SKU.
// - A line that looks like a price (FR-003: always discarded, never shown,
//   edited or saved) is dropped entirely.
// - A "variant list" is a run of ≥3 bare-code lines stacked at nearly the
//   same x position (a narrow side column of color/shade codes, each paired
//   with a short shade-name line right after it) — real catalogs list dozens
//   of SKUs this way for one product photo. Each pair alone has no product
//   name/description nearby, so every line in the run is dropped rather than
//   turned into a garbage candidate (e.g. name "88947" or a description that
//   is just a run of codes). This is a real, observed limitation: those
//   variants are not imported as candidates at all in the MVP.
// - Blocks are separated by a vertical gap relative to the previous line's
//   font size, not by blank lines: real catalogs interleave floating text
//   (side columns, marketing headlines) in stream order, so text order alone
//   does not reliably track visual/blank-line structure.
// - A line that reads as decorative headline typography (single letters
//   separated by spaces, e.g. "G LOW", "T E XT U R A" — a common effect of
//   letter-spaced marketing display type) is discarded from a block; a block
//   left with no usable name after that is skipped entirely (catches cover
//   pages and campaign slogans, which never have a product code attached).
// - Within a block, prefer a line that looks like "name, quantity unit" (the
//   product's actual name+size line) as the name; otherwise fall back to the
//   first non-code, non-price line.
const SKU_LINE_PATTERN = /^\s*(?:sku|c[oó]digo|ref(?:erência)?)\s*[:\-]\s*(.+)$/i;
const BARE_CODE_PATTERN = /^\d{4,6}$/;
const PRICE_LINE_PATTERN = /r\$\s*[\d.,]+|^\s*pre[çc]o\b/i;
const NAME_WITH_UNIT_PATTERN = /,\s*\d+([.,]\d+)?\s*(ml|g|kg|un|l)\b/i;
// Display/headline type is frequently letter-spaced (e.g. "G LOW",
// "T E XT U R A") — PDF text extraction sometimes fuses two adjacent glyphs
// into one run (e.g. "XT"), so a strict single-char-then-space regex misses
// real cases. A real product name always has at least one substantial word;
// requiring every space-separated token to be very short (<=2 chars) avoids
// false positives on ordinary short names/units (e.g. "Produto A, 10 g" has
// "Produto", so it's never flagged).
const DECORATIVE_MAX_TOKEN_LENGTH = 2;
// Empirically ~1-2pt jitter within the same column in the real catalog used
// to design this; 4pt keeps distinct columns from merging.
const VARIANT_COLUMN_TOLERANCE = 4;
const MIN_VARIANT_RUN_LENGTH = 3;
// Multiple of the previous line's font size beyond which a vertical gap
// starts a new block, rather than continuing the current one.
const BLOCK_GAP_FONT_SIZE_MULTIPLE = 2.5;

type PositionedLine = { text: string; x: number; y: number; fontSize: number };

function isTextItem(item: unknown): item is TextItem {
  return typeof item === "object" && item !== null && "str" in item;
}

function buildLines(items: unknown[]): PositionedLine[] {
  const lines: PositionedLine[] = [];
  let text = "";
  let x = 0;
  let y = 0;
  let fontSize = 0;
  let started = false;

  for (const item of items) {
    if (!isTextItem(item)) {
      continue;
    }

    if (!started) {
      x = item.transform[4];
      y = item.transform[5];
      fontSize = Math.hypot(item.transform[0], item.transform[1]) || 1;
      started = true;
    }

    text += item.str;

    if (item.hasEOL) {
      if (text.trim().length > 0) {
        lines.push({ text: text.trim(), x, y, fontSize });
      }

      text = "";
      started = false;
    }
  }

  if (text.trim().length > 0) {
    lines.push({ text: text.trim(), x, y, fontSize });
  }

  return lines;
}

function stripVariantRuns(lines: PositionedLine[]): PositionedLine[] {
  const columnOf = (line: PositionedLine) => Math.round(line.x / VARIANT_COLUMN_TOLERANCE);
  const codeIndexesByColumn = new Map<number, number[]>();

  lines.forEach((line, index) => {
    if (!BARE_CODE_PATTERN.test(line.text)) {
      return;
    }

    const column = columnOf(line);
    const indexes = codeIndexesByColumn.get(column) ?? [];
    indexes.push(index);
    codeIndexesByColumn.set(column, indexes);
  });

  const excluded = new Set<number>();

  for (const indexes of codeIndexesByColumn.values()) {
    if (indexes.length < MIN_VARIANT_RUN_LENGTH) {
      continue;
    }

    for (const index of indexes) {
      excluded.add(index);

      const next = lines[index + 1];

      if (next && !next.text.includes(" ") && next.text.length <= 12) {
        excluded.add(index + 1);
      }
    }
  }

  return lines.filter((_, index) => !excluded.has(index));
}

function groupIntoBlocks(lines: PositionedLine[]): PositionedLine[][] {
  const blocks: PositionedLine[][] = [];
  let current: PositionedLine[] = [];
  let previous: PositionedLine | null = null;

  for (const line of lines) {
    const gap = previous ? Math.abs(previous.y - line.y) : 0;
    const isNewBlock = previous !== null && gap > previous.fontSize * BLOCK_GAP_FONT_SIZE_MULTIPLE;

    if (isNewBlock && current.length > 0) {
      blocks.push(current);
      current = [];
    }

    current.push(line);
    previous = line;
  }

  if (current.length > 0) {
    blocks.push(current);
  }

  return blocks;
}

function isDecorativeHeadline(text: string): boolean {
  const tokens = text.split(/\s+/).filter(Boolean);

  if (tokens.length < 3) {
    return false;
  }

  return tokens.every((token) => token.length <= DECORATIVE_MAX_TOKEN_LENGTH);
}

function candidateFromBlock(block: PositionedLine[]): CatalogImportCandidate | null {
  let sku: string | null = null;
  const nameLines: string[] = [];
  const descriptionLines: string[] = [];

  for (const line of block) {
    const text = line.text;

    if (PRICE_LINE_PATTERN.test(text)) {
      continue;
    }

    if (isDecorativeHeadline(text)) {
      continue;
    }

    const labeledSkuMatch = SKU_LINE_PATTERN.exec(text);

    if (labeledSkuMatch) {
      sku = labeledSkuMatch[1].trim();
      continue;
    }

    if (BARE_CODE_PATTERN.test(text)) {
      sku = text;
      continue;
    }

    nameLines.push(text);
  }

  // Requiring a code excludes marketing/cover-page/cross-reference text
  // entirely: in the real catalog this heuristic was tuned against, every
  // sellable item has a bare code somewhere in its block, and headline-only
  // blocks never do. This also means a color/shade product whose only code
  // lives in its (already-stripped) variant column produces zero candidates
  // — a known MVP limitation (see the module comment), not a bug.
  if (nameLines.length === 0 || sku === null) {
    return null;
  }

  const preferredNameIndex = nameLines.findIndex((line) => NAME_WITH_UNIT_PATTERN.test(line));
  const nameIndex = preferredNameIndex === -1 ? 0 : preferredNameIndex;
  const name = nameLines[nameIndex];

  nameLines.forEach((line, index) => {
    if (index !== nameIndex) {
      descriptionLines.push(line);
    }
  });

  return { name, sku, description: descriptionLines.join(" ") };
}

function parseCandidates(items: unknown[]): CatalogImportCandidate[] {
  const lines = stripVariantRuns(buildLines(items));

  return groupIntoBlocks(lines)
    .map(candidateFromBlock)
    .filter((candidate): candidate is CatalogImportCandidate => candidate !== null);
}

async function extractFromBuffer(buffer: Buffer): Promise<ExtractPdfCandidatesResult> {
  // Text-only extraction (`getTextContent`, never `.render()`), no scripting
  // manager ever instantiated, `data` supplied in-memory (never a `url`) —
  // ADR-0008 rule 2 (no embedded JS execution, no external resource fetch)
  // is satisfied by this code path itself, not just by the options below.
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    disableAutoFetch: true,
    disableStream: true,
    useSystemFonts: false,
  });

  try {
    const document = await loadingTask.promise;

    if (document.numPages > MAX_PAGES) {
      return { ok: false, kind: "too_many_pages" };
    }

    const candidates: CatalogImportCandidate[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      // Blocks never span pages: each page starts a fresh line stream, so a
      // variant-column run or a block-gap can't accidentally straddle two
      // unrelated pages.
      candidates.push(...parseCandidates(content.items));
      page.cleanup();
    }

    return { ok: true, candidates };
  } catch (error) {
    // Server-only diagnostic: the client only ever sees the generic
    // "corrupted" message (never raw parser internals), but a bare, silent
    // catch left no trail at all to tell a genuine parse failure apart from
    // a resource limit or a pdfjs-dist bug against a real-world file.
    console.error("[catalog-import] pdfjs-dist failed to load the document", error);
    return { ok: false, kind: "corrupted" };
  } finally {
    await loadingTask.destroy();
  }
}

// Cooperative timeout: bounds what the caller waits for, but does not force
// `extractFromBuffer` to stop running in the background (pdfjs-dist's
// loading task has no cross-cutting abort signal for a parse already in
// flight) — acceptable because the platform's own function timeout is the
// real hard bound (plan.md: 120 s sits inside the 300 s Hobby limit).
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, onTimeout: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(onTimeout), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export async function extractPdfCandidates(
  supabase: SupabaseClient<Database>,
  storagePath: string,
  options?: { timeoutMs?: number },
): Promise<ExtractPdfCandidatesResult> {
  // `supabase` is the caller's own authenticated client (not `service_role`),
  // so Storage RLS — the same policy for every operation — is what actually
  // enforces `storagePath` belongs to this admin's own store, mirroring
  // `POST /admin/assets` (ADR-0009).
  const download = await supabase.storage.from(BUCKET).download(storagePath);

  if (download.error || !download.data) {
    return { ok: false, kind: "not_found" };
  }

  try {
    const buffer = Buffer.from(await download.data.arrayBuffer());

    // Defense in depth: the bucket's own `file_size_limit` already rejects
    // an oversized upload, but this stays here in case that ever changes.
    if (buffer.byteLength > MAX_BYTES) {
      return { ok: false, kind: "too_large" };
    }

    if (!buffer.subarray(0, PDF_MAGIC_BYTES.byteLength).equals(PDF_MAGIC_BYTES)) {
      return { ok: false, kind: "unsupported_format" };
    }

    return await withTimeout(extractFromBuffer(buffer), options?.timeoutMs ?? DEFAULT_TIMEOUT_MS, {
      ok: false,
      kind: "timeout",
    });
  } catch {
    return { ok: false, kind: "service_error" };
  } finally {
    // ADR-0008 rule 5: removed after processing, success or failure.
    await supabase.storage.from(BUCKET).remove([storagePath]);
  }
}
