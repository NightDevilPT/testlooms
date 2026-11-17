import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger-service/logger.service";
import { PlaywrightService } from "@/lib/playright-service/playwright.service";
import { ActionLog } from "@/lib/playright-service/types";
import { ProjectsService } from "@/lib/projects-service/projects.service";
import {
	CreateScenarioPayload,
	ExecutionRunSnapshot,
	RecordedStep,
	RunEvent,
	RunListener,
	RunStatus,
	RunStepState,
	ScenarioFilterOptions,
	TestScenarioWithSteps,
	UpdateScenarioPayload,
} from "./types";
import { TestStepInput, UpdateStepInput } from "./validation";
import { resolveDynamicValue } from "@/lib/utils/pattern-generator";

type PrismaScenarioResult = Prisma.TestScenarioGetPayload<{
	include: {
		steps: true;
		project: {
			select: {
				id: true;
				name: true;
				baseUrl: true;
			};
		};
	};
}>;

type PrismaStepItem = Prisma.TestStepGetPayload<{}>;

interface RunState {
	snapshot: ExecutionRunSnapshot;
	userId: string;
	/** false for Studio draft runs: they live in memory only and never touch the database */
	persist: boolean;
	cancelRequested: boolean;
	listeners: Set<RunListener>;
}

// Keep live runs on globalThis so Next.js dev hot reloads do not orphan them
const globalForRuns = globalThis as unknown as {
	__testloom_runs__?: Map<string, RunState>;
};
const activeRuns = globalForRuns.__testloom_runs__ ?? new Map<string, RunState>();
if (process.env.NODE_ENV !== "production") {
	globalForRuns.__testloom_runs__ = activeRuns;
}

/** Maximum browsers running at once on this server (each run launches its own Chromium). */
function getMaxConcurrentRuns(): number {
	const configured = Number(process.env.MAX_CONCURRENT_RUNS);
	return Number.isInteger(configured) && configured > 0 ? configured : 3;
}

/** Runs that passed the capacity check but are not registered in `activeRuns` yet. */
let pendingStarts = 0;

/** Finished runs stay in memory briefly so late viewers still get the last frame. */
const FINISHED_RUN_RETENTION_MS = 10 * 60 * 1000;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Prisma filter: executions of projects the user owns or belongs to via an organization. */
function accessibleExecutionWhere(executionId: string, userId: string): Prisma.TestExecutionWhereInput {
	return {
		id: executionId,
		deletedAt: null,
		project: {
			deletedAt: null,
			OR: [
				{ userId },
				{ organization: { members: { some: { userId, deletedAt: null } } } },
			],
		},
	};
}

function emitRunEvent(state: RunState, event: RunEvent): void {
	state.listeners.forEach((listener) => {
		try {
			listener(event);
		} catch {
			// A broken listener must never stop the run
		}
	});
}

function buildStepEvent(state: RunState, index: number): RunEvent {
	const { snapshot } = state;
	return {
		type: "step",
		index,
		step: snapshot.steps[index],
		passedSteps: snapshot.passedSteps,
		failedSteps: snapshot.failedSteps,
		healedSteps: snapshot.healedSteps,
		currentUrl: snapshot.currentUrl,
		pageTitle: snapshot.pageTitle,
	};
}

export class ScenariosService {
	/**
	 * Create a new Test Scenario (with optional initial steps) in a single transaction
	 */
	static async createScenario(
		payload: CreateScenarioPayload,
		userId?: string,
	): Promise<TestScenarioWithSteps> {
		try {
			const {
				projectId,
				title,
				description,
				relativeRoute,
				status,
				requiredScenarioId,
				tags,
				steps = [],
			} = payload;

			const result = await prisma.$transaction(async (tx) => {
				const scenario = await tx.testScenario.create({
					data: {
						projectId,
						title,
						description: description || null,
						relativeRoute: relativeRoute || "/",
						status: status || "DRAFT",
						requiredScenarioId: requiredScenarioId || null,
						tags: tags || [],
						createdBy: userId || null,
						updatedBy: userId || null,
					},
				});

				if (steps.length > 0) {
					const recordsToCreate = steps.map((step, index) => ({
						scenarioId: scenario.id,
						stepOrder: step.stepOrder || index + 1,
						actionType: step.actionType,
						primaryKey: step.primaryKey,
						selectorMetadata:
							(step.selectorMetadata as object) || {},
						inputConfig: (step.inputConfig as object) || {},
						assertionConfig: (step.assertionConfig as object) || {},
						description: step.description || null,
						screenshotUrl: step.screenshotUrl || null,
						createdBy: userId || null,
						updatedBy: userId || null,
					}));

					const BATCH_SIZE = 50;
					for (
						let i = 0;
						i < recordsToCreate.length;
						i += BATCH_SIZE
					) {
						const batch = recordsToCreate.slice(i, i + BATCH_SIZE);
						await tx.testStep.createMany({
							data: batch,
						});
					}
				}

				return tx.testScenario.findUnique({
					where: { id: scenario.id },
					include: {
						steps: {
							where: { deletedAt: null },
							orderBy: { stepOrder: "asc" },
						},
						project: {
							select: {
								id: true,
								name: true,
								baseUrl: true,
							},
						},
					},
				});
			});

			if (!result) {
				throw new Error(
					"Failed to retrieve created scenario transaction result.",
				);
			}

			logger.info(
				`Successfully created scenario [${result.id}] with ${steps.length} steps`,
				"ScenariosService",
			);

			return this.mapPrismaToDomainScenario(
				result as unknown as PrismaScenarioResult,
			);
		} catch (error) {
			logger.error(
				"Failed to create scenario with steps",
				"ScenariosService",
				error,
			);
			throw error;
		}
	}

