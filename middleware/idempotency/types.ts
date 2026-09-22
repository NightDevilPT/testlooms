import { NextRequest } from "next/server";
import { RouteHandlerContext } from "../types";

export interface IdempotencyOptions<T = Record<string, string>> {
  getUserId?: (
    request: NextRequest | Request,
    context?: RouteHandlerContext<T>
  ) => string | undefined | Promise<string | undefined>;
}
