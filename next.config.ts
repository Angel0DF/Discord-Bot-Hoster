import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Prevents double mounting in dev for process streams
  typescript: {
    ignoreBuildErrors: false,
  },
  serverExternalPackages: ["pidusage"],
};

export default nextConfig;

