import { NextResponse, NextRequest } from "next/server";
import { ResponseService } from "@/lib/response-service/response.service";
import { RouteHandler, RouteHandlerContext } from "../types";
import { RateLimitOptions, RateLimitStore } from "./types";

const rateLimitMap = new Map<string, RateLimitStore>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Evaluates sliding window rate limit for an incoming request.
 */
export function checkRateLimit(
  request: NextRequest | Request,
  options: RateLimitOptions = {}
): NextResponse | null {
  const maxRequests = options.maxRequests ?? 60;
  const windowSeconds = options.windowSeconds ?? 60;
  const prefix = options.keyPrefix ?? "rl";

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  const key = `${prefix}:${ip}`;
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowSeconds * 1000,
    });
    return null;
  }

  if (record.count >= maxRequests) {
    return ResponseService.tooManyRequests(
      `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowSeconds}s.`,
      request
    );
  }

  record.count += 1;
  return null;
}

/**
 * Rate Limit Middleware Wrapper for Next.js Route Handlers.
 * 
 * Example Usage:
 * export const GET = rateLimitMiddleware(async (req, ctx) => {
 *   return ResponseService.ok({ data: "Success" });
 * }, { maxRequests: 50 });
 */
export function rateLimitMiddleware<T = Record<string, string>>(
  handler: RouteHandler<T>,
  options?: RateLimitOptions
): RouteHandler<T> {
  return async (request: NextRequest | Request, context?: RouteHandlerContext<T>) => {
    const errorResponse = checkRateLimit(request, options);
    if (errorResponse) return errorResponse;
    return handler(request, context);
  };
}

export default rateLimitMiddleware;
