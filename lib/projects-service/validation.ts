import { z } from "zod";

export const TimeoutUnitSchema = z.enum(["seconds", "minutes"]);
export type TimeoutUnit = z.infer<typeof TimeoutUnitSchema>;

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(2, "Project name must be at least 2 characters")
    .max(150, "Project name cannot exceed 150 characters")
    .trim(),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
  baseUrl: z
    .string()
    .url("Must be a valid web URL (e.g. https://staging.shop.com)")
    .trim(),
  ownershipType: z.enum(["PERSONAL", "COMPANY"]).default("PERSONAL"),
  organizationId: z.string().uuid("Invalid organization ID").optional(),
  defaultViewportWidth: z.coerce.number().int().min(320).max(3840).default(1280),
  defaultViewportHeight: z.coerce.number().int().min(240).max(2160).default(800),
  headless: z.boolean().default(true),
  timeoutValue: z.coerce.number().min(1, "Timeout must be at least 1").max(600, "Timeout cannot exceed 600").default(30),
  timeoutUnit: TimeoutUnitSchema.default("seconds"),
  timeoutMs: z.coerce.number().int().min(1000).max(600000).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const pingUrlSchema = z.object({
  url: z.string().url("Must be a valid HTTP or HTTPS URL"),
});

export const environmentVariableEntrySchema = z.object({
  key: z.string().trim(),
  value: z.string(),
  isSecret: z.boolean().default(false),
});

export const createEnvProfileSchema = z.object({
  name: z.string().min(1).max(100).trim().default("Project Environment"),
  isDefault: z.boolean().default(true),
  variables: z.array(environmentVariableEntrySchema).default([]),
});

export const updateEnvProfileSchema = createEnvProfileSchema.partial();

/**
 * Helper to calculate total milliseconds from value and unit
 */
export function calculateTimeoutMs(value: number, unit: TimeoutUnit): number {
  if (unit === "minutes") {
    return Math.round(value * 60 * 1000);
  }
  return Math.round(value * 1000);
}

/**
 * Helper to decompose milliseconds back to value and unit
 */
export function decomposeTimeoutMs(ms: number): { value: number; unit: TimeoutUnit } {
  if (!ms || ms < 1000) return { value: 30, unit: "seconds" };
  if (ms >= 60000 && ms % 60000 === 0) {
    return { value: Math.round(ms / 60000), unit: "minutes" };
  }
  return { value: Math.round(ms / 1000), unit: "seconds" };
}
