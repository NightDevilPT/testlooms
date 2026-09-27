import { NextRequest } from "next/server";
import { ScenariosService } from "@/lib/scenarios-service/scenarios.service";
import { ScenarioStatusType } from "@/lib/scenarios-service/types";
import ResponseService from "@/lib/response-service/response.service";
import { HttpStatus } from "@/lib/response-service/types";
import { RbacPermission } from "@/lib/rbac-service/types";
import authMiddleware from "@/middleware/auth/auth.middleware";
import rateLimitMiddleware from "@/middleware/rate-limit/rate-limit.middleware";
import rbacMiddleware from "@/middleware/rbac/rbac.middleware";

/**
 * GET /api/scenarios
 * List paginated test scenarios across all projects for current user
 */
export const GET = rateLimitMiddleware(
  authMiddleware(
    rbacMiddleware(
      async (request: NextRequest | Request) => {
        const userId = request.headers.get("x-user-id");
        if (!userId) {
          return ResponseService.unauthorized("Authentication required", request);
        }

        const url = new URL(request.url);
        const projectId = url.searchParams.get("projectId") || undefined;
        const status = (url.searchParams.get("status") as ScenarioStatusType) || undefined;
        const search = url.searchParams.get("search") || undefined;
        const tag = url.searchParams.get("tag") || undefined;
        const page = parseInt(url.searchParams.get("page") || "1", 10);
        const pageSize = parseInt(url.searchParams.get("pageSize") || "12", 10);
        const rawSortBy = url.searchParams.get("sortBy");
        const sortBy = rawSortBy === "title" || rawSortBy === "steps" ? rawSortBy : "updated";

        const result = await ScenariosService.listScenarios({
          userId,
          projectId,
          status,
          search,
          tag,
          page,
          pageSize,
          sortBy,
        });

        return ResponseService.paginated(
          result.scenarios,
          {
            page,
            pageSize,
            totalItems: result.totalItems,
            totalPages: result.totalPages,
            hasNext: page < result.totalPages,
            hasPrevious: page > 1,
          },
          HttpStatus.OK,
          request,
          result.metrics
        );
      },
      { permissionKey: RbacPermission.SCENARIO_RECORD }
    )
  ),
  { maxRequests: 60, windowSeconds: 60, keyPrefix: "rl:scenarios:list-all" }
);
