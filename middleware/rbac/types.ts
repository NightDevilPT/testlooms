import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { PermissionKey, RbacContext } from "@/lib/rbac-service/types";
import { RouteHandlerContext } from "../types";

export interface RbacOptions<T = Record<string, string>> {
  permissionKey: PermissionKey;
  getRole?: (
    request: NextRequest | Request,
    context?: RouteHandlerContext<T>
  ) => UserRole | undefined | Promise<UserRole | undefined>;
  getContext?: (
    request: NextRequest | Request,
    context?: RouteHandlerContext<T>
  ) => RbacContext | undefined | Promise<RbacContext | undefined>;
}
