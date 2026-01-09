import { AI_HINTS } from './ai-hints';
import { DEFAULT_ERROR_MESSAGES } from './codes';
import type { ErrorCode } from './codes';
import { GatewayError } from './factory';
import type { GatewayErrorPayload } from './types';

/** Returns true if the value is a GatewayError instance. */
export function isGatewayError(value: unknown): value is GatewayError {
  return value instanceof GatewayError;
}

/**
 * Serialize a GatewayError into a plain JSON payload.
 */
export function serializeGatewayError(error: GatewayError): GatewayErrorPayload {
  return {
    code: error.code,
    message: error.message,
    httpStatus: error.httpStatus,
    aiHint: error.aiHint,
    context: error.context,
    details: error.details
  };
}

/**
 * Deserialize a payload into a GatewayError instance.
 */
export function deserializeGatewayError(payload: GatewayErrorPayload): GatewayError {
  return new GatewayError(payload.code, payload.message, {
    httpStatus: payload.httpStatus,
    aiHint: payload.aiHint,
    context: payload.context,
    details: payload.details
  });
}

/**
 * Normalize unknown errors into a GatewayError.
 */
export function toGatewayError(
  error: unknown,
  fallbackCode: ErrorCode = 'SYSTEM_INTERNAL_ERROR'
): GatewayError {
  if (error instanceof GatewayError) {
    return error;
  }
  if (error instanceof Error) {
    return new GatewayError(fallbackCode, error.message, {
      cause: error,
      aiHint: AI_HINTS[fallbackCode]
    });
  }
  return new GatewayError(
    fallbackCode,
    DEFAULT_ERROR_MESSAGES[fallbackCode] ?? 'Unexpected error',
    { cause: error, aiHint: AI_HINTS[fallbackCode] }
  );
}
