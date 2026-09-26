import { z } from "zod";

// ==========================================
// Auth Service Zod Validation Schemas
// ==========================================

export const signupSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50, "First name max 50 characters"),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name max 50 characters"),
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password max 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one digit"),
  inviteToken: z.string().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
  inviteToken: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  otpCode: z.string().trim().length(6, "Verification code must be 6 digits").regex(/^\d+$/, "Code must contain digits only"),
  inviteToken: z.string().optional(),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const requestOtpSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  purpose: z.enum(["LOGIN", "EMAIL_VERIFICATION", "PASSWORD_RESET"] as const).default("LOGIN"),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const loginWithOtpSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  otpCode: z.string().trim().length(6, "Verification code must be 6 digits").regex(/^\d+$/, "Code must contain digits only"),
  inviteToken: z.string().optional(),
});

export type LoginWithOtpInput = z.infer<typeof loginWithOtpSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().trim().min(1, "Invite token is required"),
});

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

export const setupWorkspaceSchema = z.discriminatedUnion("accountType", [
  z.object({
    accountType: z.literal("PERSONAL"),
  }),
  z.object({
    accountType: z.literal("ORGANIZATION"),
    organization: z.object({
      name: z.string().trim().min(2, "Organization name must be at least 2 characters").max(100, "Max 100 characters"),
      slug: z
        .string()
        .trim()
        .min(2, "Slug must be at least 2 characters")
        .max(50, "Max 50 characters")
        .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
    }),
  }),
]);

export type SetupWorkspaceInput = z.infer<typeof setupWorkspaceSchema>;

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50, "First name max 50 characters").optional(),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name max 50 characters").optional(),
  avatarUrl: z.string().trim().nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

