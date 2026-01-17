/**
 * API Types and Utilities.
 *
 * Provides canonical response envelope types and utilities for
 * standardized API responses across all endpoints.
 */

export {
  type ApiError,
  type ApiErrorResponse,
  type ApiListResponse,
  // Response envelope types
  type ApiResponse,
  type ApiResponseUnion,
  // Error category types and utilities
  deriveErrorCategory,
  type ErrorCategory,
  isApiErrorResponse,
  isApiListResponse,
  // Type guards
  isApiResponse,
  isSuccessResponse,
  type ObjectType,
  // Object type constants
  ObjectTypes,
} from "./envelope";
export {
  buildPaginationMeta,
  CURSOR_EXPIRATION_MS,
  // Cursor types and constants
  type CursorPayload,
  createCursor,
  DEFAULT_PAGINATION,
  decodeCursor,
  // Cursor functions
  encodeCursor,
  type NormalizedPaginationParams,
  // Pagination utilities
  normalizePaginationParams,
  type PaginationDefaults,
  type PaginationDirection,
  type PaginationMeta,
  // Pagination types
  type PaginationParams,
  parsePaginationQuery,
} from "./pagination";
export {
  // Request ID generation
  generateRequestId,
  type WrapErrorOptions,
  type WrapListOptions,
  // Wrapper options types
  type WrapResourceOptions,
  // Convenience wrappers
  wrapCreated,
  wrapEmptyList,
  wrapError,
  wrapList,
  wrapNotFound,
  // Core wrapper functions
  wrapResource,
  wrapValidationError,
} from "./response-utils";
