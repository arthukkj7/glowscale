import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: false,
  experimental: {
    typedEnv: false,
  },
};

export default nextConfig;
