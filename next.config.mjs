/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const isDev = process.env.NODE_ENV === "development";

const nextConfig = {
  output: isDev ? undefined : "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    unoptimized: true
  }
};

export default nextConfig;
