import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // self-contained server bundle, built in CI and shipped to the VPS
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: { unoptimized: true }, // images are already resized WebP from our CDN
};

export default nextConfig;
