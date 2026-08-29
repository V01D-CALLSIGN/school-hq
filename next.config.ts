import type { NextConfig } from "next";

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
        async headers() {
          return [{ source: "/:path*", headers: securityHeaders }];
        },
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
