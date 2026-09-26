import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ResponseService } from "@/lib/response-service/response.service";
import { IdempotencyCheckResult, generateIdempotencyKey } from "./types";
import { logger } from "@/lib/logger-service/logger.service";

const MUTATING_METHODS = ["POST", "PUT", "DELETE", "PATCH"];
const DEFAULT_TTL_HOURS = 24;

export class IdempotencyService {
	/**
	 * Checks if an idempotency key exists for state-mutating HTTP requests.
	 * - If completed & not expired: Returns cached response.
	 * - If in-progress & locked: Returns HTTP 409 Conflict.
	 * - If new: Creates a locked pending record.
	 */
	public static async check(
		request: Request,
		userId?: string,
	): Promise<IdempotencyCheckResult> {
		const method = request.method.toUpperCase();

		if (!MUTATING_METHODS.includes(method)) {
			return { idempotencyKey: null, cachedResponse: null };
		}

		const idempotencyKey = request.headers.get("idempotency-key");
		if (!idempotencyKey) {
			return { idempotencyKey: null, cachedResponse: null };
		}

		const now = new Date();

		const existingRecord = await prisma.idempotencyRecord.findUnique({
			where: { idempotencyKey },
		});

		if (existingRecord) {
			// 1. Return cached response if request already completed and key is valid
			if (existingRecord.completedAt && existingRecord.expiresAt > now) {
				const statusCode = existingRecord.responseStatusCode ?? 200;
				const body = (existingRecord.responseBody ?? {}) as Record<
					string,
					unknown
				>;

				return {
					idempotencyKey,
					cachedResponse: NextResponse.json(body, {
						status: statusCode,
					}),
				};
			}

			// 2. Reject concurrent duplicate request if lock is currently active
			if (!existingRecord.completedAt && existingRecord.expiresAt > now) {
				return {
					idempotencyKey,
					cachedResponse: ResponseService.conflict(
						"A request with this Idempotency-Key is currently in progress.",
						request,
					),
				};
			}
		}

		// 3. Lock new idempotency record with 24-hour expiration
		const expiresAt = new Date();
		expiresAt.setHours(expiresAt.getHours() + DEFAULT_TTL_HOURS);

		const url = new URL(request.url);

		await prisma.idempotencyRecord.upsert({
			where: { idempotencyKey },
			update: {
				lockedAt: now,
				expiresAt,
			},
			create: {
				idempotencyKey,
				userId: userId ?? null,
				requestPath: url.pathname,
				lockedAt: now,
				expiresAt,
			},
		});

		return { idempotencyKey, cachedResponse: null };
	}

	/**
	 * Stores completed API response status and body in idempotency record.
	 */
	public static async save(
		idempotencyKey: string | null,
		statusCode: number,
		responseBody: unknown,
	): Promise<void> {
		if (!idempotencyKey) return;

		try {
			const jsonBody = (responseBody ?? {}) as Prisma.InputJsonValue;

			await prisma.idempotencyRecord.update({
				where: { idempotencyKey },
				data: {
					responseStatusCode: statusCode,
					responseBody: jsonBody,
					completedAt: new Date(),
				},
			});
		} catch (err) {
			logger.error("Failed to save record", "IdempotencyService", err);
		}
	}

	/**
	 * Releases an idempotency lock if request processing failed catastrophically,
	 * allowing client to safely retry.
	 */
	public static async release(idempotencyKey: string | null): Promise<void> {
		if (!idempotencyKey) return;

		try {
			await prisma.idempotencyRecord.deleteMany({
				where: {
					idempotencyKey,
					completedAt: null, // Only release if not completed
				},
			});
		} catch (err) {
			logger.error("Failed to release lock", "IdempotencyService", err);
		}
	}

	/**
	 * Purges expired idempotency records (maintenance job helper).
	 */
	public static async purgeExpired(): Promise<number> {
		try {
			const result = await prisma.idempotencyRecord.deleteMany({
				where: {
					expiresAt: {
						lt: new Date(),
					},
				},
			});
			return result.count;
		} catch (err) {
			logger.error(
				"Failed to purge expired records",
				"IdempotencyService",
				err,
			);
			return 0;
		}
	}

  public static generateKey(prefix: string = "idemp"): string {
    return generateIdempotencyKey(prefix);
  }
}

export { generateIdempotencyKey } from "./types";
