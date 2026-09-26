"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client/api-client.service";
import { DashboardOverviewResponse } from "@/lib/dashboard-service/types";
import { DashboardSkeleton } from "./_components/dashboard-skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import {
  FolderKanban,
  FileCheck2,
  CheckCircle2,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  PlayCircle,
  Clock,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  XCircle,
  Activity,
} from "lucide-react";

const executionChartConfig = {
  passed: {
    label: "Passed Runs",
    color: "var(--chart-1)",
  },
  failed: {
    label: "Failed Runs",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const scenarioChartConfig = {
  READY: {
    label: "Ready",
    color: "var(--chart-1)",
  },
  DRAFT: {
    label: "Draft",
    color: "var(--chart-2)",
  },
  DEPRECATED: {
    label: "Deprecated",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const PIE_COLORS = {
  READY: "var(--chart-1)",
  DRAFT: "var(--chart-2)",
  DEPRECATED: "var(--chart-3)",
};


export function DashboardPageComponent() {
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<DashboardOverviewResponse>("/api/dashboard/stats");
      if (response.success && response.data && !Array.isArray(response.data)) {
        setData(response.data);
      } else {
        setError(response.success === false ? response.error.message : "Failed to load dashboard metrics.");
      }
    } catch {
      setError("An error occurred while fetching dashboard statistics.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="p-6 w-full space-y-4">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-8 text-center space-y-3">
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Failed to Load Dashboard</h2>
            <p className="text-sm text-muted-foreground">{error || "Unable to load dashboard data."}</p>
            <Button variant="outline" onClick={fetchDashboardData} className="mt-2">
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { summary, dailyTrends, scenarioDistribution, recentExecutions } = data;

  // Format daily dates for chart X-axis
  const formattedDailyTrends = dailyTrends.map((item) => ({
    ...item,
    formattedDate: new Date(item.date).toLocaleDateString(undefined, { weekday: "short" }),
  }));

  return (
    <div className="w-full px-1 space-y-6">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <Badge variant="outline" className="font-mono text-xs border-border text-muted-foreground">
            {data.workspaceType} WORKSPACE
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDashboardData} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Top Row: 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Projects */}
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Projects</p>
              <h3 className="text-3xl font-bold tracking-tight text-foreground">{summary.totalProjects}</h3>
              <p className="text-xs text-muted-foreground font-mono">
                {summary.personalProjects} Personal • {summary.orgProjects} Team Org
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <FolderKanban className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Test Scenarios */}
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Test Scenarios</p>
              <h3 className="text-3xl font-bold tracking-tight text-foreground">{summary.totalScenarios}</h3>
              <p className="text-xs text-muted-foreground font-mono">
                {summary.totalWorkflows} Executable Workflows
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <FileCheck2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Execution Pass Rate */}
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pass Rate</p>
              <h3 className="text-3xl font-bold tracking-tight text-emerald-500">
                {summary.passRatePercentage}%
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                {summary.passedExecutions} Passed / {summary.totalExecutions} Runs
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Self-Healed Selectors */}
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Self-Healed Selectors</p>
              <h3 className="text-3xl font-bold tracking-tight text-foreground">{summary.healedSteps}</h3>
              <p className="text-xs text-muted-foreground font-mono">
                {summary.selfHealingRatePercentage}% AI Resilience Score
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
              <Zap className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row: Shadcn Recharts Bar Chart & Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Execution Results Bar Chart (2 Columns) */}
        <Card className="lg:col-span-2 border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Daily Test Execution Results
                </CardTitle>
                <CardDescription className="text-xs">
                  Automated test runs passed vs failed over the last 7 days.
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                Shadcn Chart
              </Badge>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-6">
            <ChartContainer config={executionChartConfig} className="h-64 w-full">
              <BarChart data={formattedDailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                <XAxis
                  dataKey="formattedDate"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs font-mono"
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-xs font-mono" />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Bar dataKey="passed" fill="var(--chart-1)" radius={[4, 4, 0, 0]} name="Passed" />
                <Bar dataKey="failed" fill="var(--chart-5)" radius={[4, 4, 0, 0]} name="Failed" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Scenario Health Status Donut Chart (1 Column) */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-primary" />
                  Scenario Health Status
                </CardTitle>
                <CardDescription className="text-xs">
                  Distribution of active test scenarios by operational status.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-6 space-y-4">
            <ChartContainer config={scenarioChartConfig} className="h-48 w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={scenarioDistribution}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={55}
                  outerRadius={75}
                  strokeWidth={2}
                  stroke="var(--card)"
                >
                  {scenarioDistribution.map((entry) => (
                    <Cell key={entry.status} fill={PIE_COLORS[entry.status]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            {/* Legend & Breakdown list */}
            <div className="space-y-2 pt-2 border-t border-border">
              {scenarioDistribution.map((item) => (
                <div key={item.status} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[item.status] }}
                    />
                    {item.label}
                  </span>
                  <span className="font-mono text-muted-foreground font-semibold">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Recent Test Executions Table */}
      <Card className="border-border bg-card w-full shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Recent Test Executions
              </CardTitle>
              <CardDescription className="text-xs">
                Latest test scenario executions across all active projects.
              </CardDescription>
            </div>
            <Link
              href="/dashboard/projects"
              className="inline-flex items-center justify-center rounded-md font-semibold text-xs h-8 px-3 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground gap-1 transition-colors"
            >
              All Projects <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {recentExecutions.length > 0 ? (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs uppercase font-semibold text-muted-foreground">
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Scenario / Target</th>
                    <th className="py-3 px-4">Trigger</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Steps Breakdown</th>
                    <th className="py-3 px-4">Executed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentExecutions.map((exec) => (
                    <tr key={exec.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {exec.projectName}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-medium">
                        {exec.scenarioTitle || exec.workflowTitle || "Full Test Suite"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[11px] font-mono uppercase bg-muted/50">
                          {exec.triggerType}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {exec.status === "PASSED" && (
                          <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold text-xs gap-1">
                            <CheckCircle2 className="h-3 w-3" /> PASSED
                          </Badge>
                        )}
                        {exec.status === "FAILED" && (
                          <Badge className="bg-destructive/10 text-destructive border border-destructive/20 font-semibold text-xs gap-1">
                            <XCircle className="h-3 w-3" /> FAILED
                          </Badge>
                        )}
                        {exec.status === "RUNNING" && (
                          <Badge className="bg-sky-500/10 text-sky-500 border border-sky-500/20 font-semibold text-xs gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" /> RUNNING
                          </Badge>
                        )}
                        {exec.status === "PENDING" && (
                          <Badge variant="secondary" className="font-semibold text-xs gap-1">
                            <Clock className="h-3 w-3" /> PENDING
                          </Badge>
                        )}
                        {exec.status === "CANCELLED" && (
                          <Badge variant="outline" className="font-semibold text-xs">
                            CANCELLED
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                        {exec.durationMs ? `${(exec.durationMs / 1000).toFixed(1)}s` : "—"}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        <span className="text-emerald-500 font-bold">{exec.passedSteps}</span>
                        <span className="text-muted-foreground"> / {exec.totalSteps}</span>
                        {exec.healedSteps > 0 && (
                          <span className="ml-2 text-amber-500 text-[11px] font-semibold">
                            ({exec.healedSteps} Healed)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                        {new Date(exec.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center space-y-2 text-muted-foreground">
              <PlayCircle className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <p className="text-sm font-medium">No test executions recorded yet.</p>
              <p className="text-xs">Create a test scenario in Playwright Studio to run automated test executions.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
