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
