import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The parent directory holds an unrelated project with its own lockfile, so
   * pin the workspace root to this app rather than letting Turbopack infer it.
   */
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    /**
     * Product imagery ships as first-party SVG from `public/laptop-images`.
     * The optimizer rejects SVG unless this is enabled, so it is paired with a
     * sandboxing CSP — the served files can neither run script nor embed
     * anything external.
     */
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
