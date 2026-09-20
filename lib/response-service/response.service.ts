import { NextResponse } from "next/server";
import {
  ResponseMeta,
  PaginationInfo,
  SingleResourceSuccessEnvelope,
  PaginatedListSuccessEnvelope,
  FailureEnvelope,
} from "./types";

export class ResponseService {
  /**
   * Helper to construct response metadata.
   * Automatically extracts start time from Request header 'x-request-start-time' if present,
   * or falls back gracefully to the current timestamp.
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
  // Success Response Helpers
  // ==========================================

  /**
   * Builds a standard HTTP 200 OK success response for a single resource
   * Usage: return ResponseService.ok(project);
   */
  public static ok<T>(
    data: T,
    statusCode: number = 200,
    request?: Request
  ): NextResponse<SingleResourceSuccessEnvelope<T>> {
    const meta = this.createMeta(request);

    const body: SingleResourceSuccessEnvelope<T> = {
      success: true,
      statusCode,
      data,
      pagination: null,
      meta,
    };

    return NextResponse.json(body, { status: statusCode });
  }

  /**
   * Builds a standard HTTP 201 Created success response
   * Usage: return ResponseService.created(newProject);
   */
  public static created<T>(
    data: T,
    request?: Request
  ): NextResponse<SingleResourceSuccessEnvelope<T>> {
    return this.ok(data, 201, request);
  }

  /**
   * Builds a standard HTTP 200 success response for a paginated list collection
   * Usage: return ResponseService.paginated(projects, paginationInfo);
   */
  public static paginated<T>(
    data: T[],
    pagination: PaginationInfo,
    statusCode: number = 200,
    request?: Request
  ): NextResponse<PaginatedListSuccessEnvelope<T>> {
    const meta = this.createMeta(request);

    const body: PaginatedListSuccessEnvelope<T> = {
      success: true,
      statusCode,
      data,
      pagination,
      meta,
    };

    return NextResponse.json(body, { status: statusCode });
  }

  // ==========================================
  // Error Response Helpers
  // ==========================================

  /**
   * Builds a generic error response envelope
   */
  public static fail(
    statusCode: number,
    code: string,
    message: string,
    request?: Request
  ): NextResponse<FailureEnvelope> {
    const meta = this.createMeta(request);

    const body: FailureEnvelope = {
      success: false,
      statusCode,
      data: null,
      pagination: null,
      error: {
        code,
        message,
      },
      meta,
    };

    return NextResponse.json(body, { status: statusCode });
  }

  /**
   * HTTP 400 Bad Request
   * Usage: return ResponseService.badRequest("Invalid input parameters");
   */
  public static badRequest(
    message: string = "Bad request",
    code: string = "BAD_REQUEST",
    request?: Request
  ): NextResponse<FailureEnvelope> {
    return this.fail(400, code, message, request);
  }

  /**
   * HTTP 401 Unauthorized (Authentication required / invalid token)
   * Usage: return ResponseService.unauthorized("Authentication required");
   */
  public static unauthorized(
    message: string = "Authentication required",
    code: string = "UNAUTHORIZED",
    request?: Request
  ): NextResponse<FailureEnvelope> {
    return this.fail(401, code, message, request);
  }

  /**
   * HTTP 403 Forbidden (RBAC permission denied)
   * Usage: return ResponseService.forbidden("Admin role required");
   */
  public static forbidden(
    message: string = "Access denied: insufficient permissions",
    code: string = "FORBIDDEN",
    request?: Request
  ): NextResponse<FailureEnvelope> {
    return this.fail(403, code, message, request);
  }

  /**
   * HTTP 404 Not Found (Resource does not exist)
   * Usage: return ResponseService.notFound("Project not found");
   */
  public static notFound(
    message: string = "Resource not found",
    code: string = "NOT_FOUND",
    request?: Request
  ): NextResponse<FailureEnvelope> {
    return this.fail(404, code, message, request);
  }

  /**
   * HTTP 409 Conflict (Duplicate entity / state conflict)
   * Usage: return ResponseService.conflict("Project slug already exists");
   */
  public static conflict(
    message: string = "Resource state conflict",
    code: string = "CONFLICT",
    request?: Request
  ): NextResponse<FailureEnvelope> {
    return this.fail(409, code, message, request);
  }

  /**
   * HTTP 422 Unprocessable Entity (Zod input validation failure)
   * Usage: return ResponseService.unprocessable("Invalid target Base URL format");
   */
  public static unprocessable(
    message: string = "Validation failed for request payload",
    code: string = "UNPROCESSABLE_ENTITY",
    request?: Request
  ): NextResponse<FailureEnvelope> {
    return this.fail(422, code, message, request);
  }

  /**
   * HTTP 429 Too Many Requests (Rate limit exceeded)
   * Usage: return ResponseService.tooManyRequests("Rate limit exceeded");
   */
  public static tooManyRequests(
    message: string = "Rate limit exceeded. Please try again later.",
    code: string = "TOO_MANY_REQUESTS",
    request?: Request
  ): NextResponse<FailureEnvelope> {
    return this.fail(429, code, message, request);
  }

  /**
   * HTTP 500 Internal Server Error
   * Usage: return ResponseService.internalError("Database connection error");
   */
  public static internalError(
    message: string = "Internal server error",
    code: string = "INTERNAL_SERVER_ERROR",
    request?: Request
  ): NextResponse<FailureEnvelope> {
    return this.fail(500, code, message, request);
  }
}

export default ResponseService;
