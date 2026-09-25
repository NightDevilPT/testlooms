import { UserRole } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import {
  PermissionDefinition,
  PermissionKey,
  RbacCheckResult,
  RbacContext,
  RbacPermission,
  ROLE_HIERARCHY,
} from "./types";

export class RbacService {
  /**
   * Dynamic Permission Registry storing all system permissions.
   */
  private static registry: Map<string, PermissionDefinition> = new Map();

  static {
    // Initialize default core domain permissions into registry
    this.registerDefaults();
  }

  /**
   * Look up a user's role inside a specific organization
   */
  public static async getUserRoleInOrganization(
    userId: string,
    organizationId: string
  ): Promise<UserRole | null> {
    try {
      const member = await prisma.organizationMember.findFirst({
        where: {
          organizationId,
          userId,
          deletedAt: null,
        },
      });
      return member ? member.role : null;
    } catch {
      return null;
    }
  }

  /**
   * Dynamically register a new permission definition into the system.
   */
  public static registerPermission(definition: PermissionDefinition): void {
    this.registry.set(definition.key, definition);
  }

  /**
   * Bulk register multiple permission definitions
   */
  public static registerPermissions(
    definitions: PermissionDefinition[]
  ): void {
    definitions.forEach((def) => this.registerPermission(def));
  }

  /**
   * Retrieves a permission definition by key
   */
  public static getPermission(
    key: PermissionKey
  ): PermissionDefinition | undefined {
    return this.registry.get(key);
  }

  /**
   * Evaluates if a role (+ optional context) has permission for a given key.
   * Usage: RbacService.isAllowed(userRole, RbacPermission.EXECUTION_TRIGGER);
   */
  public static isAllowed(
    role: UserRole,
    permissionKey: PermissionKey,
    context?: RbacContext
  ): boolean {
    const perm = this.registry.get(permissionKey);
    if (!perm) {
      // Unknown permission key defaults to false for security
      return false;
    }

    // 1. Check custom ABAC evaluator if present
    if (perm.customEvaluator) {
      return perm.customEvaluator(role, context);
    }

    // 2. Check explicit allowed roles if defined
    if (perm.allowedRoles && perm.allowedRoles.length > 0) {
      return perm.allowedRoles.includes(role);
    }

    // 3. Fallback to hierarchical role level check
    if (perm.minRole) {
      const userLevel = ROLE_HIERARCHY[role] ?? 0;
      const minLevel = ROLE_HIERARCHY[perm.minRole] ?? 100;
      return userLevel >= minLevel;
    }

    return false;
  }

  /**
   * Performs an RBAC/ABAC check and returns a detailed result object
   */
  public static checkPermission(
    role: UserRole,
    permissionKey: PermissionKey,
    context?: RbacContext
  ): RbacCheckResult {
    const allowed = this.isAllowed(role, permissionKey, context);
    if (!allowed) {
      return {
        allowed: false,
        role,
        permissionKey,
        reason: `Role '${role}' lacks permission for '${permissionKey}'.`,
      };
    }

    return {
      allowed: true,
      role,
      permissionKey,
    };
  }

  /**
   * Asserts permission, throwing an error if access is denied
   * Usage: RbacService.assertPermission(userRole, RbacPermission.SCENARIO_RECORD);
   */
  public static assertPermission(
    role: UserRole,
    permissionKey: PermissionKey,
    context?: RbacContext
  ): void {
    const result = this.checkPermission(role, permissionKey, context);
    if (!result.allowed) {
      throw new Error(result.reason);
    }
  }

  /**
   * Register default domain permissions using strongly-typed RbacPermission enum
   */
  private static registerDefaults(): void {
    const defaults: PermissionDefinition[] = [
      // Organization Administration
      {
        key: RbacPermission.ORG_MEMBERS_MANAGE,
        description: "Manage org members and roles",
        minRole: UserRole.ADMIN,
      },
      {
        key: RbacPermission.ORG_PROFILE_UPDATE,
        description: "Update company profile",
        minRole: UserRole.ADMIN,
      },

      // Project Administration
      {
        key: RbacPermission.PROJECT_CREATE,
        description: "Create new projects",
        minRole: UserRole.ADMIN,
      },
      {
        key: RbacPermission.PROJECT_DELETE,
        description: "Delete projects",
        minRole: UserRole.ADMIN,
      },
      {
        key: RbacPermission.PROJECT_CONFIG,
        description: "Configure base URL and viewports",
        minRole: UserRole.ADMIN,
      },

      // Studio Recording & Scenarios
      {
        key: RbacPermission.SCENARIO_RECORD,
        description: "Launch Studio Canvas & record steps",
        minRole: UserRole.QA_ENGINEER,
      },
      {
        key: RbacPermission.SCENARIO_EDIT,
        description: "Edit step locators & assertions",
        minRole: UserRole.QA_ENGINEER,
      },
      {
        key: RbacPermission.SCENARIO_DELETE,
        description: "Delete scenario or steps",
        minRole: UserRole.QA_ENGINEER,
      },
      {
        key: RbacPermission.WORKFLOW_MANAGE,
        description: "Create & reorder workflow suites",
        minRole: UserRole.QA_ENGINEER,
      },

      // Executions & Reporting
      {
        key: RbacPermission.EXECUTION_TRIGGER,
        description: "Trigger test replays",
        minRole: UserRole.VIEWER,
      },
      {
        key: RbacPermission.EXECUTION_VIEW,
        description: "View execution logs & screenshots",
        minRole: UserRole.VIEWER,
      },
      {
        key: RbacPermission.CODE_EXPORT,
        description: "Export automation code scripts",
        minRole: UserRole.VIEWER,
      },
    ];

    this.registerPermissions(defaults);
  }
}

export default RbacService;
