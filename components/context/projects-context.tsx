"use client";

import * as React from "react";
import apiClient from "@/lib/api-client/api-client.service";
import {
  ProjectItem,
  CreateProjectInput,
  UpdateProjectInput,
  PingUrlResult,
} from "@/lib/projects-service/types";
import { FailureEnvelope } from "@/lib/response-service/types";

interface ProjectsContextType {
  projects: ProjectItem[];
  activeProject: ProjectItem | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  ownershipFilter: "ALL" | "PERSONAL" | "COMPANY";
  page: number;
  totalPages: number;
  totalItems: number;
  setActiveProject: (project: ProjectItem | null) => void;
  setSearchQuery: (query: string) => void;
  setOwnershipFilter: (filter: "ALL" | "PERSONAL" | "COMPANY") => void;
  setPage: (page: number) => void;
  fetchProjects: () => Promise<void>;
  createProject: (
    input: CreateProjectInput,
    idempotencyKey?: string
  ) => Promise<{ success: boolean; data?: ProjectItem; error?: string }>;
  updateProject: (
    id: string,
    input: UpdateProjectInput,
    idempotencyKey?: string
  ) => Promise<{ success: boolean; data?: ProjectItem; error?: string }>;
  deleteProject: (id: string) => Promise<{ success: boolean; error?: string }>;
  pingUrl: (url: string) => Promise<PingUrlResult>;
}

const ProjectsContext = React.createContext<ProjectsContextType | undefined>(undefined);

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = React.useState<ProjectItem[]>([]);
  const [activeProject, setActiveProject] = React.useState<ProjectItem | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [ownershipFilter, setOwnershipFilter] = React.useState<"ALL" | "PERSONAL" | "COMPANY">("ALL");
  const [page, setPage] = React.useState<number>(1);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [totalItems, setTotalItems] = React.useState<number>(0);

  const fetchProjects = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<ProjectItem[]>("/api/projects", {
        params: {
          search: searchQuery || undefined,
          ownership: ownershipFilter,
          page,
          pageSize: 12,
        },
      });

      if (response.success && Array.isArray(response.data)) {
        setProjects(response.data as ProjectItem[]);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
          setTotalItems(response.pagination.totalItems);
        }
      } else {
        const failure = response as FailureEnvelope;
        const errMsg = failure.error?.message || "Failed to load projects";
        setError(errMsg);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect to projects service";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, ownershipFilter, page]);

  React.useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = async (input: CreateProjectInput, idempotencyKey?: string) => {
    try {
      const response = await apiClient.post<ProjectItem>("/api/projects", input, {
        idempotencyKey,
      });

      if (response.success && response.data) {
        await fetchProjects();
        return { success: true, data: response.data as ProjectItem };
      } else {
        const failure = response as FailureEnvelope;
        return { success: false, error: failure.error?.message || "Could not create project" };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      return { success: false, error: message };
    }
  };

  const updateProject = async (
    id: string,
    input: UpdateProjectInput,
    idempotencyKey?: string
  ) => {
    try {
      const response = await apiClient.patch<ProjectItem>(`/api/projects/${id}`, input, {
        idempotencyKey,
      });

      if (response.success && response.data) {
        await fetchProjects();
        if (activeProject?.id === id) {
          setActiveProject(response.data as ProjectItem);
        }
        return { success: true, data: response.data as ProjectItem };
      } else {
        const failure = response as FailureEnvelope;
        return { success: false, error: failure.error?.message || "Could not update project" };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      return { success: false, error: message };
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const response = await apiClient.delete(`/api/projects/${id}`);
      if (response.success) {
        await fetchProjects();
        if (activeProject?.id === id) {
          setActiveProject(null);
        }
        return { success: true };
      } else {
        const failure = response as FailureEnvelope;
        return { success: false, error: failure.error?.message || "Could not delete project" };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete project";
      return { success: false, error: message };
    }
  };

  const pingUrl = async (url: string): Promise<PingUrlResult> => {
    try {
      const response = await apiClient.post<PingUrlResult>("/api/projects/ping", { url });
      if (response.success && response.data) {
        return response.data as PingUrlResult;
      }
      const failure = response as FailureEnvelope;
      return {
        url,
        isReachable: false,
        error: failure.error?.message || "Target server unreachable",
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ping error";
      return {
        url,
        isReachable: false,
        error: message,
      };
    }
  };

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        activeProject,
        isLoading,
        error,
        searchQuery,
        ownershipFilter,
        page,
        totalPages,
        totalItems,
        setActiveProject,
        setSearchQuery,
        setOwnershipFilter,
        setPage,
        fetchProjects,
        createProject,
        updateProject,
        deleteProject,
        pingUrl,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const context = React.useContext(ProjectsContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectsProvider");
  }
  return context;
}
