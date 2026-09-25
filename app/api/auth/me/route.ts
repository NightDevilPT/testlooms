import { NextRequest } from "next/server";
import AuthService from "@/lib/auth-service/auth.service";
import rateLimitMiddleware from "@/middleware/rate-limit/rate-limit.middleware";
import authMiddleware from "@/middleware/auth/auth.middleware";
import ResponseService from "@/lib/response-service/response.service";

/**
 * GET /api/auth/me
 * Fetch current authenticated user profile and active memberships
 */
export const GET = rateLimitMiddleware(
	authMiddleware(async (request: NextRequest | Request) => {
		const userId = request.headers.get("x-user-id");
		if (!userId) {
			return ResponseService.unauthorized("Authentication required.", request);
		}

		return AuthService.getCurrentUser(userId, request);
	}),
	{ maxRequests: 30, windowSeconds: 60, keyPrefix: "rl:me" },
);
