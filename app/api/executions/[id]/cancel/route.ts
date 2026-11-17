import { NextRequest } from "next/server";
import { ScenariosService } from "@/lib/scenarios-service/scenarios.service";
import ResponseService from "@/lib/response-service/response.service";
import { HttpStatus } from "@/lib/response-service/types";
import { RbacPermission } from "@/lib/rbac-service/types";
import authMiddleware from "@/middleware/auth/auth.middleware";
import rateLimitMiddleware from "@/middleware/rate-limit/rate-limit.middleware";
import rbacMiddleware from "@/middleware/rbac/rbac.middleware";
import { RouteHandlerContext } from "@/middleware/types";

interface Params {
  id: string;
}

/**
 * POST /api/executions/:id/cancel
 * Stops a running execution before its next step. Cancelling a finished run is a no-op.
 */
export const POST = rateLimitMiddleware(
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

        const found = await ScenariosService.cancelRun(executionId, userId);
        if (!found) {
          return ResponseService.notFound("Execution record not found", request);
        }

        return ResponseService.ok({ executionId, cancelRequested: true }, HttpStatus.OK, request);
      },
      { permissionKey: RbacPermission.EXECUTION_TRIGGER }
    )
  ),
  { maxRequests: 60, windowSeconds: 60, keyPrefix: "rl:executions:cancel" }
);
