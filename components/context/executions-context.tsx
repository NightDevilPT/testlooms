"use client";

import * as React from "react";
import apiClient from "@/lib/api-client/api-client.service";
import { FailureEnvelope } from "@/lib/response-service/types";

export interface ExecutionStepResultItem {
  id: string;
  executionId: string;
  stepId?: string | null;
  stepOrder: number;
  actionType: string;
  status: "PASSED" | "FAILED" | "SKIPPED" | "WARNING";
  durationMs?: number | null;
  healedSelector?: string | null;
  healedPriority?: string | null;
  failureReason?: string | null;
  screenshotUrl?: string | null;
  executedAt: string;
  step?: {
    id: string;
    actionType: string;
    primaryKey: string;
    description?: string | null;
  } | null;
}

export interface TestExecutionItem {
  id: string;
  projectId: string;
  scenarioId?: string | null;
  workflowId?: string | null;
  status: "PENDING" | "RUNNING" | "PASSED" | "FAILED" | "CANCELLED";
  triggerType: "MANUAL" | "SCHEDULED" | "CI_CD" | "WEBHOOK";
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  healedSteps: number;
  errorMessage?: string | null;
  videoUrl?: string | null;
  createdAt: string;
  project?: {
    id: string;
    name: string;
    baseUrl: string;
  };
  scenario?: {
    id: string;
    title: string;
    relativeRoute: string;
  } | null;
  workflow?: {
    id: string;
    title: string;
  } | null;
  stepResults?: ExecutionStepResultItem[];
}

export interface ExecutionMetrics {
  totalExecutions: number;
  passedCount: number;
  failedCount: number;
  runningCount: number;
  passRate: number;
}

interface ExecutionsContextType {
  executions: TestExecutionItem[];
  selectedExecution: TestExecutionItem | null;
  metrics: ExecutionMetrics | null;
  isLoading: boolean;
  isDetailLoading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalItems: number;
  setPage: (page: number) => void;
  setSelectedExecution: (execution: TestExecutionItem | null) => void;
  fetchExecutions: (params?: {
    projectId?: string;
    status?: string;
    triggerType?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => Promise<TestExecutionItem[]>;
  fetchExecutionById: (id: string) => Promise<TestExecutionItem | null>;
}

const ExecutionsContext = React.createContext<ExecutionsContextType | undefined>(undefined);

export function ExecutionsProvider({ children }: { children: React.ReactNode }) {
  const [executions, setExecutions] = React.useState<TestExecutionItem[]>([]);
  const [selectedExecution, setSelectedExecution] = React.useState<TestExecutionItem | null>(null);
  const [metrics, setMetrics] = React.useState<ExecutionMetrics | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isDetailLoading, setIsDetailLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState<number>(1);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [totalItems, setTotalItems] = React.useState<number>(0);

  const fetchExecutions = React.useCallback(
    async (params?: {
      projectId?: string;
      status?: string;
      triggerType?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<TestExecutionItem[]>("/api/executions", {
          params,
        });

        if (response.success && Array.isArray(response.data)) {
          const list = response.data as TestExecutionItem[];
          setExecutions(list);
          if (response.pagination) {
            setTotalPages(response.pagination.totalPages);
            setTotalItems(response.pagination.totalItems);
          } else {
            setTotalItems(list.length);
            setTotalPages(1);
          }
          if ("metrics" in response && response.metrics) {
            setMetrics(response.metrics as unknown as ExecutionMetrics);
          }
          return list;
        }
        return [];
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to fetch executions";
        setError(msg);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchExecutionById = React.useCallback(async (id: string) => {
    setIsDetailLoading(true);
    try {
      const response = await apiClient.get<TestExecutionItem>(`/api/executions/${id}`);
      if (response.success && response.data && !Array.isArray(response.data)) {
        const item = response.data as TestExecutionItem;
        setSelectedExecution(item);
        return item;
      }
      return null;
    } catch {
      return null;
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  return (
    <ExecutionsContext.Provider
      value={{
        executions,
        selectedExecution,
        metrics,
        isLoading,
        isDetailLoading,
        error,
        page,
        totalPages,
        totalItems,
        setPage,
        setSelectedExecution,
        fetchExecutions,
        fetchExecutionById,
      }}
    >
      {children}
    </ExecutionsContext.Provider>
  );
}

export function useExecutions() {
  const context = React.useContext(ExecutionsContext);
  if (!context) {
    throw new Error("useExecutions must be used within an ExecutionsProvider");
  }
  return context;
}
