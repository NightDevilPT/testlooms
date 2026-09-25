import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/middleware/rate-limit/rate-limit.middleware";
import authMiddleware from "@/middleware/auth/auth.middleware";
import AuthService from "@/lib/auth-service/auth.service";
import { setupWorkspaceSchema } from "@/lib/auth-service/validation";
import ResponseService from "@/lib/response-service/response.service";

/**
 * POST /api/auth/setup-workspace
 * Complete workspace onboarding by choosing Personal workspace or creating an Organization
 */
export const POST = rateLimitMiddleware(
  authMiddleware(async (request: NextRequest | Request) => {
    try {
      const userId = request.headers.get("x-user-id");
      if (!userId) {
        return ResponseService.unauthorized("Authentication required.", request);
      }

      const body = await request.json();
      const parsedInput = setupWorkspaceSchema.parse(body);

      return AuthService.setupWorkspace(userId, parsedInput, request);
    } catch (error: unknown) {
      return ResponseService.handleError(error, request);
    }
  }),
  { maxRequests: 20, windowSeconds: 60 }
);
