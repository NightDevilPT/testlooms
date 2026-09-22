import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import {
  ResponseMeta,
  PaginationInfo,
  SingleResourceSuccessEnvelope,
  PaginatedListSuccessEnvelope,
  FailureEnvelope,
  HttpStatus,
  ErrorCode,
  ERROR_REGISTRY,
  FormattedValidationError,
} from "./types";

/**
 * Clean, Central Response & Error Handling Service for TestLoom API Endpoints
 */
export class ResponseService {
  /**
   * Helper to construct response timing metadata.
   * Reads start timestamp from 'x-request-start-time' header set by proxy.ts
   */
  public static createMeta(requestOrStartMs?: Request | number): ResponseMeta {
    const endedAtDate = new Date();
    const endedAt = endedAtDate.toISOString();

    let startMs = endedAtDate.getTime();
    if (typeof requestOrStartMs === "number") {
      startMs = requestOrStartMs;
    } else if (requestOrStartMs && "headers" in requestOrStartMs) {
      const headerStartTime = requestOrStartMs.headers.get("x-request-start-time");
      if (headerStartTime) {
        const parsed = parseInt(headerStartTime, 10);
        if (!isNaN(parsed) && parsed > 0) {
          startMs = parsed;
        }
      }
    }

    const startedAt = new Date(startMs).toISOString();
    const responseTimeMs = Math.max(0, endedAtDate.getTime() - startMs);

    return {
      responseTimeMs,
      startedAt,
      endedAt,
    };
  }

  // ==========================================
  // Success Response Builders
  // ==========================================

  public static ok<T>(
    data: T,
    status: HttpStatus = HttpStatus.OK,
    request?: Request
  ): NextResponse<SingleResourceSuccessEnvelope<T>> {
    const meta = this.createMeta(request);
    const body: SingleResourceSuccessEnvelope<T> = {
      success: true,
      statusCode: status,
      data,
      pagination: null,
      meta,
    };
    return NextResponse.json(body, { status });
  }

  public static created<T>(
    data: T,
    request?: Request
  ): NextResponse<SingleResourceSuccessEnvelope<T>> {
    return this.ok(data, HttpStatus.CREATED, request);
  }

  public static paginated<T>(
    data: T[],
    pagination: PaginationInfo,
    status: HttpStatus = HttpStatus.OK,
    request?: Request
  ): NextResponse<PaginatedListSuccessEnvelope<T>> {
    const meta = this.createMeta(request);
    const body: PaginatedListSuccessEnvelope<T> = {
      success: true,
      statusCode: status,
      data,
      pagination,
      meta,
    };
    return NextResponse.json(body, { status });
  }

  // ==========================================
  // Data-Driven Error Response Builders (DRY)
  // ==========================================

  /**
   * Universal failure envelope builder.
   * Automatically resolves HTTP status code and default message from ERROR_REGISTRY map.
   */
  public static fail(
    errorCode: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    message?: string,
    request?: Request,
    details?: unknown
  ): NextResponse<FailureEnvelope> {
    const errorDef = ERROR_REGISTRY[errorCode] || ERROR_REGISTRY[ErrorCode.INTERNAL_SERVER_ERROR];
    const status = errorDef.status;
    const finalMessage = message || errorDef.defaultMessage;
    const meta = this.createMeta(request);

    const body: FailureEnvelope = {
      success: false,
      statusCode: status,
      data: null,
      pagination: null,
      error: {
        code: errorDef.code,
        message: finalMessage,
        ...(details ? { details } : {}),
      },
      meta,
    };

    return NextResponse.json(body, { status });
  }

  // Convenient HTTP Failure Aliases
  public static badRequest(message?: string, request?: Request, details?: unknown) {
    return this.fail(ErrorCode.BAD_REQUEST, message, request, details);
  }

  public static unauthorized(message?: string, request?: Request) {
    return this.fail(ErrorCode.UNAUTHORIZED, message, request);
  }

  public static forbidden(message?: string, request?: Request) {
    return this.fail(ErrorCode.FORBIDDEN, message, request);
  }

  public static notFound(message?: string, request?: Request) {
    return this.fail(ErrorCode.NOT_FOUND, message, request);
  }

  public static conflict(message?: string, request?: Request) {
    return this.fail(ErrorCode.CONFLICT, message, request);
  }

  public static unprocessable(message?: string, request?: Request, details?: unknown) {
    return this.fail(ErrorCode.UNPROCESSABLE_ENTITY, message, request, details);
  }

  public static tooManyRequests(message?: string, request?: Request) {
    return this.fail(ErrorCode.TOO_MANY_REQUESTS, message, request);
  }

  public static internalError(message?: string, request?: Request) {
    return this.fail(ErrorCode.INTERNAL_SERVER_ERROR, message, request);
  }

  // ==========================================
  // Centralized Error Handling Strategy
  // ==========================================

  /**
   * Universal Exception Handler for Route Handlers & Middleware.
   * Intercepts ZodError, PrismaError, or unknown Errors and maps to FailureEnvelope.
   */
  public static handleError(error: unknown, request?: Request): NextResponse<FailureEnvelope> {
    if (error instanceof ZodError) {
      const validationErrors: FormattedValidationError[] = error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      const summary = validationErrors.length > 0
        ? `Validation failed: ${validationErrors[0].field} - ${validationErrors[0].message}`
        : "Validation failed";

      return this.unprocessable(summary, request, validationErrors);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2002": {
          const target = (error.meta?.target as string[])?.join(", ") || "field";
          return this.conflict(`A record with this ${target} already exists.`, request);
        }
        case "P2025": {
          return this.notFound("The requested database record was not found.", request);
        }
        default: {
          console.error("[ResponseService] Prisma Known Request Error:", error.code, error.message);
          return this.fail(ErrorCode.DATABASE_ERROR, "A database constraint error occurred.", request);
        }
      }
    }

    if (error instanceof Error) {
      console.error("[ResponseService] Unhandled Exception:", error.name, error.message, error.stack);
      const msg = process.env.NODE_ENV === "development" ? error.message : undefined;
      return this.internalError(msg, request);
    }

    console.error("[ResponseService] Unknown Exception Object:", error);
    return this.internalError(undefined, request);
  }
}

export default ResponseService;
