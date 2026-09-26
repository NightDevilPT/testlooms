import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger-service/logger.service";
import {
  ProjectItem,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectQueryParams,
  PingUrlResult,
  EnvironmentProfileItem,
  CreateEnvProfileInput,
  UpdateEnvProfileInput,
} from "./types";
import { encryptVariables, decryptVariables } from "./crypto";

export class ProjectsService {
  /**
   * Helper to generate a URL slug from name
   */
  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
      .concat("-", Math.random().toString(36).substring(2, 7));
  }

  /**
   * Fetch paginated projects for a user or their organization
   */
  public static async getProjects(
    userId: string,
    params: ProjectQueryParams = {}
  ): Promise<{ projects: ProjectItem[]; totalItems: number; totalPages: number }> {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(50, Math.max(1, params.pageSize || 12));
    const skip = (page - 1) * pageSize;

    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
    };

    if (params.ownership === "PERSONAL") {
      where.userId = userId;
    } else if (params.ownership === "COMPANY") {
      where.organizationId = { not: null };
      where.organization = {
        members: {
          some: {
            userId,
            deletedAt: null,
          },
        },
      };
    } else {
      where.OR = [
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
      ];
    }

    if (params.search && params.search.trim().length > 0) {
      const searchStr = params.search.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: searchStr, mode: "insensitive" } },
            { description: { contains: searchStr, mode: "insensitive" } },
            { baseUrl: { contains: searchStr, mode: "insensitive" } },
          ],
        },
      ];
    }

    logger.info("Fetching projects list", { userId, page, pageSize, search: params.search });

    const [projects, totalItems] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
        include: {
          _count: {
            select: {
              scenarios: { where: { deletedAt: null } },
              workflows: { where: { deletedAt: null } },
              executions: true,
              envProfiles: { where: { deletedAt: null } },
            },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    return {
      projects: projects as unknown as ProjectItem[],
      totalItems,
      totalPages,
    };
  }

  /**
   * Get single project by ID
   */
  public static async getProjectById(
    projectId: string,
    userId: string
  ): Promise<ProjectItem | null> {
    logger.info("Fetching project details", { projectId, userId });

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
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
      include: {
        _count: {
          select: {
            scenarios: { where: { deletedAt: null } },
            workflows: { where: { deletedAt: null } },
            executions: true,
            envProfiles: { where: { deletedAt: null } },
          },
        },
      },
    });

    return project as unknown as ProjectItem | null;
  }

  /**
   * Create a new project
   */
  public static async createProject(
    userId: string,
    input: CreateProjectInput
  ): Promise<ProjectItem> {
    const slug = this.generateSlug(input.name);
    const timeoutMs = input.timeoutMs || 30000;

    logger.info("Creating new project", {
      userId,
      name: input.name,
      baseUrl: input.baseUrl,
      ownershipType: input.ownershipType,
    });

    const project = await prisma.project.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        slug,
        baseUrl: input.baseUrl.trim(),
        ownershipType: input.ownershipType || "PERSONAL",
        userId: input.ownershipType === "COMPANY" ? null : userId,
        organizationId: input.ownershipType === "COMPANY" ? input.organizationId : null,
        defaultViewportWidth: input.defaultViewportWidth || 1280,
        defaultViewportHeight: input.defaultViewportHeight || 800,
        headless: input.headless ?? true,
        timeoutMs,
        createdBy: userId,
        envProfiles: {
          create: {
            name: "Default Environment",
            isDefault: true,
            createdBy: userId,
          },
        },
      },
      include: {
        _count: {
          select: {
            scenarios: true,
            workflows: true,
            executions: true,
            envProfiles: true,
          },
        },
      },
    });

    return project as unknown as ProjectItem;
  }

  /**
   * Update existing project
   */
  public static async updateProject(
    projectId: string,
    userId: string,
    input: UpdateProjectInput
  ): Promise<ProjectItem | null> {
    const existing = await this.getProjectById(projectId, userId);
    if (!existing) {
      return null;
    }

    logger.info("Updating project", { projectId, userId, updateFields: Object.keys(input) });

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: input.name ? input.name.trim() : undefined,
        description: input.description !== undefined ? input.description.trim() || null : undefined,
        baseUrl: input.baseUrl ? input.baseUrl.trim() : undefined,
        defaultViewportWidth: input.defaultViewportWidth,
        defaultViewportHeight: input.defaultViewportHeight,
        headless: input.headless,
        timeoutMs: input.timeoutMs,
        updatedBy: userId,
      },
      include: {
        _count: {
          select: {
            scenarios: { where: { deletedAt: null } },
            workflows: { where: { deletedAt: null } },
            executions: true,
            envProfiles: { where: { deletedAt: null } },
          },
        },
      },
    });

    return updated as unknown as ProjectItem;
  }

  /**
   * Soft-delete a project
   */
  public static async deleteProject(projectId: string, userId: string): Promise<boolean> {
    const existing = await this.getProjectById(projectId, userId);
    if (!existing) {
      return false;
    }

    logger.info("Soft-deleting project", { projectId, userId });

    await prisma.project.update({
      where: { id: projectId },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    return true;
  }

  /**
   * Ping project target URL to verify reachability
   */
  public static async pingUrl(urlStr: string): Promise<PingUrlResult> {
    const startTime = Date.now();
    try {
      logger.info("Pinging target base URL", { url: urlStr });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(urlStr, {
        method: "HEAD",
        signal: controller.signal,
        headers: { "User-Agent": "TestLoom-PingCheck/1.0" },
      }).catch(async () => {
        return await fetch(urlStr, {
          method: "GET",
          signal: controller.signal,
          headers: { "User-Agent": "TestLoom-PingCheck/1.0" },
        });
      });

      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;

      return {
        url: urlStr,
        isReachable: response.ok || response.status < 500,
        statusCode: response.status,
        responseTimeMs,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reach target server";
      logger.warn("Ping check failed", { url: urlStr, error: errorMessage });
      return {
        url: urlStr,
        isReachable: false,
        responseTimeMs: Date.now() - startTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Fetch environment profiles for a project
   */
  public static async getEnvProfiles(
    projectId: string,
    userId: string
  ): Promise<EnvironmentProfileItem[]> {
    const project = await this.getProjectById(projectId, userId);
    if (!project) return [];

    logger.info("Fetching environment profiles", { projectId, userId });

    const profiles = await prisma.environmentProfile.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "asc" },
      ],
    });

    return profiles.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      deletedAt: p.deletedAt ? p.deletedAt.toISOString() : null,
      variables: decryptVariables(p.variables),
    })) as unknown as EnvironmentProfileItem[];
  }

  /**
   * Create an environment profile for a project
   */
  public static async createEnvProfile(
    projectId: string,
    userId: string,
    input: CreateEnvProfileInput
  ): Promise<EnvironmentProfileItem | null> {
    const project = await this.getProjectById(projectId, userId);
    if (!project) return null;

    logger.info("Creating environment profile", { projectId, name: input.name, userId });

    if (input.isDefault) {
      // Clear previous default
      await prisma.environmentProfile.updateMany({
        where: { projectId, deletedAt: null },
        data: { isDefault: false },
      });
    }

    const encryptedVars = encryptVariables(input.variables || []);

    const profile = await prisma.environmentProfile.create({
      data: {
        projectId,
        name: (input.name && input.name.trim()) || "Project Environment",
        isDefault: input.isDefault ?? false,
        variables: encryptedVars as unknown as Prisma.InputJsonValue,
        createdBy: userId,
      },
    });

    return {
      ...profile,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      deletedAt: profile.deletedAt ? profile.deletedAt.toISOString() : null,
      variables: decryptVariables(profile.variables),
    } as unknown as EnvironmentProfileItem;
  }

  /**
   * Update an environment profile
   */
  public static async updateEnvProfile(
    envId: string,
    projectId: string,
    userId: string,
    input: UpdateEnvProfileInput
  ): Promise<EnvironmentProfileItem | null> {
    const project = await this.getProjectById(projectId, userId);
    if (!project) return null;

    logger.info("Updating environment profile", { envId, projectId, userId });

    if (input.isDefault) {
      await prisma.environmentProfile.updateMany({
        where: { projectId, deletedAt: null },
        data: { isDefault: false },
      });
    }

    const encryptedVars = input.variables ? encryptVariables(input.variables) : undefined;

    const updated = await prisma.environmentProfile.update({
      where: { id: envId, projectId },
      data: {
        name: input.name ? input.name.trim() : undefined,
        isDefault: input.isDefault,
        variables: encryptedVars ? (encryptedVars as unknown as Prisma.InputJsonValue) : undefined,
        updatedBy: userId,
      },
    });

    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      deletedAt: updated.deletedAt ? updated.deletedAt.toISOString() : null,
      variables: decryptVariables(updated.variables),
    } as unknown as EnvironmentProfileItem;
  }

  /**
   * Soft-delete an environment profile
   */
  public static async deleteEnvProfile(
    envId: string,
    projectId: string,
    userId: string
  ): Promise<boolean> {
    const project = await this.getProjectById(projectId, userId);
    if (!project) return false;

    logger.info("Soft-deleting environment profile", { envId, projectId, userId });

    await prisma.environmentProfile.update({
      where: { id: envId, projectId },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    return true;
  }
}
