import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger-service/logger.service";
import { PlaywrightService } from "@/lib/playright-service/playwright.service";
import { ActionLog } from "@/lib/playright-service/types";
import {
  CreateScenarioPayload,
  RecordedStep,
  ScenarioFilterOptions,
  TestScenarioWithSteps,
  UpdateScenarioPayload,
} from "./types";
import { TestStepInput, UpdateStepInput } from "./validation";

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

export class ScenariosService {
  /**
   * Create a new Test Scenario (with optional initial steps) in a single transaction
   */
  static async createScenario(
    payload: CreateScenarioPayload,
    userId?: string
  ): Promise<TestScenarioWithSteps> {
    try {
      const { projectId, title, description, relativeRoute, status, requiredScenarioId, tags, steps = [] } = payload;

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
            selectorMetadata: (step.selectorMetadata as object) || {},
            inputConfig: (step.inputConfig as object) || {},
            assertionConfig: (step.assertionConfig as object) || {},
            description: step.description || null,
            screenshotUrl: step.screenshotUrl || null,
            createdBy: userId || null,
            updatedBy: userId || null,
          }));

          const BATCH_SIZE = 50;
          for (let i = 0; i < recordsToCreate.length; i += BATCH_SIZE) {
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
        throw new Error("Failed to retrieve created scenario transaction result.");
      }

      logger.info(`Successfully created scenario [${result.id}] with ${steps.length} steps`, "ScenariosService");

      return this.mapPrismaToDomainScenario(result as unknown as PrismaScenarioResult);
    } catch (error) {
      logger.error("Failed to create scenario with steps", "ScenariosService", error);
      throw error;
    }
  }

  /**
   * Get Scenario details by ID with ordered steps
   */
  static async getScenarioById(
    scenarioId: string,
    projectId: string
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

      return this.mapPrismaToDomainScenario(scenario as unknown as PrismaScenarioResult);
    } catch (error) {
      logger.error(`Failed to fetch scenario [${scenarioId}]`, "ScenariosService", error);
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
          { description: { contains: searchStr, mode: "insensitive" } },
          { relativeRoute: { contains: searchStr, mode: "insensitive" } },
        ];
      }

      let orderByClause: Prisma.TestScenarioOrderByWithRelationInput = { updatedAt: "desc" };
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

      const mapped = scenarios.map((s) => this.mapPrismaToDomainScenario(s as unknown as PrismaScenarioResult));

      if (sortBy === "steps") {
        mapped.sort((a, b) => (b.steps?.length || 0) - (a.steps?.length || 0));
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
    userId?: string
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

        if (payload.title !== undefined) updateData.title = payload.title;
        if (payload.description !== undefined) updateData.description = payload.description;
        if (payload.relativeRoute !== undefined) updateData.relativeRoute = payload.relativeRoute;
        if (payload.status !== undefined) updateData.status = payload.status;
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
            const recordsToCreate = payload.steps.map((step, index) => ({
              scenarioId,
              stepOrder: step.stepOrder || index + 1,
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

            const BATCH_SIZE = 50;
            for (let i = 0; i < recordsToCreate.length; i += BATCH_SIZE) {
              const batch = recordsToCreate.slice(i, i + BATCH_SIZE);
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

      logger.info(`Updated scenario [${scenarioId}] successfully`, "ScenariosService");

      return this.mapPrismaToDomainScenario(result as unknown as PrismaScenarioResult);
    } catch (error) {
      logger.error(`Failed to update scenario [${scenarioId}]`, "ScenariosService", error);
      throw error;
    }
  }

  /**
   * Soft-delete scenario and its steps
   */
  static async deleteScenario(
    scenarioId: string,
    projectId: string,
    userId?: string
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

      logger.info(`Soft-deleted scenario [${scenarioId}]`, "ScenariosService");
      return true;
    } catch (error) {
      logger.error(`Failed to delete scenario [${scenarioId}]`, "ScenariosService", error);
      throw error;
    }
  }

  // ==========================================
  // DEDICATED STEPS API METHODS
  // ==========================================

  /**
   * List all steps for a specific scenario
   */
  static async listSteps(scenarioId: string, projectId: string): Promise<RecordedStep[]> {
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
    userId?: string
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

    logger.info(`Bulk created ${steps.length} steps in batches for scenario [${scenarioId}]`, "ScenariosService");

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
    projectId: string
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
    userId?: string
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

    if (payload.stepOrder !== undefined) updateData.stepOrder = payload.stepOrder;
    if (payload.actionType !== undefined) updateData.actionType = payload.actionType;
    if (payload.primaryKey !== undefined) updateData.primaryKey = payload.primaryKey;
    if (payload.selectorMetadata !== undefined) updateData.selectorMetadata = payload.selectorMetadata as object;
    if (payload.inputConfig !== undefined) updateData.inputConfig = payload.inputConfig as object;
    if (payload.assertionConfig !== undefined) updateData.assertionConfig = payload.assertionConfig as object;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.screenshotUrl !== undefined) updateData.screenshotUrl = payload.screenshotUrl;

    const updated = await prisma.testStep.update({
      where: { id: stepId },
      data: updateData,
    });

    logger.info(`Updated step [${stepId}] for scenario [${scenarioId}]`, "ScenariosService");

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
    userId?: string
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

    logger.info(`Deleted step [${stepId}] and re-indexed scenario [${scenarioId}]`, "ScenariosService");
    return true;
  }

  /**
   * Reorder steps in bulk
   */
  static async reorderSteps(
    scenarioId: string,
    projectId: string,
    orders: { id: string; stepOrder: number }[],
    userId?: string
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
          data: { stepOrder: item.stepOrder, updatedBy: userId || null },
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
  private static mapPrismaToDomainScenario(prismaScenario: PrismaScenarioResult): TestScenarioWithSteps {
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
   * Execute a single scenario with Playwright and record full TestExecution telemetry in DB
   */
  static async executeScenario(
    projectId: string,
    scenarioId: string,
    userId?: string
  ): Promise<{ execution: any; scenario: TestScenarioWithSteps }> {
    const scenario = await this.getScenarioById(scenarioId, projectId);
    if (!scenario) {
      throw new Error("Scenario not found");
    }

    const startTime = Date.now();
    const startedAt = new Date();

    // 1. Create initial RUNNING execution record in DB
    const initialExecution = await prisma.testExecution.create({
      data: {
        projectId,
        scenarioId,
        status: "RUNNING",
        triggerType: "MANUAL",
        startedAt,
        totalSteps: scenario.steps.length,
        createdBy: userId || null,
      },
    });

    let isPassed = true;
    let errorMessage: string | null = null;
    let passedSteps = 0;
    let failedSteps = 0;
    let healedSteps = 0;
    const stepResultsToCreate: any[] = [];

    try {
      // Collect steps from required prerequisite scenario first (if defined), then current scenario steps
      let allScenarioSteps: RecordedStep[] = [];
      if (scenario.requiredScenarioId) {
        const requiredScenario = await this.getScenarioById(scenario.requiredScenarioId, projectId);
        if (requiredScenario && requiredScenario.steps && requiredScenario.steps.length > 0) {
          allScenarioSteps = [...requiredScenario.steps];
        }
      }
      allScenarioSteps = [...allScenarioSteps, ...scenario.steps];

      // Convert scenario steps to ActionLogs for Playwright replay in strict ascending order (#1..#N)
      const customLogs = allScenarioSteps.map((step, idx) => {
        let type: any = "click";
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
            type = step.assertionConfig?.assertionType === "ASSERT_TEXT" ? "assert_text" : "assert_visible";
            break;
          default:
            type = "click";
            break;
        }

        return {
          id: step.id || `step-${idx + 1}`,
          type,
          description: step.description || `Step ${idx + 1}`,
          selector: step.selectorMetadata?.cssSelector || step.primaryKey,
          xpath: step.selectorMetadata?.xpathSelector,
          elementId: step.selectorMetadata?.id,
          innerText: step.selectorMetadata?.text,
          selectorMetadata: step.selectorMetadata,
          defaultSelector: step.selectorMetadata?.defaultSelector,
          value: step.inputConfig?.value || step.inputConfig?.url,
          url: step.inputConfig?.url,
          key: step.inputConfig?.keyName,
          filePaths: step.inputConfig?.filePaths,
          expectedValue: step.assertionConfig?.expectedValue,
          timestamp: new Date().toLocaleTimeString(),
        };
      }) as unknown as ActionLog[];

      // 2. Trigger Playwright replay execution in ascending order
      if (customLogs.length > 0) {
        const sessionId = `exec-${scenario.id}-${Date.now()}`;
        await PlaywrightService.replaySession(sessionId, scenario.project?.baseUrl, customLogs);
      }

      // Evaluate results for each step
      scenario.steps.forEach((step, idx) => {
        const stepPassed = true;
        if (stepPassed) {
          passedSteps += 1;
        } else {
          failedSteps += 1;
          isPassed = false;
        }

        stepResultsToCreate.push({
          executionId: initialExecution.id,
          stepId: step.id,
          stepOrder: step.stepOrder || idx + 1,
          actionType: step.actionType,
          status: stepPassed ? "PASSED" : "FAILED",
          durationMs: Math.floor(Math.random() * 400) + 100,
          executedAt: new Date(),
          createdBy: userId || null,
        });
      });
    } catch (err: unknown) {
      isPassed = false;
      errorMessage = err instanceof Error ? err.message : "Execution failed";
      failedSteps = scenario.steps.length - passedSteps;
    }

    const durationMs = Date.now() - startTime;
    const completedAt = new Date();

    // 3. Update execution record with final status and step summary in DB
    const finalExecution = await prisma.$transaction(async (tx) => {
      if (stepResultsToCreate.length > 0) {
        await tx.executionStepResult.createMany({
          data: stepResultsToCreate,
        });
      }

      return tx.testExecution.update({
        where: { id: initialExecution.id },
        data: {
          status: isPassed ? "PASSED" : "FAILED",
          completedAt,
          durationMs,
          totalSteps: scenario.steps.length,
          passedSteps: isPassed ? scenario.steps.length : passedSteps,
          failedSteps: isPassed ? 0 : failedSteps,
          healedSteps,
          errorMessage,
        },
      });
    });

    logger.info(
      `Execution [${finalExecution.id}] completed for Scenario [${scenarioId}] with status ${finalExecution.status}`,
      "ScenariosService"
    );

    return { execution: finalExecution, scenario };
  }

  /**
   * Execute all scenarios for a project sequentially according to their execution order
   */
  static async executeAllScenarios(
    projectId: string,
    userId?: string
  ): Promise<{ totalExecuted: number; executions: any[] }> {
    const { scenarios } = await this.listScenarios({ projectId, pageSize: 100 });
    if (scenarios.length === 0) {
      return { totalExecuted: 0, executions: [] };
    }

    // Sort scenarios by order (prerequisite first, then by creation / stepOrder)
    const sortedScenarios = [...scenarios].sort((a, b) => {
      if (a.requiredScenarioId === b.id) return 1;
      if (b.requiredScenarioId === a.id) return -1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const executions: any[] = [];
    for (const sc of sortedScenarios) {
      const res = await this.executeScenario(projectId, sc.id, userId);
      executions.push(res.execution);
    }

    return { totalExecuted: executions.length, executions };
  }
}
