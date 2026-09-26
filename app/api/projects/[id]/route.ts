import { NextRequest } from "next/server";
import { ProjectsService } from "@/lib/projects-service/projects.service";
import { updateProjectSchema, calculateTimeoutMs } from "@/lib/projects-service/validation";
import ResponseService from "@/lib/response-service/response.service";
import { HttpStatus } from "@/lib/response-service/types";
import { RbacPermission } from "@/lib/rbac-service/types";
import authMiddleware from "@/middleware/auth/auth.middleware";
import rateLimitMiddleware from "@/middleware/rate-limit/rate-limit.middleware";
import idempotencyMiddleware from "@/middleware/idempotency/idempotency.middleware";
import rbacMiddleware from "@/middleware/rbac/rbac.middleware";
import { RouteHandlerContext } from "@/middleware/types";

interface Params {
  id: string;
}

/**
 * GET /api/projects/:id
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

        const project = await ProjectsService.getProjectById(projectId, userId);
        if (!project) {
          return ResponseService.notFound("Project not found or accessible", request);
        }

        return ResponseService.ok(project, HttpStatus.OK, request);
      },
      { permissionKey: RbacPermission.EXECUTION_VIEW }
    )
  ),
  { maxRequests: 60, windowSeconds: 60, keyPrefix: "rl:project:get" }
);

/**
 * PATCH /api/projects/:id
 * Update project details with idempotency & RBAC
 */
export const PATCH = rateLimitMiddleware(
  idempotencyMiddleware(
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

          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return ResponseService.badRequest("Invalid JSON body", request);
          }

          const validation = updateProjectSchema.safeParse(body);
          if (!validation.success) {
            return ResponseService.badRequest(
              validation.error.issues[0]?.message || "Invalid update payload",
              request
            );
          }

          let timeoutMs = validation.data.timeoutMs;
          if (validation.data.timeoutValue && validation.data.timeoutUnit) {
            timeoutMs = calculateTimeoutMs(
              validation.data.timeoutValue,
              validation.data.timeoutUnit
            );
          }

          const { timeoutValue, timeoutUnit, ...data } = validation.data;

          const updated = await ProjectsService.updateProject(projectId, userId, {
            ...data,
            timeoutMs,
          });

          if (!updated) {
            return ResponseService.notFound("Project not found or not permitted to update", request);
          }

          return ResponseService.ok(updated, HttpStatus.OK, request);
        },
        { permissionKey: RbacPermission.PROJECT_CONFIG }
      )
    ),
    { getUserId: (req) => req.headers.get("x-user-id") || undefined }
  ),
  { maxRequests: 30, windowSeconds: 60, keyPrefix: "rl:project:update" }
);

/**
 * DELETE /api/projects/:id
 * Soft-delete project with RBAC
 */
export const DELETE = rateLimitMiddleware(
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

        const success = await ProjectsService.deleteProject(projectId, userId);
        if (!success) {
          return ResponseService.notFound("Project not found or not permitted to delete", request);
        }

        return ResponseService.ok({ deleted: true, projectId }, HttpStatus.OK, request);
      },
      { permissionKey: RbacPermission.PROJECT_DELETE }
    )
  ),
  { maxRequests: 20, windowSeconds: 60, keyPrefix: "rl:project:delete" }
);
