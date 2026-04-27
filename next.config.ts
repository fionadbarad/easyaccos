// Pinned to Next.js 16 — APIs, conventions and file structure differ from
// older releases. Check node_modules/next/dist/docs before changing routing,
// caching or middleware behaviour.
import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
