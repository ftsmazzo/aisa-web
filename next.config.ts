import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["hash-wasm", "postgres", "ioredis"],
};

export default nextConfig;
