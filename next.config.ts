import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  experimental: {
    // Next's own proxy layer silently truncates a request body at its
    // default cap before a route handler ever runs. Raised past ADR-0003's
    // 10 MB original-file limit so `/admin/assets` keeps the full upload and
    // returns its own clear 413, instead of a corrupted-multipart 400.
    proxyClientMaxBodySize: "11mb",
  },
};

export default nextConfig;