	/**
	 * Get Scenario details by ID with ordered steps
	 */
	static async getScenarioById(
		scenarioId: string,
		projectId: string,
	): Promise<TestScenarioWithSteps | null> {
		try {
			const scenario = await prisma.testScenario.findFirst({
				where: {
					id: scenarioId,
					projectId,
					deletedAt: null,
				},
				include: {
					steps: {
						where: { deletedAt: null },
						orderBy: { stepOrder: "asc" },
					},
					project: {
						select: {
							id: true,
							name: true,
							baseUrl: true,
						},
					},
				},
			});

			if (!scenario) return null;

			return this.mapPrismaToDomainScenario(
				scenario as unknown as PrismaScenarioResult,
			);
		} catch (error) {
			logger.error(
				`Failed to fetch scenario [${scenarioId}]`,
				"ScenariosService",
				error,
			);
			throw error;
		}
	}

	/**
	 * List test scenarios for a project or user with pagination & sorting
	 */
	static async listScenarios(options: ScenarioFilterOptions): Promise<{
		scenarios: TestScenarioWithSteps[];
		totalItems: number;
		totalPages: number;
		metrics: {
			totalScenarios: number;
			readyCount: number;
			draftCount: number;
			totalStepsCount: number;
		};
	}> {
		try {
			const {
				projectId,
				userId,
				status,
				search,
				tag,
				page = 1,
				pageSize = 12,
				sortBy = "updated",
			} = options;

			const skip = (Math.max(1, page) - 1) * pageSize;

			const whereClause: Prisma.TestScenarioWhereInput = {
				deletedAt: null,
			};

			if (projectId) {
				whereClause.projectId = projectId;
			} else if (userId) {
				whereClause.project = {
					deletedAt: null,
					OR: [
						{ userId },
						{
							organization: {
								members: {
									some: {
										userId,
										deletedAt: null,
									},
								},
							},
						},
					],
				};
			}

			if (status) {
				whereClause.status = status;
			}

			if (tag) {
				whereClause.tags = {
					has: tag,
				};
			}

			if (search && search.trim()) {
				const searchStr = search.trim();
				whereClause.OR = [
					{ title: { contains: searchStr, mode: "insensitive" } },
					{
						description: {
							contains: searchStr,
							mode: "insensitive",
						},
					},
					{
						relativeRoute: {
							contains: searchStr,
							mode: "insensitive",
						},
					},
				];
			}

			let orderByClause: Prisma.TestScenarioOrderByWithRelationInput = {
				updatedAt: "desc",
			};
			if (sortBy === "title") {
				orderByClause = { title: "asc" };
			}

			const baseUserWhere: Prisma.TestScenarioWhereInput = {
				deletedAt: null,
				...(projectId
					? { projectId }
					: userId
						? {
								project: {
									deletedAt: null,
									OR: [
										{ userId },
										{
											organization: {
												members: {
													some: {
														userId,
														deletedAt: null,
													},
												},
											},
										},
									],
								},
							}
						: {}),
			};

			const [
				scenarios,
				totalItems,
				readyCount,
				draftCount,
				totalStepsCount,
			] = await Promise.all([
				prisma.testScenario.findMany({
					where: whereClause,
					skip,
					take: pageSize,
					include: {
						steps: {
							where: { deletedAt: null },
							orderBy: { stepOrder: "asc" },
						},
						project: {
							select: {
								id: true,
								name: true,
								baseUrl: true,
							},
						},
					},
					orderBy: orderByClause,
				}),
				prisma.testScenario.count({ where: whereClause }),
				prisma.testScenario.count({
					where: {
						...baseUserWhere,
						status: "READY",
					},
				}),
				prisma.testScenario.count({
					where: {
						...baseUserWhere,
						status: "DRAFT",
					},
				}),
				prisma.testStep.count({
					where: {
						deletedAt: null,
						scenario: baseUserWhere,
					},
				}),
			]);

			const mapped = scenarios.map((s) =>
				this.mapPrismaToDomainScenario(
					s as unknown as PrismaScenarioResult,
				),
			);

			if (sortBy === "steps") {
				mapped.sort(
					(a, b) => (b.steps?.length || 0) - (a.steps?.length || 0),
				);
			}

			const totalPages = Math.ceil(totalItems / pageSize) || 1;

			return {
				scenarios: mapped,
				totalItems,
				totalPages,
				metrics: {
					totalScenarios: totalItems,
					readyCount,
					draftCount,
					totalStepsCount,
				},
			};
		} catch (error) {
			logger.error(`Failed to list scenarios`, "ScenariosService", error);
			throw error;
		}
	}

