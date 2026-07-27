import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — a lockfile higher up the tree would otherwise be
  // inferred as the root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
