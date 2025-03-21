import { NextConfig } from "next";

const nextConfig = {
  /* config options here */
  reactStrictMode: false,
  swcMinify: true,
  experimental: {
    appDir: true,
  },
};

export default nextConfig;
