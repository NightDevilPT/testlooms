import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import ResponseService from "@/lib/response-service/response.service";
import {
  DashboardOverviewResponse,
  DailyExecutionTrend,
  ScenarioStatusDistribution,
  RecentExecutionItem,
  ProjectSummaryItem,
} from "./types";

export class DashboardService {
  /**
   * Fetch comprehensive dashboard overview telemetry & statistics for the authenticated user
   */
  public static async getDashboardOverview(userId: string, request?: Request): Promise<NextResponse> {
    try {
      // 1. Resolve user's active workspace mode (Organization vs Personal)
      const member = await prisma.organizationMember.findFirst({
        where: { userId, deletedAt: null },
        include: { organization: true },
      });

      const activeOrg = member?.organization && member.organization.deletedAt === null ? member.organization : null;
      const workspaceType: "PERSONAL" | "ORGANIZATION" = activeOrg ? "ORGANIZATION" : "PERSONAL";

      // 2. Fetch accessible project IDs
      let accessibleProjects;
      if (activeOrg) {
        accessibleProjects = await prisma.project.findMany({
          where: {
            deletedAt: null,
            OR: [
              { organizationId: activeOrg.id },
              { ownershipType: "PERSONAL", userId },
            ],
          },
          select: { id: true, name: true, ownershipType: true },
        });
      } else {
        accessibleProjects = await prisma.project.findMany({
          where: { userId, ownershipType: "PERSONAL", deletedAt: null },
          select: { id: true, name: true, ownershipType: true },
        });
      }

      const projectIds = accessibleProjects.map((p) => p.id);

      // 3. Count Projects Metrics
      const totalProjects = accessibleProjects.length;
      const personalProjects = accessibleProjects.filter((p) => p.ownershipType === "PERSONAL").length;
      const orgProjects = accessibleProjects.filter((p) => p.ownershipType === "COMPANY").length;

      // 4. Count Scenarios & Workflows Metrics
      const totalScenarios = await prisma.testScenario.count({
        where: { projectId: { in: projectIds }, deletedAt: null },
      });

      const totalWorkflows = await prisma.testWorkflow.count({
        where: { projectId: { in: projectIds }, deletedAt: null },
      });

      // 5. Aggregate Test Executions
      const totalExecutions = await prisma.testExecution.count({
        where: { projectId: { in: projectIds }, deletedAt: null },
      });

      const passedExecutions = await prisma.testExecution.count({
        where: { projectId: { in: projectIds }, status: "PASSED", deletedAt: null },
      });

      const failedExecutions = await prisma.testExecution.count({
        where: { projectId: { in: projectIds }, status: "FAILED", deletedAt: null },
      });

      const runningExecutions = await prisma.testExecution.count({
        where: { projectId: { in: projectIds }, status: "RUNNING", deletedAt: null },
      });

      const passRatePercentage = totalExecutions > 0 ? Number(((passedExecutions / totalExecutions) * 100).toFixed(1)) : 0;

      // 6. Aggregate Step Results Telemetry
      const stepStats = await prisma.testExecution.aggregate({
        where: { projectId: { in: projectIds }, deletedAt: null },
        _sum: {
          totalSteps: true,
          passedSteps: true,
          failedSteps: true,
          healedSteps: true,
        },
      });

      const totalStepsExecuted = stepStats._sum.totalSteps || 0;
      const passedSteps = stepStats._sum.passedSteps || 0;
      const failedSteps = stepStats._sum.failedSteps || 0;
      const healedSteps = stepStats._sum.healedSteps || 0;

      const totalExecutedOrHealed = passedSteps + failedSteps + healedSteps;
      const selfHealingRatePercentage = totalExecutedOrHealed > 0 ? Number(((healedSteps / totalExecutedOrHealed) * 100).toFixed(1)) : 0;

      // 7. Daily Execution Trends (Past 7 Days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const rawRecentExecutions = await prisma.testExecution.findMany({
        where: {
          projectId: { in: projectIds },
          createdAt: { gte: sevenDaysAgo },
          deletedAt: null,
        },
        select: {
          createdAt: true,
          status: true,
        },
      });

      const dailyTrendMap = new Map<string, { passed: number; failed: number; total: number }>();

