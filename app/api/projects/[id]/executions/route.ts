import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
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
 * GET /api/projects/:id/executions
 * Lists all test executions for a project
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
        const projectId = params?.id;
        if (!projectId) {
          return ResponseService.badRequest("Missing project ID", request);
        }

        const executions = await prisma.testExecution.findMany({
          where: { projectId, deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            scenario: { select: { title: true } },
            workflow: { select: { title: true } },
          },
        });

        return ResponseService.ok(executions, HttpStatus.OK, request);
      },
      { permissionKey: RbacPermission.EXECUTION_VIEW }
    )
  ),
  { maxRequests: 120, windowSeconds: 60, keyPrefix: "rl:executions:list" }
);

/**
 * POST /api/projects/:id/executions
 * Executes all scenarios for a project sequentially in order
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
        if (!projectId) {
          return ResponseService.badRequest("Missing project ID", request);
        }

        try {
          const result = await ScenariosService.executeAllScenarios(projectId, userId);
          return ResponseService.ok(result, HttpStatus.OK, request);
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : "Failed to execute scenarios";
          return ResponseService.badRequest(errorMessage, request);
        }
      },
      { permissionKey: RbacPermission.EXECUTION_TRIGGER }
    )
  ),
  { maxRequests: 30, windowSeconds: 60, keyPrefix: "rl:executions:run_all" }
);
