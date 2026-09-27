import { NextRequest } from "next/server";
import { ProjectsService } from "@/lib/projects-service/projects.service";
import ResponseService from "@/lib/response-service/response.service";
import { HttpStatus } from "@/lib/response-service/types";
import { RbacPermission } from "@/lib/rbac-service/types";
import authMiddleware from "@/middleware/auth/auth.middleware";
import rateLimitMiddleware from "@/middleware/rate-limit/rate-limit.middleware";
import rbacMiddleware from "@/middleware/rbac/rbac.middleware";
import { RouteHandlerContext } from "@/middleware/types";
import { ScenariosService } from "@/lib/scenarios-service/scenarios.service";
import { updateScenarioSchema } from "@/lib/scenarios-service/validation";

import idempotencyMiddleware from "@/middleware/idempotency/idempotency.middleware";

interface Params {
  id: string;
  scenarioId: string;
}

/**
 * GET /api/projects/:id/scenarios/:scenarioId
 * Fetch single scenario details with ordered steps
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
        const scenarioId = params?.scenarioId;

        if (!projectId || !scenarioId) {
          return ResponseService.badRequest("Missing project ID or scenario ID", request);
        }

        const project = await ProjectsService.getProjectById(projectId, userId);
        if (!project) {
          return ResponseService.notFound("Project not found", request);
        }

        const scenario = await ScenariosService.getScenarioById(scenarioId, projectId);
        if (!scenario) {
          return ResponseService.notFound("Scenario not found", request);
        }

        return ResponseService.ok(scenario, HttpStatus.OK, request);
      },
      { permissionKey: RbacPermission.SCENARIO_RECORD }
    )
  ),
  { maxRequests: 120, windowSeconds: 60, keyPrefix: "rl:scenarios:get" }
);

/**
 * PATCH /api/projects/:id/scenarios/:scenarioId
 * Update scenario title, description, route, status, or tags
 */
export const PATCH = rateLimitMiddleware(
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
          const scenarioId = params?.scenarioId;

          if (!projectId || !scenarioId) {
            return ResponseService.badRequest("Missing project ID or scenario ID", request);
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

          const parseResult = updateScenarioSchema.safeParse(body);
          if (!parseResult.success) {
            return ResponseService.badRequest(
              `Validation error: ${parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`,
              request
            );
          }

          try {
            const updatedScenario = await ScenariosService.updateScenario(
              scenarioId,
              projectId,
              parseResult.data,
              userId
            );
            return ResponseService.ok(updatedScenario, HttpStatus.OK, request);
          } catch (error: any) {
            return ResponseService.badRequest(error.message || "Failed to update scenario", request);
          }
        }
      ),
      { permissionKey: RbacPermission.SCENARIO_RECORD }
    )
  ),
  { maxRequests: 60, windowSeconds: 60, keyPrefix: "rl:scenarios:update" }
);

/**
 * DELETE /api/projects/:id/scenarios/:scenarioId
 * Soft-delete scenario and its recorded steps
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
        const scenarioId = params?.scenarioId;

        if (!projectId || !scenarioId) {
          return ResponseService.badRequest("Missing project ID or scenario ID", request);
        }

        const project = await ProjectsService.getProjectById(projectId, userId);
        if (!project) {
          return ResponseService.notFound("Project not found", request);
        }

        try {
          await ScenariosService.deleteScenario(scenarioId, projectId, userId);
          return ResponseService.ok({ deleted: true }, HttpStatus.OK, request);
        } catch (error: any) {
          return ResponseService.badRequest(error.message || "Failed to delete scenario", request);
        }
      },
      { permissionKey: RbacPermission.SCENARIO_RECORD }
    )
  ),
  { maxRequests: 30, windowSeconds: 60, keyPrefix: "rl:scenarios:delete" }
);
