/**
 * API Types and Utilities.
 *
 * Provides canonical response envelope types and utilities for
 * standardized API responses across all endpoints.
 */

export {
  // Object type constants
  ObjectTypes,
  type ObjectType,
  // Response envelope types
  type ApiResponse,
  type ApiListResponse,
  type ApiError,
  type ApiErrorResponse,
  type ApiResponseUnion,
  // Type guards
  isApiResponse,
  isApiListResponse,
  isApiErrorResponse,
  isSuccessResponse,
} from "./envelope";

export {
  // Request ID generation
  generateRequestId,
  // Wrapper options types
  type WrapResourceOptions,
  type WrapListOptions,
  type WrapErrorOptions,
  // Core wrapper functions
  wrapResource,
  wrapList,
  wrapError,
  // Convenience wrappers
  wrapCreated,
  wrapEmptyList,
  wrapValidationError,
  wrapNotFound,
} from "./response-utils";

export {
  // Pagination types
  type PaginationParams,
  type PaginationMeta,
  type PaginationDirection,
  type NormalizedPaginationParams,
  type PaginationDefaults,
  // Cursor types and constants
  type CursorPayload,
  CURSOR_EXPIRATION_MS,
  DEFAULT_PAGINATION,
  // Cursor functions
  encodeCursor,
  decodeCursor,
  createCursor,
  // Pagination utilities
  normalizePaginationParams,
  parsePaginationQuery,
  buildPaginationMeta,
} from "./pagination";
