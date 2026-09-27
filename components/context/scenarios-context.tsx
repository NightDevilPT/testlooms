"use client";

import * as React from "react";
import apiClient from "@/lib/api-client/api-client.service";
import { generateIdempotencyKey } from "@/lib/idempotency-service/types";
import {
  TestScenarioWithSteps,
  CreateScenarioPayload,
  UpdateScenarioPayload,
  RecordedStep,
  ScenarioMetrics,
} from "@/lib/scenarios-service/types";
import { FailureEnvelope } from "@/lib/response-service/types";

interface ScenariosContextType {
  scenarios: TestScenarioWithSteps[];
  loadedScenario: TestScenarioWithSteps | null;
  metrics: ScenarioMetrics | null;
  isLoading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalItems: number;
  setPage: (page: number) => void;
  setLoadedScenario: React.Dispatch<React.SetStateAction<TestScenarioWithSteps | null>>;
  fetchAllScenarios: (params?: {
    projectId?: string;
    status?: string;
    search?: string;
    tag?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
  }) => Promise<TestScenarioWithSteps[]>;
  fetchScenarioById: (projectId: string, scenarioId: string) => Promise<TestScenarioWithSteps | null>;
  createScenario: (
    projectId: string,
    payload: CreateScenarioPayload,
    idempotencyKey?: string
  ) => Promise<{ success: boolean; data?: TestScenarioWithSteps; error?: string }>;
  updateScenario: (
    projectId: string,
    scenarioId: string,
    payload: UpdateScenarioPayload,
    idempotencyKey?: string
  ) => Promise<{ success: boolean; data?: TestScenarioWithSteps; error?: string }>;
  deleteScenario: (
    projectId: string,
    scenarioId: string
  ) => Promise<{ success: boolean; error?: string }>;
  saveScenarioSteps: (
    projectId: string,
    scenarioId: string,
    steps: RecordedStep[],
    idempotencyKey?: string
  ) => Promise<{ success: boolean; error?: string }>;
  listSteps: (
    projectId: string,
    scenarioId: string
  ) => Promise<{ success: boolean; data?: RecordedStep[]; error?: string }>;
  updateStep: (
    projectId: string,
    scenarioId: string,
    stepId: string,
    payload: Partial<RecordedStep>,
    idempotencyKey?: string
  ) => Promise<{ success: boolean; data?: RecordedStep; error?: string }>;
  deleteStep: (
    projectId: string,
    scenarioId: string,
    stepId: string
  ) => Promise<{ success: boolean; error?: string }>;
  runScenario: (
    projectId: string,
    scenarioId: string
  ) => Promise<{ success: boolean; data?: any; error?: string }>;
  reorderSteps: (
    projectId: string,
    scenarioId: string,
    orders: Array<{ stepId: string; stepOrder: number }>,
    idempotencyKey?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

const ScenariosContext = React.createContext<ScenariosContextType | undefined>(undefined);

export function ScenariosProvider({ children }: { children: React.ReactNode }) {
  const [scenarios, setScenarios] = React.useState<TestScenarioWithSteps[]>([]);
  const [loadedScenario, setLoadedScenario] = React.useState<TestScenarioWithSteps | null>(null);
  const [metrics, setMetrics] = React.useState<ScenarioMetrics | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState<number>(1);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [totalItems, setTotalItems] = React.useState<number>(0);

  const runScenario = async (projectId: string, scenarioId: string) => {
    try {
      const response = await apiClient.post(
        `/api/projects/${projectId}/scenarios/${scenarioId}/run`
      );
      if (response.success && response.data) {
        return { success: true, data: response.data };
      } else {
        const failure = response as FailureEnvelope;
        return { success: false, error: failure.error?.message || "Failed to execute scenario" };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Execution failed";
      return { success: false, error: msg };
    }
  };

  const fetchAllScenarios = React.useCallback(
    async (params?: {
      projectId?: string;
      status?: string;
      search?: string;
      tag?: string;
      page?: number;
      pageSize?: number;
      sortBy?: string;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<TestScenarioWithSteps[]>("/api/scenarios", {
          params,
        });
        if (response.success && Array.isArray(response.data)) {
          const list = response.data as TestScenarioWithSteps[];
          setScenarios(list);
          if (response.pagination) {
            setTotalPages(response.pagination.totalPages);
            setTotalItems(response.pagination.totalItems);
          } else {
            setTotalItems(list.length);
            setTotalPages(1);
          }
          if ("metrics" in response && response.metrics) {
            setMetrics(response.metrics as unknown as ScenarioMetrics);
          }
          return list;
        }
        return [];
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to fetch scenarios";
        setError(msg);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchScenarioById = React.useCallback(async (projectId: string, scenarioId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<TestScenarioWithSteps>(
        `/api/projects/${projectId}/scenarios/${scenarioId}`
      );
      if (response.success && response.data && !Array.isArray(response.data)) {
        const data = response.data as TestScenarioWithSteps;
        setLoadedScenario(data);
        return data;
      }
      return null;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch scenario";
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createScenario = async (
    projectId: string,
    payload: CreateScenarioPayload,
    idempotencyKey?: string
  ) => {
    const key = idempotencyKey || generateIdempotencyKey("create_scenario");
    try {
      const response = await apiClient.post<TestScenarioWithSteps>(
        `/api/projects/${projectId}/scenarios`,
        payload,
        { idempotencyKey: key }
      );
      if (response.success && response.data && !Array.isArray(response.data)) {
        const newScenario = response.data as TestScenarioWithSteps;
        setScenarios((prev) => [newScenario, ...prev]);
        return { success: true, data: newScenario };
      } else {
        const failure = response as FailureEnvelope;
        return { success: false, error: failure.error?.message || "Could not create scenario" };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      return { success: false, error: msg };
    }
  };

  const updateScenario = async (
    projectId: string,
    scenarioId: string,
    payload: UpdateScenarioPayload,
    idempotencyKey?: string
  ) => {
    const key = idempotencyKey || generateIdempotencyKey("update_scenario");
    try {
      const response = await apiClient.patch<TestScenarioWithSteps>(
        `/api/projects/${projectId}/scenarios/${scenarioId}`,
        payload,
        { idempotencyKey: key }
      );
      if (response.success && response.data && !Array.isArray(response.data)) {
        const updated = response.data as TestScenarioWithSteps;
        if (loadedScenario?.id === scenarioId) {
          setLoadedScenario(updated);
        }
        setScenarios((prev) => prev.map((s) => (s.id === scenarioId ? updated : s)));
        return { success: true, data: updated };
      } else {
        const failure = response as FailureEnvelope;
        return { success: false, error: failure.error?.message || "Could not update scenario" };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      return { success: false, error: msg };
    }
  };

  const deleteScenario = async (projectId: string, scenarioId: string) => {
    try {
      const response = await apiClient.delete(`/api/projects/${projectId}/scenarios/${scenarioId}`);
      if (response.success) {
        setScenarios((prev) => prev.filter((s) => s.id !== scenarioId));
        if (loadedScenario?.id === scenarioId) {
          setLoadedScenario(null);
        }
        return { success: true };
      } else {
        const failure = response as FailureEnvelope;
        return { success: false, error: failure.error?.message || "Could not delete scenario" };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete scenario";
      return { success: false, error: msg };
    }
  };

  const saveScenarioSteps = async (
    projectId: string,
    scenarioId: string,
    steps: RecordedStep[],
    idempotencyKey?: string
  ) => {
    const key = idempotencyKey || generateIdempotencyKey("save_scenario_steps");
    try {
      const response = await apiClient.post(
        `/api/projects/${projectId}/scenarios/${scenarioId}/steps`,
        { steps },
        { idempotencyKey: key }
      );
      if (response.success) {
        return { success: true };
      } else {
        const failure = response as FailureEnvelope;
        return { success: false, error: failure.error?.message || "Failed to update test steps" };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      return { success: false, error: msg };
    }
  };

  const listSteps = async (projectId: string, scenarioId: string) => {
    try {
      const response = await apiClient.get<RecordedStep[]>(
        `/api/projects/${projectId}/scenarios/${scenarioId}/steps`
      );
      if (response.success && response.data && Array.isArray(response.data)) {
        return { success: true, data: response.data as RecordedStep[] };
      } else {
        const failure = response as FailureEnvelope;
        return { success: false, error: failure.error?.message || "Failed to list test steps" };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to list test steps";
      return { success: false, error: msg };
    }
  };

  const updateStep = async (
    projectId: string,
    scenarioId: string,
    stepId: string,
    payload: Partial<RecordedStep>,
    idempotencyKey?: string
  ) => {
    const key = idempotencyKey || generateIdempotencyKey("update_step");
    try {
      const response = await apiClient.patch<RecordedStep>(
        `/api/projects/${projectId}/scenarios/${scenarioId}/steps/${stepId}`,
        payload,
        { idempotencyKey: key }
      );
      if (response.success && response.data && !Array.isArray(response.data)) {
        return { success: true, data: response.data as RecordedStep };
      } else {
        const failure = response as FailureEnvelope;
        return { success: false, error: failure.error?.message || "Failed to update test step" };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update test step";
      return { success: false, error: msg };
    }
  };

  const deleteStep = async (projectId: string, scenarioId: string, stepId: string) => {
    try {
      const response = await apiClient.delete(
        `/api/projects/${projectId}/scenarios/${scenarioId}/steps/${stepId}`
      );
      if (response.success) {
        return { success: true };
      } else {
        const failure = response as FailureEnvelope;
        return { success: false, error: failure.error?.message || "Failed to delete test step" };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete test step";
      return { success: false, error: msg };
    }
  };

  const reorderSteps = async (
    projectId: string,
    scenarioId: string,
    orders: Array<{ stepId: string; stepOrder: number }>,
    idempotencyKey?: string
  ) => {
    const key = idempotencyKey || generateIdempotencyKey("reorder_steps");
    try {
      const response = await apiClient.patch(
        `/api/projects/${projectId}/scenarios/${scenarioId}/steps`,
        { orders },
        { idempotencyKey: key }
      );
      if (response.success) {
        return { success: true };
      } else {
        const failure = response as FailureEnvelope;
        return { success: false, error: failure.error?.message || "Failed to reorder test steps" };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reorder test steps";
      return { success: false, error: msg };
    }
  };

  return (
    <ScenariosContext.Provider
      value={{
        scenarios,
        loadedScenario,
        metrics,
        isLoading,
        error,
        page,
        totalPages,
        totalItems,
        setPage,
        setLoadedScenario,
        fetchAllScenarios,
        fetchScenarioById,
        createScenario,
        updateScenario,
        deleteScenario,
        runScenario,
        saveScenarioSteps,
        listSteps,
        updateStep,
        deleteStep,
        reorderSteps,
      }}
    >
      {children}
    </ScenariosContext.Provider>
  );
}

export function useScenarios() {
  const context = React.useContext(ScenariosContext);
  if (!context) {
    throw new Error("useScenarios must be used within a ScenariosProvider");
  }
  return context;
}