	/**
	 * Update Scenario details
	 */
	static async updateScenario(
		scenarioId: string,
		projectId: string,
		payload: UpdateScenarioPayload,
		userId?: string,
	): Promise<TestScenarioWithSteps> {
		try {
			const existing = await prisma.testScenario.findFirst({
				where: { id: scenarioId, projectId, deletedAt: null },
			});

			if (!existing) {
				throw new Error("Scenario not found or access denied.");
			}

			const result = await prisma.$transaction(async (tx) => {
				const updateData: Prisma.TestScenarioUpdateInput = {
					updatedBy: userId || null,
				};

				if (payload.title !== undefined)
					updateData.title = payload.title;
				if (payload.description !== undefined)
					updateData.description = payload.description;
				if (payload.relativeRoute !== undefined)
					updateData.relativeRoute = payload.relativeRoute;
				if (payload.status !== undefined)
					updateData.status = payload.status;
				if (payload.requiredScenarioId !== undefined) {
					updateData.requiredScenario = payload.requiredScenarioId
						? { connect: { id: payload.requiredScenarioId } }
						: { disconnect: true };
				}
				if (payload.tags !== undefined) updateData.tags = payload.tags;

				await tx.testScenario.update({
					where: { id: scenarioId },
					data: updateData,
				});

				if (payload.steps !== undefined) {
					await tx.testStep.deleteMany({
						where: { scenarioId },
					});

					if (payload.steps.length > 0) {
						const recordsToCreate = payload.steps.map(
							(step, index) => ({
								scenarioId,
								stepOrder: step.stepOrder || index + 1,
								actionType: step.actionType,
								primaryKey: step.primaryKey,
								selectorMetadata:
									(step.selectorMetadata as object) || {},
								inputConfig: (step.inputConfig as object) || {},
								assertionConfig:
									(step.assertionConfig as object) || {},
								description: step.description || null,
								screenshotUrl: step.screenshotUrl || null,
								createdBy: userId || null,
								updatedBy: userId || null,
							}),
						);

						const BATCH_SIZE = 50;
						for (
							let i = 0;
							i < recordsToCreate.length;
							i += BATCH_SIZE
						) {
							const batch = recordsToCreate.slice(
								i,
								i + BATCH_SIZE,
							);
							await tx.testStep.createMany({
								data: batch,
							});
						}
					}
				}

				return tx.testScenario.findUnique({
					where: { id: scenarioId },
					include: {
						steps: {
							where: { deletedAt: null },
							orderBy: { stepOrder: "asc" },
						},
						project: {
							select: {
								id: true,
								name: true,
								baseUrl: true,
							},
						},
					},
				});
			});

			if (!result) {
				throw new Error("Failed to fetch updated scenario.");
			}

			logger.info(
				`Updated scenario [${scenarioId}] successfully`,
				"ScenariosService",
			);

			return this.mapPrismaToDomainScenario(
				result as unknown as PrismaScenarioResult,
			);
		} catch (error) {
			logger.error(
				`Failed to update scenario [${scenarioId}]`,
				"ScenariosService",
				error,
			);
			throw error;
		}
	}

	/**
	 * Soft-delete scenario and its steps
	 */
	static async deleteScenario(
		scenarioId: string,
		projectId: string,
		userId?: string,
	): Promise<boolean> {
		try {
			const now = new Date();

			await prisma.$transaction([
				prisma.testStep.updateMany({
					where: { scenarioId, deletedAt: null },
					data: { deletedAt: now, deletedBy: userId || null },
				}),
				prisma.testScenario.update({
					where: { id: scenarioId, projectId },
					data: { deletedAt: now, deletedBy: userId || null },
				}),
			]);

			logger.info(
				`Soft-deleted scenario [${scenarioId}]`,
				"ScenariosService",
			);
			return true;
		} catch (error) {
			logger.error(
				`Failed to delete scenario [${scenarioId}]`,
				"ScenariosService",
				error,
			);
			throw error;
		}
	}

	// ==========================================
	// DEDICATED STEPS API METHODS
	// ==========================================

	/**
	 * List all steps for a specific scenario
	 */
	static async listSteps(
		scenarioId: string,
		projectId: string,
	): Promise<RecordedStep[]> {
		const scenario = await prisma.testScenario.findFirst({
			where: { id: scenarioId, projectId, deletedAt: null },
		});
		if (!scenario) {
			throw new Error("Scenario not found");
		}

		const steps = await prisma.testStep.findMany({
			where: { scenarioId, deletedAt: null },
			orderBy: { stepOrder: "asc" },
		});

		return steps.map((s) => ({
			id: s.id,
			stepOrder: s.stepOrder,
			actionType: s.actionType,
			primaryKey: s.primaryKey,
			selectorMetadata: (s.selectorMetadata as object) || {},
			inputConfig: (s.inputConfig as object) || {},
			assertionConfig: (s.assertionConfig as object) || {},
			description: s.description || undefined,
			screenshotUrl: s.screenshotUrl || undefined,
		}));
	}

