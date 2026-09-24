import { NextRequest } from "next/server";
import { signupSchema } from "@/lib/auth-service/validation";
import AuthService from "@/lib/auth-service/auth.service";
import ResponseService from "@/lib/response-service/response.service";
import rateLimitMiddleware from "@/middleware/rate-limit/rate-limit.middleware";
import idempotencyMiddleware from "@/middleware/idempotency/idempotency.middleware";

export const POST = rateLimitMiddleware(
	idempotencyMiddleware(async (request: NextRequest | Request) => {
		try {
			const body = await request.json();
			const validatedData = signupSchema.parse(body);

			return await AuthService.signup(validatedData, request);
		} catch (error: unknown) {
			return ResponseService.handleError(error, request);
		}
	}),
	{ maxRequests: 10, windowSeconds: 60, keyPrefix: "rl:signup" },
);
