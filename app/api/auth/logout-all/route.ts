import { NextRequest } from "next/server";
import AuthService from "@/lib/auth-service/auth.service";
import rateLimitMiddleware from "@/middleware/rate-limit/rate-limit.middleware";

export const POST = rateLimitMiddleware(
  async (request: NextRequest | Request) => {
    const accessToken = await AuthService.getAuthCookie();
    const { payload, errorResponse } = await AuthService.verifySession(accessToken, request);

    if (errorResponse) {
      return errorResponse;
    }

    return await AuthService.logoutAll(payload!.userId, request);
  },
  { maxRequests: 30, windowSeconds: 60, keyPrefix: "rl:logout-all" }
);
