import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/middleware/rate-limit/rate-limit.middleware";
import { idempotencyMiddleware } from "@/middleware/idempotency/idempotency.middleware";
import authMiddleware from "@/middleware/auth/auth.middleware";
import OrganizationsService from "@/lib/organizations-service/organizations.service";
import ResponseService from "@/lib/response-service/response.service";
import { RouteHandlerContext } from "@/middleware/types";

/**
 * POST /api/organizations/members/[memberId]/resend
 * Resend invitation email to a pending team member (Admin only)
 */
export const POST = rateLimitMiddleware(
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

      return OrganizationsService.resendInvite(userId, memberId, request);
    })
  ),
  { maxRequests: 20, windowSeconds: 60 }
);
