import { z } from "zod";

// ==========================================
// API Client Configuration & Header Validation Schemas
// ==========================================

export const requestOptionsSchema = z.object({
  idempotencyKey: z.string().uuid("Idempotency key must be a valid UUID").optional(),
  headers: z.record(z.string(), z.string()).optional(),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()])).optional(),
});

export type RequestOptionsInput = z.infer<typeof requestOptionsSchema>;
