/**
 * TestLoom Dynamic Pattern & Mask Generator Utility
 * Zero-cost, lightweight token & mask resolver for test step inputs and assertions.
 */

export interface PatternBlock {
  id: string;
  type: "fixed" | "date" | "timestamp" | "randomNumber" | "randomLetters" | "envVariable";
  value?: string;
  length?: number;
  format?: string;
}

export const PATTERN_PRESETS = [
  {
    id: "pan",
    name: "Indian PAN Card",
    category: "Identity",
    description: "5 letters + 4 digits + 1 letter (Strict 10 Chars)",
    mask: "pattern:AAAAA{{timestamp:4}}A",
    example: "BKDPA4892K",
  },
  {
    id: "cin",
    name: "Indian CIN Number",
    category: "Corporate",
    description: "21-character Corporate Identity Number",
    mask: "pattern:U72200DL2024PTC{{timestamp:6}}",
    example: "U72200DL2024PTC492018",
  },
  {
    id: "phone_in",
    name: "Indian 10-Digit Mobile",
    category: "Contact",
    description: "Valid 10-digit mobile starting with 9",
    mask: "pattern:9#########",
    example: "9876543210",
  },
  {
    id: "email_unique",
    name: "Unique Sub-Addressed Email",
    category: "Account",
    description: "Gmail/Outlook sub-address with timestamp",
    mask: "pattern:qa+{{epochMs}}@testloom.io",
    example: "qa+1727540450123@testloom.io",
  },
  {
    id: "company",
    name: "Unique Company Name",
    category: "Corporate",
    description: "Company name with 4-digit uniqueness suffix",
    mask: "pattern:Company_{{timestamp:4}}",
    example: "Company_8492",
  },
  {
    id: "order_id",
    name: "Order / Invoice ID",
    category: "Ecommerce",
    description: "Prefix + Year + 6-digit random sequence",
    mask: "pattern:ORD-{{date:YYYY}}-{{random:6}}",
    example: "ORD-2026-849201",
  },
] as const;

const LETTERS_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LETTERS_LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const ALPHANUMERIC = LETTERS_UPPER + DIGITS;

function getRandomChar(set: string): string {
  return set[Math.floor(Math.random() * set.length)];
}

function getRandomString(length: number, set: string): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += getRandomChar(set);
  }
  return result;
}

/**
 * Format current date according to a basic format string
 */
function formatDate(date: Date, format: string): string {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  switch (format) {
    case "YYYY":
      return year;
    case "YYYYMMDD":
      return `${year}${month}${day}`;
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    case "YYYYMMDD_HHmmss":
      return `${year}${month}${day}_${hours}${minutes}${seconds}`;
    case "HHmmss":
      return `${hours}${minutes}${seconds}`;
    default:
      return `${year}${month}${day}`;
  }
}

/**
 * Detects if a string contains an environment variable token (e.g. {{env.KEY}} or {{KEY}})
 * Returns the extracted key if found, or null.
 */
export function extractEnvKeyFromValue(value?: string | null): string | null {
  if (!value) return null;
  const match = value.match(/\{\{(?:env\.|ENV\.|env:)?([A-Za-z0-9_]+)\}\}/);
  return match ? match[1] : null;
}

/**
 * Checks if a string contains any dynamic tokens or masks
 */
export function isDynamicValue(value?: string | null): boolean {
  if (!value) return false;
  return value.startsWith("pattern:") || /\{\{[^}]+\}\}/.test(value);
}

/**
 * Parse and generate a concrete string from a mask string
 */