	/**
	 * Dedicated Bulk/Single Create Steps for an existing Scenario
	 */
	static async bulkCreateSteps(
		scenarioId: string,
		projectId: string,
		steps: TestStepInput[],
		userId?: string,
	): Promise<RecordedStep[]> {
		const scenario = await prisma.testScenario.findFirst({
			where: { id: scenarioId, projectId, deletedAt: null },
		});
		if (!scenario) {
			throw new Error("Scenario not found");
		}

		const createdSteps = await prisma.$transaction(async (tx) => {
			// 1. Delete all existing test steps (both active and soft-deleted) for this scenario
			// to avoid unique constraint collisions on (scenarioId, stepOrder)
			await tx.testStep.deleteMany({
				where: { scenarioId },
			});

			// 2. Prepare records with guaranteed sequential stepOrder values (1-indexed)
			const recordsToCreate = steps.map((step, idx) => ({
				scenarioId,
				stepOrder: step.stepOrder || idx + 1,
				actionType: step.actionType,
				primaryKey: step.primaryKey,
				selectorMetadata: (step.selectorMetadata as object) || {},
				inputConfig: (step.inputConfig as object) || {},
				assertionConfig: (step.assertionConfig as object) || {},
				description: step.description || null,
				screenshotUrl: step.screenshotUrl || null,
				createdBy: userId || null,
				updatedBy: userId || null,
			}));

			// 3. Batch processing in chunks of 50 for robust bulk task execution
			const BATCH_SIZE = 50;
			for (let i = 0; i < recordsToCreate.length; i += BATCH_SIZE) {
				const batch = recordsToCreate.slice(i, i + BATCH_SIZE);
				await tx.testStep.createMany({
					data: batch,
				});
			}

			// 4. Retrieve and return all newly inserted steps in stepOrder sequence
			return tx.testStep.findMany({
				where: { scenarioId, deletedAt: null },
				orderBy: { stepOrder: "asc" },
			});
		});

		logger.info(
			`Bulk created ${steps.length} steps in batches for scenario [${scenarioId}]`,
			"ScenariosService",
		);

		return createdSteps.map((s) => ({
			id: s.id,
			stepOrder: s.stepOrder,
			actionType: s.actionType,
			primaryKey: s.primaryKey,
			selectorMetadata: (s.selectorMetadata as object) || {},
			inputConfig: (s.inputConfig as object) || {},
			assertionConfig: (s.assertionConfig as object) || {},
			description: s.description || undefined,
			screenshotUrl: s.screenshotUrl || undefined,
		}));
	}

	/**
	 * Get single Step by ID
	 */
	static async getStepById(
		stepId: string,
		scenarioId: string,
		projectId: string,
	): Promise<RecordedStep | null> {
		const scenario = await prisma.testScenario.findFirst({
			where: { id: scenarioId, projectId, deletedAt: null },
		});
		if (!scenario) return null;

		const step = await prisma.testStep.findFirst({
			where: { id: stepId, scenarioId, deletedAt: null },
		});

		if (!step) return null;

		return {
			id: step.id,
			stepOrder: step.stepOrder,
			actionType: step.actionType,
			primaryKey: step.primaryKey,
			selectorMetadata: (step.selectorMetadata as object) || {},
			inputConfig: (step.inputConfig as object) || {},
			assertionConfig: (step.assertionConfig as object) || {},
			description: step.description || undefined,
			screenshotUrl: step.screenshotUrl || undefined,
		};
	}

	/**
	 * Update a single Step by ID
	 */
	static async updateStep(
		stepId: string,
		scenarioId: string,
		projectId: string,
		payload: UpdateStepInput,
		userId?: string,
	): Promise<RecordedStep> {
		const scenario = await prisma.testScenario.findFirst({
			where: { id: scenarioId, projectId, deletedAt: null },
		});
		if (!scenario) {
			throw new Error("Scenario not found");
		}

		const existingStep = await prisma.testStep.findFirst({
			where: { id: stepId, scenarioId, deletedAt: null },
		});
		if (!existingStep) {
			throw new Error("Test Step not found");
		}

		const updateData: Prisma.TestStepUpdateInput = {
			updatedBy: userId || null,
		};

		if (payload.stepOrder !== undefined)
			updateData.stepOrder = payload.stepOrder;
		if (payload.actionType !== undefined)
			updateData.actionType = payload.actionType;
		if (payload.primaryKey !== undefined)
			updateData.primaryKey = payload.primaryKey;
		if (payload.selectorMetadata !== undefined)
			updateData.selectorMetadata = payload.selectorMetadata as object;
		if (payload.inputConfig !== undefined)
			updateData.inputConfig = payload.inputConfig as object;
		if (payload.assertionConfig !== undefined)
			updateData.assertionConfig = payload.assertionConfig as object;
		if (payload.description !== undefined)
			updateData.description = payload.description;
		if (payload.screenshotUrl !== undefined)
			updateData.screenshotUrl = payload.screenshotUrl;

		const updated = await prisma.testStep.update({
			where: { id: stepId },
			data: updateData,
		});

		logger.info(
			`Updated step [${stepId}] for scenario [${scenarioId}]`,
			"ScenariosService",
		);

		return {
			id: updated.id,
			stepOrder: updated.stepOrder,
			actionType: updated.actionType,
			primaryKey: updated.primaryKey,
			selectorMetadata: (updated.selectorMetadata as object) || {},
			inputConfig: (updated.inputConfig as object) || {},
			assertionConfig: (updated.assertionConfig as object) || {},
			description: updated.description || undefined,
			screenshotUrl: updated.screenshotUrl || undefined,
		};
	}

	/**
	 * Delete a single Step by ID and re-index stepOrder
	 */
	static async deleteStep(
		stepId: string,
		scenarioId: string,
		projectId: string,
		userId?: string,
	): Promise<boolean> {
		const scenario = await prisma.testScenario.findFirst({
			where: { id: scenarioId, projectId, deletedAt: null },
		});
		if (!scenario) {
			throw new Error("Scenario not found");
		}

		const now = new Date();

		await prisma.$transaction(async (tx) => {
			await tx.testStep.update({
				where: { id: stepId },
				data: { deletedAt: now, deletedBy: userId || null },
			});

			const remainingSteps = await tx.testStep.findMany({
				where: { scenarioId, deletedAt: null },
				orderBy: { stepOrder: "asc" },
			});

			for (let idx = 0; idx < remainingSteps.length; idx++) {
				await tx.testStep.update({
					where: { id: remainingSteps[idx].id },
					data: { stepOrder: idx + 1 },
				});
			}
		});

		logger.info(
			`Deleted step [${stepId}] and re-indexed scenario [${scenarioId}]`,
			"ScenariosService",
		);
		return true;
	}

