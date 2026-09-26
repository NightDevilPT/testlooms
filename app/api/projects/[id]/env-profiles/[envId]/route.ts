import { NextRequest } from "next/server";
import { ProjectsService } from "@/lib/projects-service/projects.service";
import { updateEnvProfileSchema } from "@/lib/projects-service/validation";
import ResponseService from "@/lib/response-service/response.service";
import { HttpStatus } from "@/lib/response-service/types";
import { RbacPermission } from "@/lib/rbac-service/types";
import authMiddleware from "@/middleware/auth/auth.middleware";
import rateLimitMiddleware from "@/middleware/rate-limit/rate-limit.middleware";
import idempotencyMiddleware from "@/middleware/idempotency/idempotency.middleware";
import rbacMiddleware from "@/middleware/rbac/rbac.middleware";
import { RouteHandlerContext } from "@/middleware/types";

interface Params {
	id: string;
	envId: string;
}

/**
 * PATCH /api/projects/:id/env-profiles/:envId
 */
export const PATCH = rateLimitMiddleware(
	idempotencyMiddleware(
		authMiddleware(
			rbacMiddleware(
				async (
					request: NextRequest | Request,
					context?: RouteHandlerContext<Params>,
				) => {
					const userId = request.headers.get("x-user-id");
					if (!userId) {
						return ResponseService.unauthorized(
							"Authentication required",
							request,
						);
					}

					const params = await context?.params;
					const projectId = params?.id;
					const envId = params?.envId;

					if (!projectId || !envId) {
						return ResponseService.badRequest(
							"Missing parameters",
							request,
						);
					}

					let body: unknown;
					try {
						body = await request.json();
					} catch {
						return ResponseService.badRequest(
							"Invalid JSON payload",
							request,
						);
					}

					const validation = updateEnvProfileSchema.safeParse(body);
					if (!validation.success) {
						return ResponseService.badRequest(
							validation.error.issues[0]?.message ||
								"Invalid payload",
							request,
						);
					}

					const updated = await ProjectsService.updateEnvProfile(
						envId,
						projectId,
						userId,
						validation.data,
					);

					if (!updated) {
						return ResponseService.notFound(
							"Environment profile not found",
							request,
						);
					}

					return ResponseService.ok(updated, HttpStatus.OK, request);
				},
				{ permissionKey: RbacPermission.PROJECT_CONFIG },
			),
		),
		{ getUserId: (req) => req.headers.get("x-user-id") || undefined },
	),
	{ maxRequests: 30, windowSeconds: 60, keyPrefix: "rl:env-profile:update" },
);

/**
 * DELETE /api/projects/:id/env-profiles/:envId
 */
export const DELETE = rateLimitMiddleware(
	authMiddleware(
		rbacMiddleware(
			async (
				request: NextRequest | Request,
				context?: RouteHandlerContext<Params>,
			) => {
				const userId = request.headers.get("x-user-id");
				if (!userId) {
					return ResponseService.unauthorized(
						"Authentication required",
						request,
					);
				}

				const params = await context?.params;
				const projectId = params?.id;
				const envId = params?.envId;

				if (!projectId || !envId) {
					return ResponseService.badRequest(
						"Missing parameters",
						request,
					);
				}

				const success = await ProjectsService.deleteEnvProfile(
					envId,
					projectId,
					userId,
				);
				if (!success) {
					return ResponseService.notFound(
						"Environment profile not found or accessible",
						request,
					);
				}

				return ResponseService.ok(
					{ deleted: true, envId },
					HttpStatus.OK,
					request,
				);
			},
			{ permissionKey: RbacPermission.PROJECT_CONFIG },
		),
	),
	{ maxRequests: 20, windowSeconds: 60, keyPrefix: "rl:env-profile:delete" },
);
