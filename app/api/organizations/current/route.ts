import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/middleware/rate-limit/rate-limit.middleware";
import authMiddleware from "@/middleware/auth/auth.middleware";
import OrganizationsService from "@/lib/organizations-service/organizations.service";
import { updateOrganizationSchema } from "@/lib/organizations-service/validation";
import ResponseService from "@/lib/response-service/response.service";

/**
 * GET /api/organizations/current
 * Fetch current user's organization details, member count, project count, and role
 */
export const GET = rateLimitMiddleware(
  authMiddleware(async (request: NextRequest | Request) => {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return ResponseService.unauthorized("Authentication required.", request);
    }

    return OrganizationsService.getCurrentOrganization(userId, request);
  }),
  { maxRequests: 60, windowSeconds: 60 }
);

/**
 * PATCH /api/organizations/current
 * Update organization profile (Admin only)
 */
export const PATCH = rateLimitMiddleware(
  authMiddleware(async (request: NextRequest | Request) => {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return ResponseService.unauthorized("Authentication required.", request);
    }

    const body = await request.json();
    const parsedInput = updateOrganizationSchema.parse(body);

    return OrganizationsService.updateOrganization(userId, parsedInput, request);
  }),
  { maxRequests: 20, windowSeconds: 60 }
);