	/**
	 * Reorder steps in bulk
	 */
	static async reorderSteps(
		scenarioId: string,
		projectId: string,
		orders: { id: string; stepOrder: number }[],
		userId?: string,
	): Promise<RecordedStep[]> {
		const scenario = await prisma.testScenario.findFirst({
			where: { id: scenarioId, projectId, deletedAt: null },
		});
		if (!scenario) {
			throw new Error("Scenario not found");
		}

		await prisma.$transaction(async (tx) => {
			for (const item of orders) {
				await tx.testStep.update({
					where: { id: item.id },
					data: {
						stepOrder: item.stepOrder,
						updatedBy: userId || null,
					},
				});
			}
		});

		const updatedSteps = await prisma.testStep.findMany({
			where: { scenarioId, deletedAt: null },
			orderBy: { stepOrder: "asc" },
		});

		return updatedSteps.map((s) => ({
			id: s.id,
			stepOrder: s.stepOrder,
			actionType: s.actionType,
			primaryKey: s.primaryKey,
			selectorMetadata: (s.selectorMetadata as object) || {},
			inputConfig: (s.inputConfig as object) || {},
			assertionConfig: (s.assertionConfig as object) || {},
			description: s.description || undefined,
			screenshotUrl: s.screenshotUrl || undefined,
		}));
	}

	/**
	 * Helper mapping Prisma model to domain interface
	 */
	private static mapPrismaToDomainScenario(
		prismaScenario: PrismaScenarioResult,
	): TestScenarioWithSteps {
		return {
			id: prismaScenario.id,
			projectId: prismaScenario.projectId,
			title: prismaScenario.title,
			description: prismaScenario.description,
			relativeRoute: prismaScenario.relativeRoute,
			status: prismaScenario.status,
			requiredScenarioId: prismaScenario.requiredScenarioId,
			tags: prismaScenario.tags || [],
			createdAt: prismaScenario.createdAt,
			createdBy: prismaScenario.createdBy,
			updatedAt: prismaScenario.updatedAt,
			updatedBy: prismaScenario.updatedBy,
			steps: (prismaScenario.steps || []).map((step: PrismaStepItem) => ({
				id: step.id,
				stepOrder: step.stepOrder,
				actionType: step.actionType,
				primaryKey: step.primaryKey,
				selectorMetadata: (step.selectorMetadata as object) || {},
				inputConfig: (step.inputConfig as object) || {},
				assertionConfig: (step.assertionConfig as object) || {},
				description: step.description || "",
				screenshotUrl: step.screenshotUrl || undefined,
			})),
			stepCount: (prismaScenario.steps || []).length,
			project: prismaScenario.project
				? {
						id: prismaScenario.project.id,
						name: prismaScenario.project.name,
						baseUrl: prismaScenario.project.baseUrl,
					}
				: undefined,
		};
	}

	/**
	 * Convert recorded steps into replayable ActionLogs, resolving {{env.KEY}} variables and dynamic patterns.
	 */
	static buildReplayLogs(
		allScenarioSteps: RecordedStep[],
		envVariables: Record<string, string>,
	): ActionLog[] {
		return allScenarioSteps.map((step, idx) => {
				let type: ActionLog["type"] = "click";
				switch (step.actionType) {
					case "CLICK":
						type = step.inputConfig?.url ? "navigate" : "click";
						break;
					case "TYPE":
						type = "type";
						break;
					case "SELECT":
						type = "select_option";
						break;
					case "CHECK":
					case "UNCHECK":
						type = "check";
						break;
					case "HOVER":
						type = "hover";
						break;
					case "SCROLL":
						type = "scroll";
						break;
					case "KEYPRESS":
						type = "press_key";
						break;
					case "UPLOAD_FILE":
						type = "upload_file";
						break;
					case "ASSERT":
						type =
							step.assertionConfig?.assertionType === "ASSERT_TEXT"
								? "assert_text"
								: step.assertionConfig?.assertionType === "ASSERT_URL"
									? "assert_url"
									: "assert_visible";
						break;
					default:
						type = "click";
						break;
				}

				const rawValue =
					step.inputConfig?.value || step.inputConfig?.url;
				const resolvedValue = resolveDynamicValue(
					rawValue,
					envVariables,
				);
				const resolvedUrl = resolveDynamicValue(
					step.inputConfig?.url,
					envVariables,
				);
				const resolvedExpectedValue = resolveDynamicValue(
					step.assertionConfig?.expectedValue,
					envVariables,
				);

				return {
					id: step.id || `step-${idx + 1}`,
					type,
					description: step.description || `Step ${idx + 1}`,
					selector:
						step.selectorMetadata?.cssSelector || step.primaryKey,
					xpath: step.selectorMetadata?.xpathSelector,
					elementId: step.selectorMetadata?.id,
					innerText: step.selectorMetadata?.text,
					selectorMetadata: step.selectorMetadata,
					defaultSelector: step.selectorMetadata?.defaultSelector,
					value: resolvedValue,
					url: resolvedUrl,
					key: step.inputConfig?.keyName,
					filePaths: step.inputConfig?.filePaths,
					expectedValue: resolvedExpectedValue,
					timestamp: new Date().toLocaleTimeString(),
				};
			}) as unknown as ActionLog[];
	}


