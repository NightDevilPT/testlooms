import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import ResponseService from "@/lib/response-service/response.service";
import { HttpStatus } from "@/lib/response-service/types";
import { RbacPermission } from "@/lib/rbac-service/types";
import authMiddleware from "@/middleware/auth/auth.middleware";
import rateLimitMiddleware from "@/middleware/rate-limit/rate-limit.middleware";
import rbacMiddleware from "@/middleware/rbac/rbac.middleware";
import { ExecutionStatus, TriggerType, Prisma } from "@prisma/client";

/**
 * GET /api/executions
 * List paginated test executions across all user projects
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
        const status = (url.searchParams.get("status") as ExecutionStatus) || undefined;
        const triggerType = (url.searchParams.get("triggerType") as TriggerType) || undefined;
        const search = url.searchParams.get("search") || undefined;
        const page = parseInt(url.searchParams.get("page") || "1", 10);
        const pageSize = parseInt(url.searchParams.get("pageSize") || "12", 10);
        const skip = (Math.max(1, page) - 1) * pageSize;

        const whereClause: Prisma.TestExecutionWhereInput = {
          deletedAt: null,
          project: {
            deletedAt: null,
            OR: [
              { userId },
              {
                organization: {
                  members: {
                    some: {
                      userId,
                      deletedAt: null,
                    },
                  },
                },
              },
            ],
          },
        };

        if (projectId) {
          whereClause.projectId = projectId;
        }

        if (status) {
          whereClause.status = status;
        }

        if (triggerType) {
          whereClause.triggerType = triggerType;
        }

        if (search && search.trim()) {
          const searchStr = search.trim();
          whereClause.OR = [
            { scenario: { title: { contains: searchStr, mode: "insensitive" } } },
            { workflow: { title: { contains: searchStr, mode: "insensitive" } } },
            { project: { name: { contains: searchStr, mode: "insensitive" } } },
            { errorMessage: { contains: searchStr, mode: "insensitive" } },
          ];
        }

        const baseUserExecutionsWhere: Prisma.TestExecutionWhereInput = {
          deletedAt: null,
          project: {
            deletedAt: null,
            ...(projectId
              ? { id: projectId }
              : {
                  OR: [
                    { userId },
                    {
                      organization: {
                        members: {
                          some: {
                            userId,
                            deletedAt: null,
                          },
                        },
                      },
                    },
                  ],
                }),
          },
        };

        const [
          executions,
          totalItems,
          passedCount,
          failedCount,
          runningCount,
        ] = await Promise.all([
          prisma.testExecution.findMany({
            where: whereClause,
            skip,
            take: pageSize,
            orderBy: { createdAt: "desc" },
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                  baseUrl: true,
                },
              },
              scenario: {
                select: {
                  id: true,
                  title: true,
                  relativeRoute: true,
                },
              },
              workflow: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          }),
          prisma.testExecution.count({ where: whereClause }),
          prisma.testExecution.count({
            where: {
              ...baseUserExecutionsWhere,
              status: "PASSED",
            },
          }),
          prisma.testExecution.count({
            where: {
              ...baseUserExecutionsWhere,
              status: "FAILED",
            },
          }),
          prisma.testExecution.count({
            where: {
              ...baseUserExecutionsWhere,
              status: "RUNNING",
            },
          }),
        ]);

        const totalPages = Math.ceil(totalItems / pageSize) || 1;
        const finishedTotal = passedCount + failedCount;
        const passRate = finishedTotal > 0 ? Math.round((passedCount / finishedTotal) * 1000) / 10 : 0;

        const metrics = {
          totalExecutions: totalItems,
          passedCount,
          failedCount,
          runningCount,
          passRate,
        };

        return ResponseService.paginated(
          executions,
          {
            page,
            pageSize,
            totalItems,
            totalPages,
            hasNext: page < totalPages,
            hasPrevious: page > 1,
          },
          HttpStatus.OK,
          request,
          metrics
        );
      },
      { permissionKey: RbacPermission.EXECUTION_VIEW }
    )
  ),
  { maxRequests: 120, windowSeconds: 60, keyPrefix: "rl:executions:list-all" }
);
