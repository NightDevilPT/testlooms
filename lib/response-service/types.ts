// TestLoom Response Envelope Types

export interface ResponseMeta {
  responseTimeMs: number;
  startedAt: string;
  endedAt: string;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
}

export interface SingleResourceSuccessEnvelope<T> {
  success: true;
  statusCode: number;
  data: T;
  pagination: null;
  meta: ResponseMeta;
}

export interface PaginatedListSuccessEnvelope<T> {
  success: true;
  statusCode: number;
  data: T[];
  pagination: PaginationInfo;
  meta: ResponseMeta;
}

export interface FailureEnvelope {
  success: false;
  statusCode: number;
  data: null;
  pagination: null;
  error: ApiErrorPayload;
  meta: ResponseMeta;
}

export type ApiResponseEnvelope<T> =
  | SingleResourceSuccessEnvelope<T>
  | PaginatedListSuccessEnvelope<T>
  | FailureEnvelope;
