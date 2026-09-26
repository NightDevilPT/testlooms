import { NextRequest } from "next/server";
import AuthService from "@/lib/auth-service/auth.service";
import rateLimitMiddleware from "@/middleware/rate-limit/rate-limit.middleware";
import authMiddleware from "@/middleware/auth/auth.middleware";
import ResponseService from "@/lib/response-service/response.service";

import { updateProfileSchema } from "@/lib/auth-service/validation";

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

/**
 * PATCH /api/auth/me
 * Update profile details (firstName, lastName) for current user
 */
export const PATCH = rateLimitMiddleware(
	authMiddleware(async (request: NextRequest | Request) => {
		const userId = request.headers.get("x-user-id");
		if (!userId) {
			return ResponseService.unauthorized("Authentication required.", request);
		}

		const body = await request.json();
		const validation = updateProfileSchema.safeParse(body);

		if (!validation.success) {
			return ResponseService.badRequest(
				validation.error.issues[0]?.message || "Invalid payload",
				request
			);
		}

		return AuthService.updateUserProfile(userId, validation.data, request);
	}),
	{ maxRequests: 20, windowSeconds: 60, keyPrefix: "rl:me:update" },
);

