import { NextConfig } from "next";

const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: true,
  },
  pageExtensions: ["tsx", "ts", "jsx", "js"].filter((extension) => {
    return !extension.includes("page");
  }),
};

export default nextConfig;
