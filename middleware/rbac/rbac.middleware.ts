import { NextResponse, NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import AuthService from "@/lib/auth-service/auth.service";
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
 * Verifies authenticated session, resolves organization role, and guards against PermissionKey matrix.
 *
 * Example Usage:
 * export const POST = rbacMiddleware(async (request, context) => {
 *   return ResponseService.ok({ data: "Project Created" });
 * }, { permissionKey: PermissionKey.PROJECT_CREATE });
 */
export function rbacMiddleware<T = Record<string, string>>(
  handler: RouteHandler<T>,
  options: RbacOptions<T>
): RouteHandler<T> {
  return async (request: NextRequest | Request, context?: RouteHandlerContext<T>) => {
    try {
      let role: UserRole | undefined = undefined;

      if (options.getRole) {
        role = await options.getRole(request, context);
      } else {
        // Automatically resolve userId & role from auth session cookie
        const userIdHeader = request.headers.get("x-user-id");
        let userId = userIdHeader || undefined;

        if (!userId) {
          const accessToken = await AuthService.getAuthCookie();
          const { payload, errorResponse } = await AuthService.verifySession(
            accessToken,
            request
          );

          if (errorResponse || !payload) {
            return errorResponse || ResponseService.unauthorized("Authentication required.", request);
          }
          userId = payload.userId;
        }

        // Fetch user role if organization context is provided or resolve default
        let rbacContext: RbacContext | undefined = undefined;
        if (options.getContext) {
          rbacContext = await options.getContext(request, context);
        }

        if (rbacContext?.organizationId) {
          role = (await RbacService.getUserRoleInOrganization(
            userId,
            rbacContext.organizationId
          )) || undefined;
        } else {
          // Default role for authenticated user personal workspace
          role = UserRole.ADMIN;
        }
      }

      if (!role) {
        return ResponseService.forbidden(
          "Insufficient permissions to perform this action in the target organization.",
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
    } catch (error: unknown) {
      return ResponseService.handleError(error, request);
    }
  };
}

export default rbacMiddleware;
