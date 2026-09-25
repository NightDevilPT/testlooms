import { z } from "zod";

// ==========================================
// Organizations Service Zod Validation Schemas
// ==========================================

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Organization name must be at least 2 characters").max(100, "Max 100 characters"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .max(50, "Max 50 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  logoUrl: z.string().url("Invalid logo URL").nullable().optional(),

  // Tax & Compliance Registrations (Optional, but strictly validated when provided)
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (val) => !val || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val),
      "Invalid GSTIN format (15 characters, e.g. 27AAPCU2081F1Z0)"
    )
    .nullable()
    .optional(),
  pan: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (val) => !val || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val),
      "Invalid PAN format (10 characters, e.g. AAPCU2081F)"
    )
    .nullable()
    .optional(),
  cin: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (val) => !val || /^[LU]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(val),
      "Invalid CIN format (21 characters, e.g. U74999MH2019PTC123456)"
    )
    .nullable()
    .optional(),

  // Address Details
  addressLine1: z.string().trim().max(150, "Address max 150 characters").nullable().optional(),
  addressLine2: z.string().trim().max(150, "Address max 150 characters").nullable().optional(),
  city: z.string().trim().max(100, "City max 100 characters").nullable().optional(),
  state: z.string().trim().max(100, "State max 100 characters").nullable().optional(),
  postalCode: z.string().trim().max(20, "Postal code max 20 characters").nullable().optional(),
  country: z.string().trim().max(100, "Country max 100 characters").nullable().optional(),

  // Overview & Contact Info
  website: z.string().trim().url("Invalid URL").or(z.literal("")).nullable().optional(),
  contactEmail: z.string().trim().email("Invalid email").or(z.literal("")).nullable().optional(),
  contactPhone: z.string().trim().max(30, "Phone max 30 characters").nullable().optional(),
  industry: z.string().trim().max(100, "Industry max 100 characters").nullable().optional(),
  companySize: z.string().trim().max(50, "Company size max 50 characters").nullable().optional(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
