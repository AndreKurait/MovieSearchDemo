import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
    ],
    // Don't optimize in production K8s - serve directly
    unoptimized: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
