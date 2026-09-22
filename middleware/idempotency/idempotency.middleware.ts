import { NextRequest } from "next/server";
import { IdempotencyService } from "@/lib/idempotency-service/idempotency.service";
import { RouteHandler, RouteHandlerContext } from "../types";
import { IdempotencyOptions } from "./types";

/**
 * Idempotency Middleware Wrapper for Next.js Route Handlers.
 * 
 * Example Usage:
 * export const POST = idempotencyMiddleware(async (request, context) => {
 *   const params = await context?.params;
 *   return ResponseService.created({ success: true });
 * }, { getUserId: (req) => "user_123" });
 */
export function idempotencyMiddleware<T = Record<string, string>>(
  handler: RouteHandler<T>,
  options?: IdempotencyOptions<T>
): RouteHandler<T> {
  return async (request: NextRequest | Request, context?: RouteHandlerContext<T>) => {
    let userId: string | undefined = undefined;
    if (options?.getUserId) {
      userId = await options.getUserId(request, context);
    }

    const { idempotencyKey, cachedResponse } = await IdempotencyService.check(
      request,
      userId
    );

    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      const response = await handler(request, context);

      if (idempotencyKey && response.ok) {
        try {
          const responseClone = response.clone();
          const responseBody = await responseClone.json();
          await IdempotencyService.save(
            idempotencyKey,
            response.status,
            responseBody
          );
        } catch {
          await IdempotencyService.save(
            idempotencyKey,
            response.status,
            null
          );
        }
      }

      return response;
    } catch (error) {
      if (idempotencyKey) {
        await IdempotencyService.release(idempotencyKey);
      }
      throw error;
    }
  };
}

export default idempotencyMiddleware;
