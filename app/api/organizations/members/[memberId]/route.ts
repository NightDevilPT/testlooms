import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/middleware/rate-limit/rate-limit.middleware";
import { idempotencyMiddleware } from "@/middleware/idempotency/idempotency.middleware";
import authMiddleware from "@/middleware/auth/auth.middleware";
import OrganizationsService from "@/lib/organizations-service/organizations.service";
import { updateMemberRoleSchema } from "@/lib/organizations-service/validation";
import ResponseService from "@/lib/response-service/response.service";
import { RouteHandlerContext } from "@/middleware/types";

/**
 * PATCH /api/organizations/members/[memberId]
 * Update a team member's role (Admin only)
 */
export const PATCH = rateLimitMiddleware(
  authMiddleware(
    idempotencyMiddleware(async (request: NextRequest | Request, context?: RouteHandlerContext<{ memberId: string }>) => {
      const userId = request.headers.get("x-user-id");
      if (!userId) {
        return ResponseService.unauthorized("Authentication required.", request);
      }

      const resolvedParams = await context?.params;
      const memberId = resolvedParams?.memberId;
      if (!memberId) {
        return ResponseService.badRequest("Member ID is required.", request);
      }

      const body = await request.json();
      const parsedInput = updateMemberRoleSchema.parse(body);

      return OrganizationsService.updateMemberRole(userId, memberId, parsedInput, request);
    })
  ),
  { maxRequests: 30, windowSeconds: 60 }
);

/**
 * DELETE /api/organizations/members/[memberId]
 * Remove a team member (Admin only)
 */
export const DELETE = rateLimitMiddleware(
  authMiddleware(
    idempotencyMiddleware(async (request: NextRequest | Request, context?: RouteHandlerContext<{ memberId: string }>) => {
      const userId = request.headers.get("x-user-id");
      if (!userId) {
        return ResponseService.unauthorized("Authentication required.", request);
      }

      const resolvedParams = await context?.params;
      const memberId = resolvedParams?.memberId;
      if (!memberId) {
        return ResponseService.badRequest("Member ID is required.", request);
      }

      return OrganizationsService.removeMember(userId, memberId, request);
    })
  ),
  { maxRequests: 30, windowSeconds: 60 }
);
