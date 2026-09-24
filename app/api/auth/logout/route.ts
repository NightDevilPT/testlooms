import { NextRequest } from "next/server";
import AuthService from "@/lib/auth-service/auth.service";
import rateLimitMiddleware from "@/middleware/rate-limit/rate-limit.middleware";

export const POST = rateLimitMiddleware(
	async (request: NextRequest | Request) => {
		const accessToken = await AuthService.getAuthCookie();
		return await AuthService.logout(accessToken, request);
	},
	{ maxRequests: 60, windowSeconds: 60, keyPrefix: "rl:logout" },
);
