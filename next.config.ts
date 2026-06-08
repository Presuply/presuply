import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  serverExternalPackages: ['@react-pdf/renderer'],
};

export default nextConfig;
