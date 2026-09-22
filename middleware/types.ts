import { NextResponse, NextRequest } from "next/server";

/**
 * Standard Next.js App Router Route Handler Context supporting dynamic route parameters
 */
export type RouteHandlerContext<T = Record<string, string>> = {
  params?: Promise<T> | T;
};

/**
 * Standard Next.js App Router Route Handler signature
 * e.g., export const GET = middleware(async (request, context) => { ... });
 */
export type RouteHandler<T = Record<string, string>> = (
  request: NextRequest | Request,
  context?: RouteHandlerContext<T>
) => Promise<NextResponse> | NextResponse;

/**
 * Standard Middleware Wrapper function signature
 */
export type MiddlewareWrapper<T = Record<string, string>> = (
  handler: RouteHandler<T>
) => RouteHandler<T>;
