import { NextRequest } from "next/server";
import { JwtPayload } from "@/lib/auth-service/types";

export interface AuthenticatedNextRequest extends NextRequest {
  user?: JwtPayload;
}

export interface AuthMiddlewareOptions {
  optional?: boolean;
}