	/**
	 * Start a scenario run in the background and return its initial snapshot immediately.
	 * Progress is available through subscribeToRun() / getRunSnapshot(). If the same user already
	 * has this scenario running, the existing run is returned instead of starting a second browser.
	 */
	static async startScenarioRun(
		projectId: string,
		scenarioId: string,
		userId: string,
		environmentId?: string
	): Promise<ExecutionRunSnapshot> {
		for (const state of activeRuns.values()) {
			const s = state.snapshot;
			if (s.isLive && s.scenarioId === scenarioId && s.projectId === projectId && state.userId === userId) {
				return s;
			}
		}

		this.assertCapacity();

		pendingStarts += 1;
		try {
			return await this.createAndStartRun(projectId, scenarioId, userId, environmentId);
		} finally {
			pendingStarts -= 1;
		}
	}

	/**
	 * Run steps straight from the Studio editor (possibly unsaved) as a live preview.
	 * Nothing is written to the database, so previews never appear in the Executions list.
	 */
	static async startDraftRun(
		projectId: string,
		steps: RecordedStep[],
		userId: string,
		options: { environmentId?: string; title?: string } = {}
	): Promise<ExecutionRunSnapshot> {
		if (steps.length === 0) {
			throw new Error("There are no steps to run");
		}
		this.assertCapacity();

		pendingStarts += 1;
		try {
			const project = await this.findAccessibleProject(projectId, userId);
			const env = await ProjectsService.resolveEnvironmentContext(projectId, project.baseUrl, options.environmentId);
			const logs = this.buildReplayLogs(steps, env.envVariables);
			return this.launchRun({
				executionId: randomUUID(),
				projectId,
				projectName: project.name,
				scenarioId: null,
				title: options.title?.trim() || "Studio test run",
				allSteps: steps,
				logs,
				env,
				userId,
				startedAt: new Date(),
				persist: false,
			});
		} finally {
			pendingStarts -= 1;
		}
	}

	private static assertCapacity(): void {
		let liveRuns = pendingStarts;
		for (const state of activeRuns.values()) {
			if (state.snapshot.isLive) liveRuns += 1;
		}
		const maxConcurrent = getMaxConcurrentRuns();
		if (liveRuns >= maxConcurrent) {
			throw new Error(
				`Too many runs in progress (limit ${maxConcurrent}). Wait for one to finish or cancel it, then try again.`
			);
		}
	}

	private static async findAccessibleProject(
		projectId: string,
		userId: string
	): Promise<{ id: string; name: string; baseUrl: string }> {
		const project = await prisma.project.findFirst({
			where: {
				id: projectId,
				deletedAt: null,
				OR: [{ userId }, { organization: { members: { some: { userId, deletedAt: null } } } }],
			},
			select: { id: true, name: true, baseUrl: true },
		});
		if (!project) {
			throw new Error("Project not found");
		}
		return project;
	}

	private static async createAndStartRun(
		projectId: string,
		scenarioId: string,
		userId: string,
		environmentId?: string
	): Promise<ExecutionRunSnapshot> {
		const project = await this.findAccessibleProject(projectId, userId);

		const scenario = await this.getScenarioById(scenarioId, projectId);
		if (!scenario) {
			throw new Error("Scenario not found");
		}

		// Prerequisite scenario steps run first, then the scenario's own steps
		let allSteps = [...scenario.steps];
		if (scenario.requiredScenarioId) {
			const required = await this.getScenarioById(scenario.requiredScenarioId, projectId);
			if (required?.steps?.length) {
				allSteps = [...required.steps, ...scenario.steps];
			}
		}
		if (allSteps.length === 0) {
			throw new Error("This scenario has no recorded steps to run");
		}

		const env = await ProjectsService.resolveEnvironmentContext(projectId, project.baseUrl, environmentId);
		const logs = this.buildReplayLogs(allSteps, env.envVariables);

		const startedAt = new Date();
		const execution = await prisma.testExecution.create({
			data: {
				projectId,
				scenarioId,
				environmentProfileId: env.profileId,
				status: "RUNNING",
				triggerType: "MANUAL",
				startedAt,
				totalSteps: allSteps.length,
				createdBy: userId,
			},
		});

		return this.launchRun({
			executionId: execution.id,
			projectId,
			projectName: project.name,
			scenarioId,
			title: scenario.title,
			allSteps,
			logs,
			env,
			userId,
			startedAt,
			persist: true,
		});
	}

	private static launchRun(params: {
		executionId: string;
		projectId: string;
		projectName: string;
		scenarioId: string | null;
		title: string;
		allSteps: RecordedStep[];
		logs: Parameters<typeof PlaywrightService.runScenarioSteps>[2];
		env: Awaited<ReturnType<typeof ProjectsService.resolveEnvironmentContext>>;
		userId: string;
		startedAt: Date;
		persist: boolean;
	}): ExecutionRunSnapshot {
		const { executionId, projectId, projectName, scenarioId, title, allSteps, logs, env, userId, startedAt, persist } =
			params;

		const steps: RunStepState[] = allSteps.map((step, index) => ({
			index,
			stepId: persist && step.id && UUID_PATTERN.test(step.id) ? step.id : null,
			actionType: String(step.actionType),
			description: step.description || `Step ${index + 1}`,
			status: "PENDING",
			durationMs: null,
			error: null,
			healedSelector: null,
			healedPriority: null,
			screenshot: null,
		}));

		const state: RunState = {
			userId,
			persist,
			cancelRequested: false,
			listeners: new Set(),
			snapshot: {
				executionId,
				projectId,
				projectName,
				scenarioId,
				scenarioTitle: title,
				status: "RUNNING",
				startedAt: startedAt.toISOString(),
				completedAt: null,
				durationMs: null,
				currentUrl: env.targetBaseUrl,
				pageTitle: "",
				totalSteps: steps.length,
				passedSteps: 0,
				failedSteps: 0,
				healedSteps: 0,
				errorMessage: null,
				steps,
				frame: null,
				isLive: true,
			},
		};
		activeRuns.set(executionId, state);

		void this.executeRun(state, logs, env.targetBaseUrl, env.sessionAuth, allSteps.map((s) => s.actionType)).catch(
			(err: unknown) => {
				logger.error("Background scenario run crashed", "ScenariosService", err);
			}
		);

		return state.snapshot;
	}

