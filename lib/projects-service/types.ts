import { OwnershipType } from "@prisma/client";
import { PaginationInfo } from "@/lib/response-service/types";
import { EnvironmentVariableEntry, EnvironmentEntryType } from "./crypto";

export type { EnvironmentVariableEntry, EnvironmentEntryType };

/** Entry types selectable in the environment UI, with labels and key hints. */
export const ENVIRONMENT_ENTRY_TYPE_OPTIONS: {
  value: EnvironmentEntryType;
  label: string;
  keyPlaceholder: string;
  valuePlaceholder: string;
  hint: string;
}[] = [
  {
    value: "variable",
    label: "Variable",
    keyPlaceholder: "e.g. TEST_USER_EMAIL",
    valuePlaceholder: "e.g. qa@example.com",
    hint: "Use in steps as {{env.KEY}}.",
  },
  {
    value: "header",
    label: "HTTP Header",
    keyPlaceholder: "e.g. Authorization",
    valuePlaceholder: "e.g. Bearer eyJhbGciOi...",
    hint: "Sent with every request to your project site (and its subdomains) only, never to third-party sites.",
  },
  {
    value: "cookie",
    label: "Cookie",
    keyPlaceholder: "e.g. access_token",
    valuePlaceholder: "e.g. session cookie value",
    hint: "Set as a cookie for your project site before the first step, so the browser starts logged in.",
  },
  {
    value: "localStorage",
    label: "Local Storage",
    keyPlaceholder: "e.g. token",
    valuePlaceholder: "e.g. eyJhbGciOi...",
    hint: "Written to your site localStorage before any page script runs. Key is case-sensitive.",
  },
];

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

export interface ProjectMetrics {
  totalProjects: number;
  personalProjects: number;
  companyProjects: number;
  totalScenarios: number;
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
