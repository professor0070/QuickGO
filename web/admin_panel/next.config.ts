import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const adminPanelDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(adminPanelDir, "../.."),
  reactStrictMode: true
};

export default nextConfig;
