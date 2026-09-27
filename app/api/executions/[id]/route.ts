import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
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
 * GET /api/executions/:id
 * Get detailed execution record with step execution results
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

        const execution = await prisma.testExecution.findFirst({
          where: {
            id: executionId,
            deletedAt: null,
            project: {
              deletedAt: null,
              OR: [
                { userId },
                {
                  organization: {
                    members: {
                      some: {
                        userId,
                        deletedAt: null,
                      },
                    },
                  },
                },
              ],
            },
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
                baseUrl: true,
              },
            },
            scenario: {
              select: {
                id: true,
                title: true,
                relativeRoute: true,
              },
            },
            workflow: {
              select: {
                id: true,
                title: true,
              },
            },
            stepResults: {
              where: { deletedAt: null },
              orderBy: { stepOrder: "asc" },
              include: {
                step: true,
              },
            },
          },
        });

        if (!execution) {
          return ResponseService.notFound("Execution record not found", request);
        }

        return ResponseService.ok(execution, HttpStatus.OK, request);
      },
      { permissionKey: RbacPermission.EXECUTION_VIEW }
    )
  ),
  { maxRequests: 120, windowSeconds: 60, keyPrefix: "rl:executions:get-detail" }
);
