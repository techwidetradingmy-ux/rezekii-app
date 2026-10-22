import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Visitors who picked 中文 get the Chinese copies of the static homepage and sign-in page at the same address; both
  // versions stay static on the CDN (the cookie is set by the EN | 中文 switch).
  async rewrites() {
    const zh = [{ type: "cookie" as const, key: "rz_lang", value: "zh" }];
    return {
      beforeFiles: [
        { source: "/", has: zh, destination: "/zh" },
        { source: "/signin", has: zh, destination: "/zh/signin" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
};

export default nextConfig;
