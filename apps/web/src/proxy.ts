import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === "production";
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("host");
  const hostname = host?.replace(/:\d+$/, "").toLowerCase();
  const isLoopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

  if (isProduction && forwardedProto && forwardedProto !== "https" && host && !isLoopback) {
    return NextResponse.redirect(
      `https://${host}${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
