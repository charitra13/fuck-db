import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: false,
  },
  async rewrites() {
    // Proxy API calls to backend to keep same-origin for cookies (SameSite=Lax)
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*",
      },
    ];
  },
  // transpile workspace packages if needed
  transpilePackages: ["@fuckdb/ui", "@fuckdb/types", "@fuckdb/diagram"],
};

export default nextConfig;
