export interface RequestOptions extends Omit<RequestInit, "body" | "method"> {
  params?: Record<string, string | number | boolean | undefined | null>;
  idempotencyKey?: string;
  headers?: Record<string, string>;
}

export interface ApiClientConfig {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
}
