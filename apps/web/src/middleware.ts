import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === "production";
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("host");

  if (
    isProduction &&
    forwardedProto &&
    forwardedProto !== "https" &&
    host &&
    !host.includes("localhost")
  ) {
    return NextResponse.redirect(`https://${host}${request.nextUrl.pathname}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"]
};
