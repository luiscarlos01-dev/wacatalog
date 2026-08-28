import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  // `pdfjs-dist` (ADR-0008) resolves its Node "fake worker" via a runtime
  // `import(GlobalWorkerOptions.workerSrc)` relative to its own file *on
  // disk*, never through webpack's module graph. Bundling it moves/renames
  // the module (`.next/dev/server/vendor-chunks/pdfjs-dist@…js` in dev,
  // traced output in production) without its `pdf.worker.mjs` sibling,
  // so that import fails at runtime either way ("Setting up fake worker
  // failed: Cannot find module … pdf.worker.mjs" — reproduced in `pnpm dev`
  // with a real ~81 MB catalog, 2026-08-28). `serverExternalPackages` makes
  // Next load it straight from `node_modules` via native `require`/`import`
  // instead, so the sibling file is always right next to it, unbundled.
  serverExternalPackages: ["pdfjs-dist"],
  // Belt-and-suspenders for the standalone/Vercel output specifically: even
  // with the package external, be explicit that the worker file must be
  // traced into the deployed function's bundle.
  outputFileTracingIncludes: {
    "/admin/catalog-imports": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
};

export default nextConfig;
