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
});

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
