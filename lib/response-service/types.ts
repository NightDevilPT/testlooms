// TestLoom API Response & Error Envelope Types

export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
}

export enum ErrorCode {
  BAD_REQUEST = "BAD_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  UNPROCESSABLE_ENTITY = "UNPROCESSABLE_ENTITY",
  TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
}

export interface ErrorDefinition {
  status: HttpStatus;
  code: ErrorCode;
  defaultMessage: string;
}

export const ERROR_REGISTRY: Record<ErrorCode, ErrorDefinition> = {
  [ErrorCode.BAD_REQUEST]: {
    status: HttpStatus.BAD_REQUEST,
    code: ErrorCode.BAD_REQUEST,
    defaultMessage: "Bad request payload or invalid parameters.",
  },
  [ErrorCode.UNAUTHORIZED]: {
    status: HttpStatus.UNAUTHORIZED,
    code: ErrorCode.UNAUTHORIZED,
    defaultMessage: "Authentication required to access this resource.",
  },
  [ErrorCode.FORBIDDEN]: {
    status: HttpStatus.FORBIDDEN,
    code: ErrorCode.FORBIDDEN,
    defaultMessage: "Access denied: insufficient permissions.",
  },
  [ErrorCode.NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    code: ErrorCode.NOT_FOUND,
    defaultMessage: "The requested resource was not found.",
  },
  [ErrorCode.CONFLICT]: {
    status: HttpStatus.CONFLICT,
    code: ErrorCode.CONFLICT,
    defaultMessage: "Resource state conflict or duplicate entity.",
  },
  [ErrorCode.UNPROCESSABLE_ENTITY]: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    code: ErrorCode.UNPROCESSABLE_ENTITY,
    defaultMessage: "Validation failed for request payload.",
  },
  [ErrorCode.TOO_MANY_REQUESTS]: {
    status: HttpStatus.TOO_MANY_REQUESTS,
    code: ErrorCode.TOO_MANY_REQUESTS,
    defaultMessage: "Rate limit exceeded. Please try again later.",
  },
  [ErrorCode.INTERNAL_SERVER_ERROR]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    defaultMessage: "An unexpected internal server error occurred.",
  },
  [ErrorCode.DATABASE_ERROR]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: ErrorCode.DATABASE_ERROR,
    defaultMessage: "A database constraint or connection error occurred.",
  },
};

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
  details?: unknown;
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

export interface FormattedValidationError {
  field: string;
  message: string;
}
