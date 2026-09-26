import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/middleware/rate-limit/rate-limit.middleware";
import authMiddleware from "@/middleware/auth/auth.middleware";
import DashboardService from "@/lib/dashboard-service/dashboard.service";
import ResponseService from "@/lib/response-service/response.service";

/**
 * GET /api/dashboard/stats
 * Returns telemetry, execution stats, daily trends, scenario distribution, and recent executions.
 */
export const GET = rateLimitMiddleware(
  authMiddleware(async (request: NextRequest | Request) => {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return ResponseService.unauthorized("Authentication required.", request);
    }
    return DashboardService.getDashboardOverview(userId, request);
  }),
  { maxRequests: 60, windowSeconds: 60 }
);
