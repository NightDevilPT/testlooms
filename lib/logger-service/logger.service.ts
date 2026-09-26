import {
  LogLevel,
  LogContextOrMeta,
  SENSITIVE_KEYS_REGEX,
  REDACTED_MASK,
} from "./types";

export class LoggerService {
  private static instance: LoggerService;

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  /**
   * Recursively masks sensitive fields in objects, arrays, and primitive data.
   */
  public maskSensitiveData(data: unknown, visited = new WeakSet()): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === "string") {
      return this.maskStringContent(data);
    }

    if (typeof data !== "object") {
      return data;
    }

    if (data instanceof Error) {
      return {
        name: data.name,
        message: this.maskStringContent(data.message),
        stack: data.stack ? this.maskStringContent(data.stack) : undefined,
      };
    }

    // Handle circular references
    if (visited.has(data as object)) {
      return "[CIRCULAR_REFERENCE]";
    }
    visited.add(data as object);

    if (Array.isArray(data)) {
      return data.map((item) => this.maskSensitiveData(item, visited));
    }

    const maskedObject: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEYS_REGEX.test(key)) {
        maskedObject[key] = REDACTED_MASK;
      } else {
        maskedObject[key] = this.maskSensitiveData(value, visited);
      }
    }

    return maskedObject;
  }

  /**
   * Masks sensitive substrings like Bearer tokens or URL query params.
   */
  private maskStringContent(str: string): string {
    if (!str) return str;

    // Mask Bearer tokens: "Bearer eyJhbG..." -> "Bearer [REDACTED]"
    let result = str.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer " + REDACTED_MASK);

    // Mask password in query parameters or json strings: "password=xxxx" -> "password=[REDACTED]"
    result = result.replace(
      /(password|pass|email_password|secret|token)=([^&\s]+)/gi,
      "$1=" + REDACTED_MASK
    );

    return result;
  }

  /**
   * Formats output log message with timestamp, level, scope context, and masked details.
   */
  private formatLog(
    level: LogLevel,
    message: string,
    context?: string,
    meta?: unknown
  ): string {
    const timestamp = new Date().toISOString();
    const formattedLevel = level.toUpperCase().padStart(5);
    const scope = context ? `[${context}]` : "";

    const sanitizedMessage = this.maskStringContent(message);
    let logLine = `[${timestamp}] [${formattedLevel}] ${scope} ${sanitizedMessage}`.trim();

    if (meta !== undefined && meta !== null) {
      const sanitizedMeta = this.maskSensitiveData(meta);
      if (typeof sanitizedMeta === "object" && Object.keys(sanitizedMeta as object).length === 0) {
        // Empty object, omit metadata stringification
      } else {
        try {
          const metaString =
            typeof sanitizedMeta === "string"
              ? sanitizedMeta
              : JSON.stringify(sanitizedMeta, null, 2);
          logLine += `\nMetadata: ${metaString}`;
        } catch {
          logLine += `\nMetadata: [Unserializable Object]`;
        }
      }
    }

    return logLine;
  }

  private dispatchLog(
    level: LogLevel,
    message: string,
    contextOrMeta?: LogContextOrMeta,
    metaParam?: unknown
  ): void {
    let context: string | undefined;
    let meta: unknown = metaParam;

    if (typeof contextOrMeta === "string") {
      context = contextOrMeta;
    } else if (contextOrMeta !== undefined) {
      if (meta === undefined) {
        meta = contextOrMeta;
      }
    }

    const formattedMessage = this.formatLog(level, message, context, meta);

    // Standard console output based on level (no icons or raw console usage outside this logger)
    switch (level) {
      case "debug":
        // eslint-disable-next-line no-console
        console.debug(formattedMessage);
        break;
      case "info":
        // eslint-disable-next-line no-console
        console.info(formattedMessage);
        break;
      case "warn":
        // eslint-disable-next-line no-console
        console.warn(formattedMessage);
        break;
      case "error":
        // eslint-disable-next-line no-console
        console.error(formattedMessage);
        break;
    }
  }

  public debug(message: string, contextOrMeta?: LogContextOrMeta, meta?: unknown): void {
    this.dispatchLog("debug", message, contextOrMeta, meta);
  }

  public info(message: string, contextOrMeta?: LogContextOrMeta, meta?: unknown): void {
    this.dispatchLog("info", message, contextOrMeta, meta);
  }

  public warn(message: string, contextOrMeta?: LogContextOrMeta, meta?: unknown): void {
    this.dispatchLog("warn", message, contextOrMeta, meta);
  }

  public error(message: string, contextOrMeta?: LogContextOrMeta, meta?: unknown): void {
    this.dispatchLog("error", message, contextOrMeta, meta);
  }
}

export const logger = LoggerService.getInstance();
export default logger;
