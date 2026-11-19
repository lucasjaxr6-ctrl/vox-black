import path from "node:path";
const base = process.env.NEXT_PUBLIC_BASE ?? "";
/** @type {import('next').NextConfig} */
export default {
  output: "export",
  basePath: base,
  trailingSlash: true,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  webpack(config) {
    config.resolve.alias["next/link$"] = path.resolve("shims/next-link.tsx");
    config.resolve.alias["next/navigation$"] = path.resolve("shims/next-navigation.ts");
    return config;
  },
};
