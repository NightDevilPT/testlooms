import { NextResponse, NextRequest } from "next/server";
import AuthService from "@/lib/auth-service/auth.service";
import ResponseService from "@/lib/response-service/response.service";
import { RouteHandler, RouteHandlerContext } from "../types";
import { AuthMiddlewareOptions } from "./types";

/**
 * Auth Middleware Wrapper for Next.js Route Handlers.
 * Verifies JWT access token from HTTP-only cookies & validates session status in DB.
 *
 * Example Usage:
 * export const GET = rateLimitMiddleware(
 *   authMiddleware(async (request, context) => {
 *     const userId = request.headers.get("x-user-id");
 *     return ResponseService.ok({ data: "Protected Data" });
 *   })
 * );
 */
export function authMiddleware<T = Record<string, string>>(
  handler: RouteHandler<T>,
  options?: AuthMiddlewareOptions
): RouteHandler<T> {
  return async (request: NextRequest | Request, context?: RouteHandlerContext<T>) => {
    try {
      const accessToken = await AuthService.getAuthCookie();
      const { payload, errorResponse } = await AuthService.verifySession(
        accessToken,
        request
      );

      if (errorResponse) {
        if (options?.optional) {
          return handler(request, context);
        }
        return errorResponse;
      }

      // Attach resolved user identity to headers for downstream handlers
      const reqHeaders = new Headers(request.headers);
      if (payload) {
        reqHeaders.set("x-user-id", payload.userId);
        reqHeaders.set("x-user-email", payload.email);
      }

      const modifiedRequest = new NextRequest(request.url, {
        headers: reqHeaders,
        method: request.method,
        body: request.body,
      });

      return handler(modifiedRequest, context);
    } catch (error: unknown) {
      if (options?.optional) {
        return handler(request, context);
      }
      return ResponseService.handleError(error, request);
    }
  };
}

export default authMiddleware;
