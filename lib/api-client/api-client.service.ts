import {
  ApiResponseEnvelope,
  SingleResourceSuccessEnvelope,
  PaginatedListSuccessEnvelope,
  FailureEnvelope,
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
   * Helper to build final URL with query parameters
   */
  private buildUrl(endpoint: string, params?: RequestOptions["params"]): string {
    const fullUrl = this.baseUrl
      ? `${this.baseUrl.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`
      : endpoint;

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
   * Core fetch execution method with credentials include (HTTP-only cookies)
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

    const response = await fetch(url, config);
    return (await response.json()) as T;
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