	private static async executeRun(
		state: RunState,
		logs: Parameters<typeof PlaywrightService.runScenarioSteps>[2],
		targetBaseUrl: string,
		sessionAuth: Parameters<typeof PlaywrightService.runScenarioSteps>[3],
		actionTypes: unknown[]
	): Promise<void> {
		const { snapshot } = state;
		const startTime = Date.now();
		let fatalError: string | null = null;
		let cancelled = false;

		try {
			const outcome = await PlaywrightService.runScenarioSteps(
				`exec-${snapshot.executionId}`,
				targetBaseUrl,
				logs,
				sessionAuth,
				{
					isCancelled: () => state.cancelRequested,
					onStepStart: (index) => {
						snapshot.steps[index].status = "RUNNING";
						emitRunEvent(state, buildStepEvent(state, index));
					},
					onStepResult: (index, result) => {
						const step = snapshot.steps[index];
						step.status = result.status;
						step.durationMs = result.durationMs;
						step.error = result.error ?? null;
						step.healedSelector = result.healedSelector ?? null;
						step.healedPriority = result.healedPriority ?? null;
						step.screenshot = result.screenshot ?? null;

						if (result.status === "FAILED") snapshot.failedSteps += 1;
						else snapshot.passedSteps += 1;
						if (result.status === "HEALED") snapshot.healedSteps += 1;

						emitRunEvent(state, buildStepEvent(state, index));
						if (state.persist) void this.persistStepResult(snapshot.executionId, step, actionTypes[index], state.userId);
					},
					onFrame: (frame) => {
						snapshot.frame = frame;
						emitRunEvent(state, { type: "frame", frame });
					},
					onPage: (currentUrl, pageTitle) => {
						snapshot.currentUrl = currentUrl;
						snapshot.pageTitle = pageTitle;
					},
				}
			);
			cancelled = outcome.cancelled;
		} catch (err: unknown) {
			fatalError = err instanceof Error ? err.message.split("\n")[0] : "Execution failed";
			logger.error("Scenario run failed", "ScenariosService", err);
		}

		// Every step that never ran is reported as skipped
		for (const step of snapshot.steps) {
			if (step.status === "PENDING" || step.status === "RUNNING") {
				step.status = "SKIPPED";
				emitRunEvent(state, buildStepEvent(state, step.index));
				if (state.persist) void this.persistStepResult(snapshot.executionId, step, actionTypes[step.index], state.userId);
			}
		}

		const firstFailure = snapshot.steps.find((s) => s.status === "FAILED");
		let status: RunStatus = "PASSED";
		if (cancelled) status = "CANCELLED";
		else if (fatalError || firstFailure) status = "FAILED";

		const errorMessage = fatalError
			? fatalError
			: firstFailure
				? `Step ${firstFailure.index + 1} "${firstFailure.description}" failed: ${firstFailure.error ?? "unknown error"}`
				: null;

		snapshot.status = status;
		snapshot.errorMessage = errorMessage;
		snapshot.completedAt = new Date().toISOString();
		snapshot.durationMs = Date.now() - startTime;
		snapshot.isLive = false;

		try {
			if (state.persist) await prisma.testExecution.update({
				where: { id: snapshot.executionId },
				data: {
					status,
					completedAt: new Date(snapshot.completedAt),
					durationMs: snapshot.durationMs,
					passedSteps: snapshot.passedSteps,
					failedSteps: snapshot.failedSteps,
					healedSteps: snapshot.healedSteps,
					errorMessage,
				},
			});
		} catch (err: unknown) {
			logger.error("Failed to finalize execution record", "ScenariosService", err);
		}

		emitRunEvent(state, { type: "complete", snapshot });

		const timer = setTimeout(() => activeRuns.delete(snapshot.executionId), FINISHED_RUN_RETENTION_MS);
		timer.unref?.();
	}

	private static async persistStepResult(
		executionId: string,
		step: RunStepState,
		actionType: unknown,
		userId: string
	): Promise<void> {
		try {
			await prisma.executionStepResult.create({
				data: {
					executionId,
					stepId: step.stepId,
					stepOrder: step.index + 1,
					actionType: actionType as Prisma.ExecutionStepResultUncheckedCreateInput["actionType"],
					status: step.status === "RUNNING" || step.status === "PENDING" ? "SKIPPED" : step.status,
					durationMs: step.durationMs,
					healedSelector: step.healedSelector,
					healedPriority: step.healedPriority,
					failureReason: step.error,
					screenshotUrl: step.screenshot,
					createdBy: userId,
				},
			});
		} catch (err: unknown) {
			logger.warn("Failed to persist step result", "ScenariosService", err);
		}
	}

