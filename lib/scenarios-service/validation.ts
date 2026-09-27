import { z } from "zod";

export const actionTypeEnum = z.enum([
  "CLICK",
  "TYPE",
  "SELECT",
  "CHECK",
  "UNCHECK",
  "HOVER",
  "SCROLL",
  "KEYPRESS",
  "UPLOAD_FILE",
  "ASSERT",
]);

export const scenarioStatusEnum = z.enum(["DRAFT", "READY", "DEPRECATED"]);

export const selectorMetadataSchema = z.object({
  cssSelector: z.string().optional(),
  xpathSelector: z.string().optional(),
  id: z.string().optional(),
  name: z.string().optional(),
  ariaLabel: z.string().optional(),
  placeholder: z.string().optional(),
  text: z.string().optional(),
  dataTestId: z.string().optional(),
  defaultSelector: z.enum(["css", "xpath", "id", "dataTestId", "text"]).optional(),
});

export const inputConfigSchema = z.object({
  value: z.string().optional(),
  url: z.string().optional(),
  keyName: z.string().optional(),
  filePaths: z.array(z.string()).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
});

export const assertionConfigSchema = z.object({
  assertionType: z.enum(["ASSERT_VISIBLE", "ASSERT_TEXT", "ASSERT_URL"]).optional(),
  expectedValue: z.string().optional(),
  attributeName: z.string().optional(),
});

export const testStepSchema = z.object({
  id: z.string().optional(),
  stepOrder: z.number().int().min(1).optional(),
  actionType: actionTypeEnum,
  primaryKey: z.string().min(1, "Primary target key is required"),
  selectorMetadata: selectorMetadataSchema.optional(),
  inputConfig: inputConfigSchema.optional(),
  assertionConfig: assertionConfigSchema.optional(),
  description: z.string().optional(),
  screenshotUrl: z.string().optional(),
});

export const createScenarioSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  title: z.string().min(3, "Title must be at least 3 characters").max(120, "Title is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  relativeRoute: z.string().optional(),
  status: scenarioStatusEnum.optional(),
  requiredScenarioId: z.string().uuid("Invalid dependency scenario ID").nullable().optional(),
  tags: z.array(z.string()).optional(),
  steps: z.array(testStepSchema).optional(),
});

export const updateScenarioSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(120, "Title is too long").optional(),
  description: z.string().max(500, "Description is too long").optional(),
  relativeRoute: z.string().optional(),
  status: scenarioStatusEnum.optional(),
  requiredScenarioId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional(),
  steps: z.array(testStepSchema).optional(),
});

export const createStepsSchema = z.object({
  steps: z.array(testStepSchema).min(1, "At least one step is required"),
});

export const updateStepSchema = z.object({
  stepOrder: z.number().int().min(1).optional(),
  actionType: actionTypeEnum.optional(),
  primaryKey: z.string().min(1).optional(),
  selectorMetadata: selectorMetadataSchema.optional(),
  inputConfig: inputConfigSchema.optional(),
  assertionConfig: assertionConfigSchema.optional(),
  description: z.string().optional(),
  screenshotUrl: z.string().optional(),
});

export const reorderStepsSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string().uuid("Invalid step ID"),
      stepOrder: z.number().int().min(1),
    })
  ).min(1, "Orders list cannot be empty"),
});

export type CreateScenarioInput = z.infer<typeof createScenarioSchema>;
export type UpdateScenarioInput = z.infer<typeof updateScenarioSchema>;
export type TestStepInput = z.infer<typeof testStepSchema>;
export type CreateStepsInput = z.infer<typeof createStepsSchema>;
export type UpdateStepInput = z.infer<typeof updateStepSchema>;
export type ReorderStepsInput = z.infer<typeof reorderStepsSchema>;
