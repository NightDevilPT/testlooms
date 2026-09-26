import { NextResponse } from "next/server";

export interface IdempotencyCheckResult {
  idempotencyKey: string | null;
  cachedResponse: NextResponse | null;
}

export interface IdempotencyRecordData {
  id: string;
  userId: string | null;
  idempotencyKey: string;
  requestPath: string;
  requestParamsHash: string | null;
  responseStatusCode: number | null;
  responseBody: unknown | null;
  lockedAt: Date;
  completedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
}

/**
 * Pure browser-safe & server-safe Idempotency Key generator.
 * Does not import database drivers, making it safe for Client Components.
 */
export function generateIdempotencyKey(prefix: string = "idemp"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
