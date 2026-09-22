import { NextResponse, NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { RbacService } from "@/lib/rbac-service/rbac.service";
import { PermissionKey, RbacContext } from "@/lib/rbac-service/types";
import { ResponseService } from "@/lib/response-service/response.service";
import { RouteHandler, RouteHandlerContext } from "../types";
import { RbacOptions } from "./types";

/**
 * Direct check permission helper
 */
export function guardPermission(
  role: UserRole,
  permissionKey: PermissionKey,
  context?: RbacContext,
  request?: NextRequest | Request
): NextResponse | null {
  const result = RbacService.checkPermission(role, permissionKey, context);

  if (!result.allowed) {
    return ResponseService.forbidden(
      result.reason || `Access denied for '${permissionKey}'.`,
      request
    );
  }

  return null;
}

/**
 * RBAC Middleware Wrapper for Next.js Route Handlers.
 * 
 * Example Usage:
 * export const POST = rbacMiddleware(async (request, context) => {
 *   const params = await context?.params;
 *   return ResponseService.ok({ data: "Project Data" });
 * }, { permissionKey: PermissionKey.PROJECT_CREATE });
 */
export function rbacMiddleware<T = Record<string, string>>(
  handler: RouteHandler<T>,
  options: RbacOptions<T>
): RouteHandler<T> {
  return async (request: NextRequest | Request, context?: RouteHandlerContext<T>) => {
    let role: UserRole | undefined = undefined;
    if (options.getRole) {
      role = await options.getRole(request, context);
    }

    if (!role) {
      return ResponseService.unauthorized(
        "Authentication required to access this resource.",
        request
      );
    }

    let rbacContext: RbacContext | undefined = undefined;
    if (options.getContext) {
      rbacContext = await options.getContext(request, context);
    }

    const guardError = guardPermission(
      role,
      options.permissionKey,
      rbacContext,
      request
    );
    if (guardError) return guardError;

    return handler(request, context);
  };
}

export default rbacMiddleware;
