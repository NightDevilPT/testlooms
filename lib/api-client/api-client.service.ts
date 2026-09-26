import {
  ApiResponseEnvelope,
  SingleResourceSuccessEnvelope,
  PaginatedListSuccessEnvelope,
  FailureEnvelope,
  HttpStatus,
  ErrorCode,
} from "@/lib/response-service/types";
import { RequestOptions, ApiClientConfig } from "./types";

export class ApiClientService {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? (process.env.NEXT_PUBLIC_API_BASE_URL || "");
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...(config.defaultHeaders ?? {}),
    };
  }

  /**
   * Helper to build final URL with query parameters.
   * Guarantees a leading slash on endpoints when relative.
   */
  private buildUrl(endpoint: string, params?: RequestOptions["params"]): string {
    const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const fullUrl = this.baseUrl
      ? `${this.baseUrl.replace(/\/$/, "")}${normalizedEndpoint}`
      : normalizedEndpoint;

    if (!params) return fullUrl;

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `${fullUrl}?${queryString}` : fullUrl;
  }

  /**
   * Core fetch execution method with credentials include (HTTP-only cookies).
   * Safely handles non-JSON (e.g. HTML 404/500) responses.
   */
  private async request<T>(
    endpoint: string,
    method: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = this.buildUrl(endpoint, options.params);

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(options.headers ?? {}),
    };

    if (options.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }

    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    if (isFormData) {
      delete headers["Content-Type"];
    }

    const config: RequestInit = {
      method,
      headers,
      credentials: "include", // Always include cookies for session authentication
      ...(options as Omit<RequestInit, "headers">),
    };

    if (body !== undefined) {
      config.body = isFormData ? (body as FormData) : JSON.stringify(body);
    }

    try {
      const response = await fetch(url, config);
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        return (await response.json()) as T;
      }

      // Safe fallback for HTML (404/500) or non-JSON responses
      const textResponse = await response.text();
      const failureObj: FailureEnvelope = {
        success: false,
        statusCode: response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        data: null,
        pagination: null,
        error: {
          code: response.status === 404 ? ErrorCode.NOT_FOUND : ErrorCode.INTERNAL_SERVER_ERROR,
          message:
            response.status === 404
              ? `API endpoint not found: ${url}`
              : `Server returned non-JSON status ${response.status}`,
          details: textResponse.substring(0, 300),
        },
        meta: {
          responseTimeMs: 0,
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
        },
      };

      return failureObj as unknown as T;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Network error";
      const failureObj: FailureEnvelope = {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        data: null,
        pagination: null,
        error: {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: errorMessage,
        },
        meta: {
          responseTimeMs: 0,
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
        },
      };

      return failureObj as unknown as T;
    }
  }

  // ==========================================
  // Core HTTP Methods
  // ==========================================

  public async get<T>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<SingleResourceSuccessEnvelope<T> | PaginatedListSuccessEnvelope<T> | FailureEnvelope> {
    return this.request<ApiResponseEnvelope<T>>(endpoint, "GET", undefined, options);
  }

  public async post<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<SingleResourceSuccessEnvelope<T> | FailureEnvelope> {
    return this.request<SingleResourceSuccessEnvelope<T> | FailureEnvelope>(
      endpoint,
      "POST",
      body,
      options
    );
  }

  public async put<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<SingleResourceSuccessEnvelope<T> | FailureEnvelope> {
    return this.request<SingleResourceSuccessEnvelope<T> | FailureEnvelope>(
      endpoint,
      "PUT",
      body,
      options
    );
  }

  public async patch<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<SingleResourceSuccessEnvelope<T> | FailureEnvelope> {
    return this.request<SingleResourceSuccessEnvelope<T> | FailureEnvelope>(
      endpoint,
      "PATCH",
      body,
      options
    );
  }

  public async delete<T>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<SingleResourceSuccessEnvelope<T> | FailureEnvelope> {
    return this.request<SingleResourceSuccessEnvelope<T> | FailureEnvelope>(
      endpoint,
      "DELETE",
      undefined,
      options
    );
  }
}

export const apiClient = new ApiClientService();
export default apiClient;
