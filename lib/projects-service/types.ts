import { OwnershipType } from "@prisma/client";
import { PaginationInfo } from "@/lib/response-service/types";
import { EnvironmentVariableEntry, EnvironmentEntryType } from "./crypto";

export type { EnvironmentVariableEntry, EnvironmentEntryType };


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

/**
 * Browser session auth derived from header / cookie / localStorage environment entries.
 * Applied by the Playwright service so tests start already authenticated.
 */
export interface SessionAuthConfig {
  /** Origin of the site under test, e.g. https://staging.shop.com ("" if the base URL is invalid) */
  origin: string;
  /** Hostnames (and their subdomains) that may receive the custom headers. */
  allowedHosts: string[];
  headers: Record<string, string>;
  cookies: { name: string; value: string }[];
  localStorage: Record<string, string>;
}

export interface EnvironmentRunContext {
  /** Plain {{env.KEY}} variables only (header/cookie/localStorage entries are excluded). */
  envVariables: Record<string, string>;
  /** Session auth to apply to the browser, or undefined when the profile has none. */
  sessionAuth?: SessionAuthConfig;
  /** Resolved target base URL (BASE_URL / baseUrl override applied). */
  targetBaseUrl: string;
}
