import type { ErrorCode } from "./codes";

export type AIHintSeverity = "recoverable" | "terminal" | "retry";

export interface AIHint {
  severity: AIHintSeverity;
  suggestedAction: string;
  retryAfterMs?: number;
  alternativeApproach?: string;
}

export interface ErrorContext {
  timestamp: string;
  agentId?: string;
  driverId?: string;
  correlationId?: string;
  requestId?: string;
}

export type ErrorContextInput = Omit<ErrorContext, "timestamp"> & {
  timestamp?: string;
};

export interface GatewayErrorPayload {
  code: ErrorCode;
  message: string;
  httpStatus: number;
  aiHint: AIHint;
  context?: ErrorContext;
  details?: Record<string, unknown>;
}

export interface GatewayErrorOptions {
  httpStatus?: number;
  aiHint?: AIHint;
  context?: ErrorContextInput;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export interface ValidationFieldError {
  path: string;
  message: string;
  code?: string;
}

export interface ValidationErrorDetails {
  fields: ValidationFieldError[];
}
