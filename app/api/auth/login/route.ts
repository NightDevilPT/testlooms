import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/auth-service/validation";
import AuthService from "@/lib/auth-service/auth.service";
import ResponseService from "@/lib/response-service/response.service";
import rateLimitMiddleware from "@/middleware/rate-limit/rate-limit.middleware";

export const POST = rateLimitMiddleware(
	async (request: NextRequest | Request) => {
		try {
			const body = await request.json();
			const validatedData = loginSchema.parse(body);

			return await AuthService.login(validatedData, request);
		} catch (error: unknown) {
			return ResponseService.handleError(error, request);
		}
	},
	{ maxRequests: 10, windowSeconds: 60, keyPrefix: "rl:login" },
);
