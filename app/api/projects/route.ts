import { NextRequest } from "next/server";
import { ProjectsService } from "@/lib/projects-service/projects.service";
import { createProjectSchema, calculateTimeoutMs } from "@/lib/projects-service/validation";
import ResponseService from "@/lib/response-service/response.service";
import { HttpStatus } from "@/lib/response-service/types";
import { RbacPermission } from "@/lib/rbac-service/types";
import authMiddleware from "@/middleware/auth/auth.middleware";
import rateLimitMiddleware from "@/middleware/rate-limit/rate-limit.middleware";
import idempotencyMiddleware from "@/middleware/idempotency/idempotency.middleware";
import rbacMiddleware from "@/middleware/rbac/rbac.middleware";

type OwnershipFilterType = "ALL" | "PERSONAL" | "COMPANY";

/**
 * GET /api/projects
 * List paginated projects for current user
 */
export const GET = rateLimitMiddleware(
  authMiddleware(
    rbacMiddleware(
      async (request: NextRequest | Request) => {
        const userId = request.headers.get("x-user-id");
        if (!userId) {
          return ResponseService.unauthorized("Authentication required", request);
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || undefined;
        const rawOwnership = searchParams.get("ownership");
        const ownership: OwnershipFilterType =
          rawOwnership === "PERSONAL" || rawOwnership === "COMPANY" ? rawOwnership : "ALL";
        const page = parseInt(searchParams.get("page") || "1", 10);
        const pageSize = parseInt(searchParams.get("pageSize") || "12", 10);

        const result = await ProjectsService.getProjects(userId, {
          search,
          ownership,
          page,
          pageSize,
        });

        return ResponseService.paginated(
          result.projects,
          {
            page,
            pageSize,
            totalItems: result.totalItems,
            totalPages: result.totalPages,
            hasNext: page < result.totalPages,
            hasPrevious: page > 1,
          },
          HttpStatus.OK,
          request
        );
      },
      { permissionKey: RbacPermission.EXECUTION_VIEW }
    )
  ),
  { maxRequests: 60, windowSeconds: 60, keyPrefix: "rl:projects:get" }
);

/**
 * POST /api/projects
 * Create project with idempotency & RBAC support
 */
export const POST = rateLimitMiddleware(
  idempotencyMiddleware(
    authMiddleware(
      rbacMiddleware(
        async (request: NextRequest | Request) => {
          const userId = request.headers.get("x-user-id");
          if (!userId) {
            return ResponseService.unauthorized("Authentication required", request);
          }

          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return ResponseService.badRequest("Invalid JSON body", request);
          }

          const validation = createProjectSchema.safeParse(body);
          if (!validation.success) {
            return ResponseService.badRequest(
              validation.error.issues[0]?.message || "Invalid project creation data",
              request
            );
          }

          const { timeoutValue, timeoutUnit, ...data } = validation.data;
          const timeoutMs = validation.data.timeoutMs || calculateTimeoutMs(timeoutValue, timeoutUnit);

          const newProject = await ProjectsService.createProject(userId, {
            ...data,
            timeoutMs,
          });

          return ResponseService.created(newProject, request);
        },
        { permissionKey: RbacPermission.PROJECT_CREATE }
      )
    ),
    { getUserId: (req) => req.headers.get("x-user-id") || undefined }
  ),
  { maxRequests: 20, windowSeconds: 60, keyPrefix: "rl:projects:create" }
);
