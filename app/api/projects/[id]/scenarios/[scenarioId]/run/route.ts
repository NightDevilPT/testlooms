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
  scenarioId: string;
}

/**
 * POST /api/projects/:id/scenarios/:scenarioId/run
 * Executes a single test scenario and records TestExecution in DB
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
        const projectId = params?.id;
        const scenarioId = params?.scenarioId;

        if (!projectId || !scenarioId) {
          return ResponseService.badRequest("Missing project or scenario ID", request);
        }

        try {
          const result = await ScenariosService.executeScenario(projectId, scenarioId, userId);
          return ResponseService.ok(result, HttpStatus.OK, request);
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : "Failed to run scenario";
          return ResponseService.badRequest(errorMessage, request);
        }
      },
      { permissionKey: RbacPermission.EXECUTION_TRIGGER }
    )
  ),
  { maxRequests: 60, windowSeconds: 60, keyPrefix: "rl:scenarios:run" }
);
