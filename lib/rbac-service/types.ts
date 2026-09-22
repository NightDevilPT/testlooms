import { UserRole } from "@prisma/client";

export type { UserRole };

/**
 * Standard Role Levels for Hierarchical Evaluation
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 100,
  QA_ENGINEER: 50,
  VIEWER: 10,
};

/**
 * Strongly-Typed System Permission Enum
 */
export enum RbacPermission {
  // Organization Administration
  ORG_MEMBERS_MANAGE = "org.members.manage",
  ORG_PROFILE_UPDATE = "org.profile.update",

  // Project Administration
  PROJECT_CREATE = "project.create",
  PROJECT_DELETE = "project.delete",
  PROJECT_CONFIG = "project.config",

  // Studio Recording & Scenarios
  SCENARIO_RECORD = "scenario.record",
  SCENARIO_EDIT = "scenario.edit",
  SCENARIO_DELETE = "scenario.delete",
  WORKFLOW_MANAGE = "workflow.manage",

  // Executions & Reporting
  EXECUTION_TRIGGER = "execution.trigger",
  EXECUTION_VIEW = "execution.view",
  CODE_EXPORT = "code.export",
}

/**
 * Permission Key Type: accepts strongly-typed RbacPermission enum or custom string
 */
export type PermissionKey = RbacPermission | (string & {});

/**
 * Context for dynamic attribute-based access control (ABAC) evaluation
 */
export interface RbacContext {
  userId?: string;
  organizationId?: string;
  projectId?: string;
  resourceOwnerId?: string;
  [key: string]: unknown;
}

/**
 * Dynamic evaluator function for custom permission rules
 */
export type CustomEvaluator = (
  role: UserRole,
  context?: RbacContext
) => boolean;

/**
 * Dynamic Enterprise Permission Definition
 */
export interface PermissionDefinition {
  /** Unique permission key (RbacPermission enum or string) */
  key: PermissionKey;
  /** Human-readable description */
  description: string;
  /** Minimum role level required to execute this action */
  minRole?: UserRole;
  /** Explicit allowed roles overriding hierarchy */
  allowedRoles?: UserRole[];
  /** Optional dynamic rule evaluator for ABAC resource checks */
  customEvaluator?: CustomEvaluator;
}

export interface RbacCheckResult {
  allowed: boolean;
  role: UserRole;
  permissionKey: PermissionKey;
  reason?: string;
}
