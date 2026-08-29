import { NextRequest, NextResponse } from "next/server";

const DEFAULT_ALLOWED_ORIGINS = [
  "capacitor://localhost",
  "http://localhost",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

export function corsAllowedOrigins() {
  const configured = process.env.CORS_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return configured?.length ? configured : DEFAULT_ALLOWED_ORIGINS;
}

export function isCorsOriginAllowed(origin: string | null) {
  if (!origin) return true;
  return corsAllowedOrigins().includes(origin.replace(/\/$/, ""));
}

function applyCorsHeaders(response: NextResponse, origin: string | null) {
  if (!origin || !isCorsOriginAllowed(origin)) return response;
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Authorization,Content-Type");
  response.headers.set("Access-Control-Max-Age", "86400");
  response.headers.append("Vary", "Origin");
  return response;
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!isCorsOriginAllowed(origin)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "ORIGIN_NOT_ALLOWED",
          message: "This client origin is not allowed to access School HQ.",
        },
      },
      { status: 403 },
    );
  }

  if (request.method === "OPTIONS")
    return applyCorsHeaders(new NextResponse(null, { status: 204 }), origin);

  return applyCorsHeaders(NextResponse.next(), origin);
}

export const config = {
  matcher: "/api/:path*",
};
