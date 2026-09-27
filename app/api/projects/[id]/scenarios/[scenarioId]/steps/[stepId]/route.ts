import { NextRequest } from "next/server";
import { ScenariosService } from "@/lib/scenarios-service/scenarios.service";
import { updateStepSchema } from "@/lib/scenarios-service/validation";
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
  stepId: string;
}

/**
 * GET /api/projects/:id/scenarios/:scenarioId/steps/:stepId
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
        const stepId = params?.stepId;

        if (!projectId || !scenarioId || !stepId) {
          return ResponseService.badRequest("Missing parameters", request);
        }

        const step = await ScenariosService.getStepById(stepId, scenarioId, projectId);
        if (!step) {
          return ResponseService.notFound("Test step not found", request);
        }

        return ResponseService.ok(step, HttpStatus.OK, request);
      },
      { permissionKey: RbacPermission.SCENARIO_RECORD }
    )
  ),
  { maxRequests: 120, windowSeconds: 60, keyPrefix: "rl:steps:get" }
);

/**
 * PATCH /api/projects/:id/scenarios/:scenarioId/steps/:stepId
 * Update a single test step
 */
export const PATCH = rateLimitMiddleware(
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
        const stepId = params?.stepId;

        if (!projectId || !scenarioId || !stepId) {
          return ResponseService.badRequest("Missing parameters", request);
        }

        let body: any;
        try {
          body = await request.json();
        } catch {
          return ResponseService.badRequest("Invalid JSON body", request);
        }

        const parseResult = updateStepSchema.safeParse(body);
        if (!parseResult.success) {
          return ResponseService.badRequest(
            `Validation error: ${parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`,
            request
          );
        }

        const updatedStep = await ScenariosService.updateStep(
          stepId,
          scenarioId,
          projectId,
          parseResult.data,
          userId
        );

        return ResponseService.ok(updatedStep, HttpStatus.OK, request);
      },
      { permissionKey: RbacPermission.SCENARIO_EDIT }
    )
  ),
  { maxRequests: 60, windowSeconds: 60, keyPrefix: "rl:steps:patch" }
);

/**
 * DELETE /api/projects/:id/scenarios/:scenarioId/steps/:stepId
 * Delete a single test step and re-index remaining step orders
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
        const stepId = params?.stepId;

        if (!projectId || !scenarioId || !stepId) {
          return ResponseService.badRequest("Missing parameters", request);
        }

        await ScenariosService.deleteStep(stepId, scenarioId, projectId, userId);
        return ResponseService.ok({ deleted: true }, HttpStatus.OK, request);
      },
      { permissionKey: RbacPermission.SCENARIO_EDIT }
    )
  ),
  { maxRequests: 60, windowSeconds: 60, keyPrefix: "rl:steps:delete" }
);
