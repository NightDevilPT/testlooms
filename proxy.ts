import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Inject x-request-start-time header for automatic performance tracking in ResponseService
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-start-time", Date.now().toString());

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: "/api/:path*",
};
