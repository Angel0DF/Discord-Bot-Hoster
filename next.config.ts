import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Prevents double mounting in dev for process streams
  typescript: {
    ignoreBuildErrors: false,
  },
  serverExternalPackages: ["pidusage"],
  allowedDevOrigins: [
    "26.75.73.233",
    "localhost",
    "127.0.0.1",
    "192.168.1.*",
    "dbhoster.duckdns.org",
    "*.duckdns.org",
  ],
};

export default nextConfig;

