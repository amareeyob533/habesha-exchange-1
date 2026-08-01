import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the Z.ai preview panel (and local network) to access the dev server.
  allowedDevOrigins: [
    "*.space-z.ai",
    "*.vercel.app",
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
  ],
  // Allow large body uploads (broadcast media up to 25 MB).
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
};

export default nextConfig;
