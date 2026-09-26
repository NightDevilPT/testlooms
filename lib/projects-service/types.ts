import { OwnershipType } from "@prisma/client";
import { PaginationInfo } from "@/lib/response-service/types";
import { EnvironmentVariableEntry } from "./crypto";

export type { EnvironmentVariableEntry };

export interface ProjectItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  ownershipType: OwnershipType;
  userId: string | null;
  organizationId: string | null;
  baseUrl: string;
  defaultViewportWidth: number;
  defaultViewportHeight: number;
  headless: boolean;
  timeoutMs: number;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
  _count?: {
    scenarios?: number;
    workflows?: number;
    executions?: number;
    envProfiles?: number;
  };
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  baseUrl: string;
  ownershipType?: OwnershipType;
  organizationId?: string;
  defaultViewportWidth?: number;
  defaultViewportHeight?: number;
  headless?: boolean;
  timeoutMs?: number;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  baseUrl?: string;
  defaultViewportWidth?: number;
  defaultViewportHeight?: number;
  headless?: boolean;
  timeoutMs?: number;
}

export interface ProjectQueryParams {
  search?: string;
  ownership?: "ALL" | "PERSONAL" | "COMPANY";
  page?: number;
  pageSize?: number;
}

export interface PingUrlInput {
  url: string;
}

export interface PingUrlResult {
  url: string;
  isReachable: boolean;
  statusCode?: number;
  responseTimeMs?: number;
  error?: string;
}

export interface EnvironmentProfileItem {
  id: string;
  projectId: string;
  name: string;
  isDefault: boolean;
  variables: EnvironmentVariableEntry[];
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
}

export interface CreateEnvProfileInput {
  name: string;
  isDefault?: boolean;
  variables?: EnvironmentVariableEntry[];
}

export interface UpdateEnvProfileInput {
  name?: string;
  isDefault?: boolean;
  variables?: EnvironmentVariableEntry[];
}
