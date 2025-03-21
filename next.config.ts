import type { NextConfig } from "next";

const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
  experimental: {
    appDir: true,
  },
};

export default nextConfig;
