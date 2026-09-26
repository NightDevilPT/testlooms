import { NextRequest } from "next/server";
import { ProjectsService } from "@/lib/projects-service/projects.service";
import { createEnvProfileSchema } from "@/lib/projects-service/validation";
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
 * GET /api/projects/:id/env-profiles
 * List environment profiles for a project
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

        const profiles = await ProjectsService.getEnvProfiles(projectId, userId);
        return ResponseService.ok(profiles, HttpStatus.OK, request);
      },
      { permissionKey: RbacPermission.EXECUTION_VIEW }
    )
  ),
  { maxRequests: 60, windowSeconds: 60, keyPrefix: "rl:env-profiles:get" }
);

/**
 * POST /api/projects/:id/env-profiles
 * Create environment profile with idempotency & RBAC
 */
export const POST = rateLimitMiddleware(
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
            return ResponseService.badRequest("Invalid JSON payload", request);
          }

          const validation = createEnvProfileSchema.safeParse(body);
          if (!validation.success) {
            return ResponseService.badRequest(
              validation.error.issues[0]?.message || "Invalid environment profile payload",
              request
            );
          }

          const newProfile = await ProjectsService.createEnvProfile(
            projectId,
            userId,
            validation.data
          );

          if (!newProfile) {
            return ResponseService.notFound("Project not found or accessible", request);
          }

          return ResponseService.created(newProfile, request);
        },
        { permissionKey: RbacPermission.PROJECT_CONFIG }
      )
    ),
    { getUserId: (req) => req.headers.get("x-user-id") || undefined }
  ),
  { maxRequests: 30, windowSeconds: 60, keyPrefix: "rl:env-profiles:create" }
);