export function generateFromMask(
  mask: string,
  envVariables?: Record<string, string>
): string {
  const now = new Date();
  const epochMs = now.getTime();
  const timestampSeconds = Math.floor(epochMs / 1000);

  // 1. Process environment variable tokens first if env map is provided
  let processed = mask;
  if (envVariables && Object.keys(envVariables).length > 0) {
    processed = processed.replace(
      /\{\{(?:env\.|ENV\.|env:)?([A-Za-z0-9_]+)\}\}/g,
      (match, key: string) => {
        if (envVariables[key] !== undefined) {
          return envVariables[key];
        }
        const foundKey = Object.keys(envVariables).find(
          (k) => k.toLowerCase() === key.toLowerCase()
        );
        if (foundKey && envVariables[foundKey] !== undefined) {
          return envVariables[foundKey];
        }
        return match;
      }
    );
  }

  // 2. Process explicit dynamic tokens inside {{ ... }}
  processed = processed.replace(/\{\{([^}]+)\}\}/g, (_match, tokenContent: string) => {
    const trimmed = tokenContent.trim();

    // Timestamp modulo token: e.g. timestamp:4 -> 4 digits
    const timestampMatch = trimmed.match(/^timestamp(?::(\d+))?$/);
    if (timestampMatch) {
      const len = timestampMatch[1] ? parseInt(timestampMatch[1], 10) : 10;
      const mod = Math.pow(10, len);
      const val = (epochMs % mod).toString().padStart(len, "0");
      return val;
    }

    // Full epoch milliseconds
    if (trimmed === "epochMs") {
      return epochMs.toString();
    }

    // Unix epoch seconds
    if (trimmed === "timestamp") {
      return timestampSeconds.toString();
    }

    // Date formatting: e.g. date:YYYYMMDD or date:YYYY-MM-DD
    const dateMatch = trimmed.match(/^date(?::([A-Za-z0-9_-]+))?$/);
    if (dateMatch) {
      const formatStr = dateMatch[1] || "YYYYMMDD";
      return formatDate(now, formatStr);
    }

    // Random digits: random:N
    const randomDigitsMatch = trimmed.match(/^random:(\d+)$/);
    if (randomDigitsMatch) {
      const len = parseInt(randomDigitsMatch[1], 10);
      return getRandomString(len, DIGITS);
    }

    // Random letters: randomAlpha:N
    const randomAlphaMatch = trimmed.match(/^randomAlpha:(\d+)$/);
    if (randomAlphaMatch) {
      const len = parseInt(randomAlphaMatch[1], 10);
      return getRandomString(len, LETTERS_UPPER);
    }

    // Keep token as-is if unhandled
    return `{{${trimmed}}}`;
  });

  // 3. Process individual mask characters (#, A, a, *)
  // Only evaluate mask characters when in pattern mode
  processed = processed.replace(/[#Aa*]/g, (match) => {
    switch (match) {
      case "#":
        return getRandomChar(DIGITS);
      case "A":
        return getRandomChar(LETTERS_UPPER);
      case "a":
        return getRandomChar(LETTERS_LOWER);
      case "*":
        return getRandomChar(ALPHANUMERIC);
      default:
        return match;
    }
  });

  return processed;
}

/**
 * Universal Resolver:
 * Resolves pattern strings, environment variables, or returns static value.
 */
export function resolveDynamicValue(
  rawValue?: string | null,
  envVariables?: Record<string, string>
): string {
  if (!rawValue) return "";

  let resolved = rawValue;

  // 1. Resolve environment variable tokens: e.g. {{env.API_KEY}}, {{ENV.KEY}}, or {{API_KEY}}
  if (envVariables && Object.keys(envVariables).length > 0) {
    resolved = resolved.replace(
      /\{\{(?:env\.|ENV\.|env:)?([A-Za-z0-9_]+)\}\}/g,
      (match, key: string) => {
        if (envVariables[key] !== undefined) {
          return envVariables[key];
        }
        const foundKey = Object.keys(envVariables).find(
          (k) => k.toLowerCase() === key.toLowerCase()
        );
        if (foundKey && envVariables[foundKey] !== undefined) {
          return envVariables[foundKey];
        }
        return match;
      }
    );
  }

  // 2. Handle pattern: prefix or remaining dynamic tokens
  if (resolved.startsWith("pattern:")) {
    const mask = resolved.substring(8);
    return generateFromMask(mask, envVariables);
  }

  // 3. If contains dynamic template tokens like {{epochMs}} or {{date:YYYYMMDD}}
  if (resolved.includes("{{")) {
    return generateFromMask(resolved, envVariables);
  }

  return resolved;
}

