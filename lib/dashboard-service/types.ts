// ==========================================
// Dashboard Service TypeScript Models
// ==========================================

export interface KpiMetric {
  title: string;
  value: number | string;
  changeText?: string;
  changeType?: "positive" | "negative" | "neutral";
  description: string;
}

export interface DailyExecutionTrend {
  date: string;
  passed: number;
  failed: number;
  total: number;
}

export interface ScenarioStatusDistribution {
  status: "READY" | "DRAFT" | "DEPRECATED";
  label: string;
  count: number;
  percentage: number;
}

export interface RecentExecutionItem {
  id: string;
  projectId: string;
  projectName: string;
  scenarioId: string | null;
  scenarioTitle: string | null;
  workflowId: string | null;
  workflowTitle: string | null;
  triggerType: "MANUAL" | "SCHEDULED" | "CI_CD" | "WEBHOOK";
  status: "PENDING" | "RUNNING" | "PASSED" | "FAILED" | "CANCELLED";
  durationMs: number | null;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  healedSteps: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ProjectSummaryItem {
  id: string;
  name: string;
  ownershipType: "PERSONAL" | "COMPANY";
  scenarioCount: number;
  executionCount: number;
  lastExecutionStatus: "PENDING" | "RUNNING" | "PASSED" | "FAILED" | "CANCELLED" | null;
}

export interface DashboardOverviewResponse {
  workspaceType: "PERSONAL" | "ORGANIZATION";
  organizationName: string | null;
  summary: {
    totalProjects: number;
    personalProjects: number;
    orgProjects: number;
    totalScenarios: number;
    totalWorkflows: number;
    totalExecutions: number;
    passedExecutions: number;
    failedExecutions: number;
    runningExecutions: number;
    passRatePercentage: number;
    totalStepsExecuted: number;
    passedSteps: number;
    failedSteps: number;
    healedSteps: number;
    selfHealingRatePercentage: number;
  };
  dailyTrends: DailyExecutionTrend[];
  scenarioDistribution: ScenarioStatusDistribution[];
  recentExecutions: RecentExecutionItem[];
  topProjects: ProjectSummaryItem[];
}