	/**
	 * Subscribe to live events of a run that is executing on this server.
	 * Returns null when the run is not in memory (finished long ago, or after a restart).
	 */
	static subscribeToRun(executionId: string, listener: RunListener): (() => void) | null {
		const state = activeRuns.get(executionId);
		if (!state) return null;
		state.listeners.add(listener);
		return () => state.listeners.delete(listener);
	}

	/** Current state of a run: live from memory, otherwise rebuilt from the database. */
	static async getRunSnapshot(executionId: string, userId: string): Promise<ExecutionRunSnapshot | null> {
		const draft = activeRuns.get(executionId);
		if (draft && !draft.persist) {
			return draft.userId === userId ? draft.snapshot : null;
		}

		const execution = await prisma.testExecution.findFirst({
			where: accessibleExecutionWhere(executionId, userId),
			include: {
				project: { select: { name: true, baseUrl: true } },
				scenario: { select: { title: true } },
				stepResults: {
					where: { deletedAt: null },
					orderBy: { stepOrder: "asc" },
					include: { step: { select: { description: true } } },
				},
			},
		});
		if (!execution) return null;

		const live = activeRuns.get(executionId);
		if (live) return live.snapshot;

		const steps: RunStepState[] = execution.stepResults.map((result, index) => ({
			index,
			stepId: result.stepId,
			actionType: String(result.actionType),
			description: result.step?.description || `Step ${result.stepOrder}`,
			status: result.status,
			durationMs: result.durationMs,
			error: result.failureReason,
			healedSelector: result.healedSelector,
			healedPriority: result.healedPriority,
			screenshot: result.screenshotUrl,
		}));

		return {
			executionId: execution.id,
			projectId: execution.projectId,
			projectName: execution.project.name,
			scenarioId: execution.scenarioId,
			scenarioTitle: execution.scenario?.title ?? "Scenario run",
			status: execution.status,
			startedAt: execution.startedAt?.toISOString() ?? null,
			completedAt: execution.completedAt?.toISOString() ?? null,
			durationMs: execution.durationMs,
			currentUrl: execution.project.baseUrl,
			pageTitle: "",
			totalSteps: execution.totalSteps,
			passedSteps: execution.passedSteps,
			failedSteps: execution.failedSteps,
			healedSteps: execution.healedSteps,
			errorMessage: execution.errorMessage,
			steps,
			frame: null,
			isLive: false,
		};
	}

	/**
	 * Server-Sent Events for one run: a `snapshot` first, then `step`, `frame` and finally `complete`,
	 * after which the stream closes. A run that already finished gets `snapshot` then `complete`.
	 * Returns null when the run does not exist or the user cannot see it.
	 */
	static async createRunEventStream(
		executionId: string,
		userId: string,
		signal: AbortSignal
	): Promise<ReadableStream<Uint8Array> | null> {
		const initial = await this.getRunSnapshot(executionId, userId);
		if (!initial) return null;

		const encoder = new TextEncoder();

		return new ReadableStream<Uint8Array>({
			start: (controller) => {
				let closed = false;
				let pingTimer: ReturnType<typeof setInterval> | null = null;
				let unsubscribe: (() => void) | null = null;

				const close = () => {
					if (closed) return;
					closed = true;
					unsubscribe?.();
					if (pingTimer) clearInterval(pingTimer);
					try {
						controller.close();
					} catch {
						// already closed
					}
				};

				const send = (eventName: string, payload: unknown) => {
					if (closed) return;
					try {
						controller.enqueue(encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`));
					} catch {
						close();
					}
				};

				// Subscribe before sending the snapshot so no event can slip between the two
				unsubscribe = this.subscribeToRun(executionId, (event) => {
					if (event.type === "complete") {
						send("complete", event.snapshot);
						close();
					} else if (event.type === "frame") {
						send("frame", { frame: event.frame });
					} else {
						const { index, step, passedSteps, failedSteps, healedSteps, currentUrl, pageTitle } = event;
						send("step", { index, step, passedSteps, failedSteps, healedSteps, currentUrl, pageTitle });
					}
				});

				send("snapshot", initial);

				if (!unsubscribe || !initial.isLive) {
					// Finished, or no longer running on this server: nothing more will arrive
					send("complete", initial);
					close();
					return;
				}

				pingTimer = setInterval(() => {
					try {
						controller.enqueue(encoder.encode(": ping\n\n"));
					} catch {
						close();
					}
				}, 5000);
				signal.addEventListener("abort", close);
			},
		});
	}

	/**
	 * Request cancellation. The run stops before its next step; a step that is already
	 * executing finishes first. Returns false when the execution does not exist or is not accessible.
	 */
	static async cancelRun(executionId: string, userId: string): Promise<boolean> {
		const draft = activeRuns.get(executionId);
		if (draft && !draft.persist) {
			if (draft.userId !== userId) return false;
			draft.cancelRequested = true;
			return true;
		}

		const execution = await prisma.testExecution.findFirst({
			where: accessibleExecutionWhere(executionId, userId),
			select: { id: true, status: true },
		});
		if (!execution) return false;

		const live = activeRuns.get(executionId);
		if (live) {
			live.cancelRequested = true;
			return true;
		}

		// Not running on this server (e.g. server restarted mid-run): close the orphaned record
		if (execution.status === "RUNNING" || execution.status === "PENDING") {
			await prisma.testExecution.update({
				where: { id: executionId },
				data: { status: "CANCELLED", completedAt: new Date(), errorMessage: "Run was interrupted" },
			});
		}
		return true;
	}
}
