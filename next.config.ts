// Pinned to Next.js 16 — APIs, conventions and file structure differ from
// older releases. Check node_modules/next/dist/docs before changing routing,
// caching or middleware behaviour.
import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  async headers() {
    return [
      {
        // Cache public pages for 1 hour
        source: "/(demo|validation|security|robots.txt|sitemap.xml)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=59",
          },
        ],
      },
      {
        // Cache the root landing page
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=59",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
