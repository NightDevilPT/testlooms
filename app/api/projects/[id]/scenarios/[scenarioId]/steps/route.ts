import { NextRequest } from "next/server";
import { ScenariosService } from "@/lib/scenarios-service/scenarios.service";
import { createStepsSchema, reorderStepsSchema, testStepSchema } from "@/lib/scenarios-service/validation";
import ResponseService from "@/lib/response-service/response.service";
import { HttpStatus } from "@/lib/response-service/types";
import { RbacPermission } from "@/lib/rbac-service/types";
import authMiddleware from "@/middleware/auth/auth.middleware";
import rateLimitMiddleware from "@/middleware/rate-limit/rate-limit.middleware";
import rbacMiddleware from "@/middleware/rbac/rbac.middleware";
import idempotencyMiddleware from "@/middleware/idempotency/idempotency.middleware";
import { RouteHandlerContext } from "@/middleware/types";

interface Params {
  id: string;
  scenarioId: string;
}

/**
 * GET /api/projects/:id/scenarios/:scenarioId/steps
 * List all steps for a scenario in stepOrder sequence
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
          return ResponseService.badRequest("Missing parameters", request);
        }

        const steps = await ScenariosService.listSteps(scenarioId, projectId);
        return ResponseService.ok(steps, HttpStatus.OK, request);
      },
      { permissionKey: RbacPermission.SCENARIO_RECORD }
    )
  ),
  { maxRequests: 120, windowSeconds: 60, keyPrefix: "rl:steps:list" }
);

/**
 * POST /api/projects/:id/scenarios/:scenarioId/steps
 * Dedicated endpoint for creating single or bulk test steps for an existing scenario
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
          const scenarioId = params?.scenarioId;

          if (!projectId || !scenarioId) {
            return ResponseService.badRequest("Missing parameters", request);
          }

          let body: any;
          try {
            body = await request.json();
          } catch {
            return ResponseService.badRequest("Invalid JSON body", request);
          }

          let stepsToCreate: any[] = [];
          if (Array.isArray(body)) {
            stepsToCreate = body;
          } else if (body.steps && Array.isArray(body.steps)) {
            stepsToCreate = body.steps;
          } else {
            stepsToCreate = [body];
          }

          const parseResult = createStepsSchema.safeParse({ steps: stepsToCreate });
          if (!parseResult.success) {
            return ResponseService.badRequest(
              `Validation error: ${parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`,
              request
            );
          }

          const createdSteps = await ScenariosService.bulkCreateSteps(
            scenarioId,
            projectId,
            parseResult.data.steps,
            userId
          );

          return ResponseService.ok(createdSteps, HttpStatus.CREATED, request);
        }
      ),
      { permissionKey: RbacPermission.SCENARIO_EDIT }
    )
  ),
  { maxRequests: 60, windowSeconds: 60, keyPrefix: "rl:steps:create" }
);

/**
 * PATCH /api/projects/:id/scenarios/:scenarioId/steps
 * Reorder steps in bulk
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

        if (!projectId || !scenarioId) {
          return ResponseService.badRequest("Missing parameters", request);
        }

        let body: any;
        try {
          body = await request.json();
        } catch {
          return ResponseService.badRequest("Invalid JSON body", request);
        }

        const parseResult = reorderStepsSchema.safeParse(body);
        if (!parseResult.success) {
          return ResponseService.badRequest(
            `Validation error: ${parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`,
            request
          );
        }

        const reordered = await ScenariosService.reorderSteps(
          scenarioId,
          projectId,
          parseResult.data.orders,
          userId
        );

        return ResponseService.ok(reordered, HttpStatus.OK, request);
      },
      { permissionKey: RbacPermission.SCENARIO_EDIT }
    )
  ),
  { maxRequests: 60, windowSeconds: 60, keyPrefix: "rl:steps:reorder" }
);
