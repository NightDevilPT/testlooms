import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const SECRET_KEY_RAW =
  process.env.ENCRYPTION_SECRET ||
  process.env.JWT_SECRET ||
  "testloom-default-secret-key-32bytes-long!";

// Ensure key is exactly 32 bytes for AES-256
const ENCRYPTION_KEY = crypto
  .createHash("sha256")
  .update(SECRET_KEY_RAW)
  .digest();

export interface EnvironmentVariableEntry {
  key: string;
  value: string;
  isSecret: boolean;
}

export interface EncryptedVariableRecord {
  key: string;
  encryptedValue: string;
  iv: string;
  authTag: string;
  isSecret: boolean;
}

/**
 * Encrypt a plain string using AES-256-GCM
 */
export function encryptText(text: string): { encryptedValue: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return {
    encryptedValue: encrypted,
    iv: iv.toString("hex"),
    authTag,
  };
}

/**
 * Decrypt an AES-256-GCM encrypted payload
 */
export function decryptText(encryptedValue: string, ivHex: string, authTagHex: string): string {
  try {
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedValue, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return "[Decryption Failed]";
  }
}

/**
 * Encrypt an array of EnvironmentVariableEntry records to store safely in DB
 */
export function encryptVariables(entries: EnvironmentVariableEntry[]): EncryptedVariableRecord[] {
  return entries.map((entry) => {
    const { encryptedValue, iv, authTag } = encryptText(entry.value);
    return {
      key: entry.key.trim(),
      encryptedValue,
      iv,
      authTag,
      isSecret: Boolean(entry.isSecret),
    };
  });
}

/**
 * Decrypt stored JSON payload from DB back into plain EnvironmentVariableEntry array
 */
export function decryptVariables(rawPayload: unknown): EnvironmentVariableEntry[] {
  if (!rawPayload) {
    return [];
  }

  // Handle legacy object map format e.g. { "API_URL": "https://..." }
  if (!Array.isArray(rawPayload) && typeof rawPayload === "object") {
    return Object.entries(rawPayload as Record<string, unknown>).map(([key, val]) => {
      if (typeof val === "object" && val !== null && "value" in val) {
        const item = val as any;
        return {
          key: String(key),
          value: String(item.value || ""),
          isSecret: Boolean(item.isSecret),
        };
      }
      return {
        key: String(key),
        value: String(val ?? ""),
        isSecret: false,
      };
    });
  }

  if (!Array.isArray(rawPayload)) {
    return [];
  }

  return rawPayload.map((item: any) => {
    if (typeof item === "string") {
      return { key: item, value: "", isSecret: false };
    }
    // If legacy unencrypted JSON format:
    if (typeof item.value === "string" && !item.encryptedValue) {
      return {
        key: String(item.key || ""),
        value: String(item.value || ""),
        isSecret: Boolean(item.isSecret),
      };
    }

    // Decrypt AES-256-GCM payload
    const decryptedVal = decryptText(
      item.encryptedValue || "",
      item.iv || "",
      item.authTag || ""
    );

    return {
      key: String(item.key || ""),
      value: decryptedVal,
      isSecret: Boolean(item.isSecret),
    };
  });
}
