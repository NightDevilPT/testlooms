import { NextRequest } from "next/server";
import { ProjectsService } from "@/lib/projects-service/projects.service";
import ResponseService from "@/lib/response-service/response.service";
import { HttpStatus } from "@/lib/response-service/types";
import { RbacPermission } from "@/lib/rbac-service/types";
import authMiddleware from "@/middleware/auth/auth.middleware";
import rateLimitMiddleware from "@/middleware/rate-limit/rate-limit.middleware";
import rbacMiddleware from "@/middleware/rbac/rbac.middleware";
import idempotencyMiddleware from "@/middleware/idempotency/idempotency.middleware";
import { RouteHandlerContext } from "@/middleware/types";
import { ScenariosService } from "@/lib/scenarios-service/scenarios.service";
import { createScenarioSchema } from "@/lib/scenarios-service/validation";

interface Params {
  id: string;
}

/**
 * GET /api/projects/:id/scenarios
 * List all scenarios for a project
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
          return ResponseService.notFound("Project not found", request);
        }

        const url = new URL(request.url);
        const search = url.searchParams.get("search") || undefined;
        const tag = url.searchParams.get("tag") || undefined;

        const scenarios = await ScenariosService.listScenarios({
          projectId,
          search,
          tag,
        });

        return ResponseService.ok(scenarios, HttpStatus.OK, request);
      },
      { permissionKey: RbacPermission.SCENARIO_RECORD }
    )
  ),
  { maxRequests: 120, windowSeconds: 60, keyPrefix: "rl:scenarios:list" }
);

/**
 * POST /api/projects/:id/scenarios
 * Create a new Scenario and its ordered steps in PostgreSQL transaction
 */
export const POST = rateLimitMiddleware(
  authMiddleware(
    rbacMiddleware(
      idempotencyMiddleware(
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
            return ResponseService.notFound("Project not found", request);
          }

          let body: any;
          try {
            body = await request.json();
          } catch {
            return ResponseService.badRequest("Invalid JSON request body", request);
          }

          const parseResult = createScenarioSchema.safeParse({
            ...body,
            projectId,
          });

          if (!parseResult.success) {
            return ResponseService.badRequest(
              `Validation error: ${parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`,
              request
            );
          }

          const newScenario = await ScenariosService.createScenario(parseResult.data, userId);

          return ResponseService.ok(newScenario, HttpStatus.CREATED, request);
        }
      ),
      { permissionKey: RbacPermission.SCENARIO_RECORD }
    )
  ),
  { maxRequests: 60, windowSeconds: 60, keyPrefix: "rl:scenarios:create" }
);
