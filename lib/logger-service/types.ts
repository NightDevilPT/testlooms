// ==========================================
// Logger Service Types & Sensitive Field Patterns
// ==========================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogMeta {
  context?: string;
  [key: string]: unknown;
}

export type LogContextOrMeta = string | Record<string, unknown> | unknown;

export const SENSITIVE_KEYS_REGEX =
  /password|pass|secret|token|auth|authorization|credential|api_key|apikey|private_key|email_password|cookie|session|bearer/i;

export const REDACTED_MASK = "[REDACTED]";