      // Initialize 7 days
      for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];
        dailyTrendMap.set(dateStr, { passed: 0, failed: 0, total: 0 });
      }

      rawRecentExecutions.forEach((exec) => {
        const dateStr = exec.createdAt.toISOString().split("T")[0];
        const current = dailyTrendMap.get(dateStr) || { passed: 0, failed: 0, total: 0 };
        if (exec.status === "PASSED") current.passed += 1;
        if (exec.status === "FAILED") current.failed += 1;
        current.total += 1;
        dailyTrendMap.set(dateStr, current);
      });

      const dailyTrends: DailyExecutionTrend[] = Array.from(dailyTrendMap.entries()).map(([date, data]) => ({
        date,
        passed: data.passed,
        failed: data.failed,
        total: data.total,
      }));

      // 8. Scenario Distribution Status
      const readyScenarios = await prisma.testScenario.count({
        where: { projectId: { in: projectIds }, status: "READY", deletedAt: null },
      });

      const draftScenarios = await prisma.testScenario.count({
        where: { projectId: { in: projectIds }, status: "DRAFT", deletedAt: null },
      });

      const deprecatedScenarios = await prisma.testScenario.count({
        where: { projectId: { in: projectIds }, status: "DEPRECATED", deletedAt: null },
      });

      const scenarioDistribution: ScenarioStatusDistribution[] = [
        {
          status: "READY",
          label: "Ready for Execution",
          count: readyScenarios,
          percentage: totalScenarios > 0 ? Number(((readyScenarios / totalScenarios) * 100).toFixed(1)) : 0,
        },
        {
          status: "DRAFT",
          label: "In Recording / Draft",
          count: draftScenarios,
          percentage: totalScenarios > 0 ? Number(((draftScenarios / totalScenarios) * 100).toFixed(1)) : 0,
        },
        {
          status: "DEPRECATED",
          label: "Deprecated",
          count: deprecatedScenarios,
          percentage: totalScenarios > 0 ? Number(((deprecatedScenarios / totalScenarios) * 100).toFixed(1)) : 0,
        },
      ];

      // 9. Recent Test Executions (Top 10)
      const recentExecutionsQuery = await prisma.testExecution.findMany({
        where: { projectId: { in: projectIds }, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          project: { select: { name: true } },
          scenario: { select: { title: true } },
          workflow: { select: { title: true } },
        },
      });

      const recentExecutions: RecentExecutionItem[] = recentExecutionsQuery.map((exec) => ({
        id: exec.id,
        projectId: exec.projectId,
        projectName: exec.project.name,
        scenarioId: exec.scenarioId,
        scenarioTitle: exec.scenario?.title || null,
        workflowId: exec.workflowId,
        workflowTitle: exec.workflow?.title || null,
        triggerType: exec.triggerType,
        status: exec.status,
        durationMs: exec.durationMs,
        totalSteps: exec.totalSteps,
        passedSteps: exec.passedSteps,
        failedSteps: exec.failedSteps,
        healedSteps: exec.healedSteps,
        startedAt: exec.startedAt ? exec.startedAt.toISOString() : null,
        completedAt: exec.completedAt ? exec.completedAt.toISOString() : null,
        createdAt: exec.createdAt.toISOString(),
      }));

      // 10. Top Active Projects Summary (Top 5)
      const topProjectsQuery = await prisma.project.findMany({
        where: { id: { in: projectIds }, deletedAt: null },
        take: 5,
        include: {
          _count: {
            select: { scenarios: true, executions: true },
          },
          executions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { status: true },
          },
        },
      });

      const topProjects: ProjectSummaryItem[] = topProjectsQuery.map((p) => ({
        id: p.id,
        name: p.name,
        ownershipType: p.ownershipType,
        scenarioCount: p._count.scenarios,
        executionCount: p._count.executions,
        lastExecutionStatus: p.executions[0]?.status || null,
      }));

      const payload: DashboardOverviewResponse = {
        workspaceType,
        organizationName: activeOrg?.name || null,
        summary: {
          totalProjects,
          personalProjects,
          orgProjects,
          totalScenarios,
          totalWorkflows,
          totalExecutions,
          passedExecutions,
          failedExecutions,
          runningExecutions,
          passRatePercentage,
          totalStepsExecuted,
          passedSteps,
          failedSteps,
          healedSteps,
          selfHealingRatePercentage,
        },
        dailyTrends,
        scenarioDistribution,
        recentExecutions,
        topProjects,
      };

      return ResponseService.ok(payload, undefined, request);
    } catch (error: unknown) {
      return ResponseService.handleError(error, request);
    }
  }
}

export default DashboardService;
