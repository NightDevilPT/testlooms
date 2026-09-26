import { NextRequest } from "next/server";
import { ProjectsService } from "@/lib/projects-service/projects.service";
import { pingUrlSchema } from "@/lib/projects-service/validation";
import ResponseService from "@/lib/response-service/response.service";
import { HttpStatus } from "@/lib/response-service/types";
import { RbacPermission } from "@/lib/rbac-service/types";
import authMiddleware from "@/middleware/auth/auth.middleware";
import rateLimitMiddleware from "@/middleware/rate-limit/rate-limit.middleware";
import rbacMiddleware from "@/middleware/rbac/rbac.middleware";

/**
 * POST /api/projects/ping
 * Check target base URL reachability
 */
export const POST = rateLimitMiddleware(
  authMiddleware(
    rbacMiddleware(
      async (request: NextRequest | Request) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return ResponseService.badRequest("Invalid JSON payload", request);
        }

        const validation = pingUrlSchema.safeParse(body);
        if (!validation.success) {
          return ResponseService.badRequest(
            validation.error.issues[0]?.message || "Invalid URL",
            request
          );
        }

        const pingResult = await ProjectsService.pingUrl(validation.data.url);
        return ResponseService.ok(pingResult, HttpStatus.OK, request);
      },
      { permissionKey: RbacPermission.EXECUTION_VIEW }
    )
  ),
  { maxRequests: 30, windowSeconds: 60, keyPrefix: "rl:projects:ping" }
);
