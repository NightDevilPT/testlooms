import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/middleware/rate-limit/rate-limit.middleware";
import { idempotencyMiddleware } from "@/middleware/idempotency/idempotency.middleware";
import authMiddleware from "@/middleware/auth/auth.middleware";
import OrganizationsService from "@/lib/organizations-service/organizations.service";
import { inviteMemberSchema, getMembersQuerySchema } from "@/lib/organizations-service/validation";
import ResponseService from "@/lib/response-service/response.service";

/**
 * GET /api/organizations/members
 * Fetch members of the current user's organization with filtering and pagination
 */
export const GET = rateLimitMiddleware(
  authMiddleware(async (request: NextRequest | Request) => {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return ResponseService.unauthorized("Authentication required.", request);
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = {
      search: searchParams.get("search") || undefined,
      status: searchParams.get("status") || undefined,
      role: searchParams.get("role") || undefined,
      page: searchParams.get("page") || undefined,
      pageSize: searchParams.get("pageSize") || undefined,
    };

    const parsedQuery = getMembersQuerySchema.parse(rawQuery);

    return OrganizationsService.getMembers(userId, parsedQuery, request);
  }),
  { maxRequests: 60, windowSeconds: 60 }
);

/**
 * POST /api/organizations/members
 * Invite a new member to the organization (Admin only)
 */
export const POST = rateLimitMiddleware(
  authMiddleware(
    idempotencyMiddleware(async (request: NextRequest | Request) => {
      const userId = request.headers.get("x-user-id");
      if (!userId) {
        return ResponseService.unauthorized("Authentication required.", request);
      }

      const body = await request.json();
      const parsedInput = inviteMemberSchema.parse(body);

      return OrganizationsService.inviteMember(userId, parsedInput, request);
    })
  ),
  { maxRequests: 30, windowSeconds: 60 }
);
