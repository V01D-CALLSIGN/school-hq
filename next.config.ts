import type { NextConfig } from "next";

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
  output: isCapacitorBuild ? "export" : undefined,
  trailingSlash: isCapacitorBuild,
  images: {
    unoptimized: isCapacitorBuild,
  },
  ...(isCapacitorBuild
    ? {}
    : {
        async rewrites() {
          const backend =
            process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:3001";
          return [
            { source: "/api/:path*", destination: `${backend}/api/:path*` },
          ];
        },
      }),
};

export default nextConfig;
