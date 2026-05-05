export const API_ERROR_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Nhom ma loi cho runtime de UI co the map sang modal phu hop.
export const RUNTIME_ERROR_STATUS = {
  UNKNOWN: 1000,
  RENDER: 1001,
  WINDOW: 1002,
  UNHANDLED_PROMISE: 1003,
  NETWORK: 1100,
} as const;

export const APP_ERROR_EVENT = "app-error";

export type ApiErrorStatus = number;
export type RuntimeErrorStatus = (typeof RUNTIME_ERROR_STATUS)[keyof typeof RUNTIME_ERROR_STATUS];
export type AppErrorStatus = ApiErrorStatus | RuntimeErrorStatus;

export type AppErrorSource = "api" | "runtime" | "unknown";

export interface AppError {
  name: string;
  message: string;
  status: AppErrorStatus;
  source: AppErrorSource;
  details?: unknown;
  stack?: string;
  cause?: unknown;
  timestamp: number;
}

export class ApiError extends Error {
  status: ApiErrorStatus;
  data: unknown;

  constructor(message: string, status: ApiErrorStatus, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return "Something went wrong";
}

// Chuan hoa moi loai loi ve cung mot shape de provider/modal xu ly tap trung.
export function toAppError(
  error: unknown,
  overrides: Partial<Omit<AppError, "timestamp">> = {}
): AppError {
  if (error instanceof ApiError) {
    return {
      name: error.name,
      message: error.message,
      status: error.status,
      source: "api",
      details: error.data,
      stack: error.stack,
      cause: error.cause,
      timestamp: Date.now(),
      ...overrides,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name || "RuntimeError",
      message: getErrorMessage(error),
      status: RUNTIME_ERROR_STATUS.UNKNOWN,
      source: "runtime",
      stack: error.stack,
      cause: error.cause,
      timestamp: Date.now(),
      ...overrides,
    };
  }

  return {
    name: "UnknownError",
    message: getErrorMessage(error),
    status: RUNTIME_ERROR_STATUS.UNKNOWN,
    source: "unknown",
    details: error,
    timestamp: Date.now(),
    ...overrides,
  };
}
