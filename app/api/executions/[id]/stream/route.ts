import { NextRequest, NextResponse } from "next/server";
import { ScenariosService } from "@/lib/scenarios-service/scenarios.service";
import ResponseService from "@/lib/response-service/response.service";
import { RbacPermission } from "@/lib/rbac-service/types";
import authMiddleware from "@/middleware/auth/auth.middleware";
import rateLimitMiddleware from "@/middleware/rate-limit/rate-limit.middleware";
import rbacMiddleware from "@/middleware/rbac/rbac.middleware";
import { RouteHandlerContext } from "@/middleware/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface Params {
  id: string;
}

/**
 * GET /api/executions/:id/stream
 * Server-Sent Events for a run: `snapshot` first, then `step`, `frame` and `complete`.
 * A finished run gets `snapshot` followed immediately by `complete`.
 */
export const GET = rateLimitMiddleware(
  authMiddleware(
    rbacMiddleware(
      async (request: NextRequest | Request, context?: RouteHandlerContext<Params>) => {
        const userId = request.headers.get("x-user-id");
        if (!userId) {
          return ResponseService.unauthorized("Authentication required", request);
        }

        const params = await context?.params;
        const executionId = params?.id;
        if (!executionId) {
          return ResponseService.badRequest("Missing execution ID", request);
        }

        const stream = await ScenariosService.createRunEventStream(executionId, userId, request.signal);
        if (!stream) {
          return ResponseService.notFound("Execution record not found", request);
        }

        return new NextResponse(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform, no-store, must-revalidate",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },
      { permissionKey: RbacPermission.EXECUTION_VIEW }
    )
  ),
  { maxRequests: 60, windowSeconds: 60, keyPrefix: "rl:executions:stream" }
);
