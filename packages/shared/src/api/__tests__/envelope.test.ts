/**
 * Tests for API Response Envelope Types.
 */

import { describe, expect, it } from "bun:test";
import {
  type ApiErrorResponse,
  type ApiListResponse,
  type ApiResponse,
  isApiErrorResponse,
  isApiListResponse,
  isApiResponse,
  isSuccessResponse,
  ObjectTypes,
} from "../envelope";

describe("ObjectTypes", () => {
  it("should have all expected object types", () => {
    expect(ObjectTypes.AGENT).toBe("agent");
    expect(ObjectTypes.CHECKPOINT).toBe("checkpoint");
    expect(ObjectTypes.RESERVATION).toBe("reservation");
    expect(ObjectTypes.LIST).toBe("list");
    expect(ObjectTypes.ERROR).toBe("error");
  });

  it("should be readonly/const", () => {
    // TypeScript would prevent reassignment, but we can verify values exist
    expect(Object.keys(ObjectTypes).length).toBeGreaterThan(10);
  });
});

describe("isApiResponse", () => {
  it("should return true for valid single resource response", () => {
    const response: ApiResponse<{ id: string }> = {
      object: "agent",
      data: { id: "agent_123" },
      requestId: "req_abc123",
      timestamp: "2024-01-15T10:30:00.000Z",
    };
    expect(isApiResponse(response)).toBe(true);
  });

  it("should return true for response with links", () => {
    const response: ApiResponse<{ id: string }> = {
      object: "checkpoint",
      data: { id: "cp_123" },
      requestId: "req_abc123",
      timestamp: "2024-01-15T10:30:00.000Z",
      links: {
        self: "/checkpoints/cp_123",
        agent: "/agents/agent_123",
      },
    };
    expect(isApiResponse(response)).toBe(true);
  });

  it("should return false for list response", () => {
    const listResponse = {
      object: "list",
      data: [],
      hasMore: false,
      url: "/agents",
      requestId: "req_abc123",
      timestamp: "2024-01-15T10:30:00.000Z",
    };
    expect(isApiResponse(listResponse)).toBe(false);
  });

  it("should return false for error response", () => {
    const errorResponse = {
      object: "error",
      error: { code: "TEST", message: "test" },
      requestId: "req_abc123",
      timestamp: "2024-01-15T10:30:00.000Z",
    };
    expect(isApiResponse(errorResponse)).toBe(false);
  });

  it("should return false for null", () => {
    expect(isApiResponse(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isApiResponse(undefined)).toBe(false);
  });

  it("should return false for primitives", () => {
    expect(isApiResponse("string")).toBe(false);
    expect(isApiResponse(123)).toBe(false);
    expect(isApiResponse(true)).toBe(false);
  });

  it("should return false for missing required fields", () => {
    expect(isApiResponse({ object: "agent" })).toBe(false);
    expect(isApiResponse({ object: "agent", data: {} })).toBe(false);
    expect(
      isApiResponse({ object: "agent", data: {}, requestId: "req_123" }),
    ).toBe(false);
  });
});

describe("isApiListResponse", () => {
  it("should return true for valid list response", () => {
    const response: ApiListResponse<{ id: string }> = {
      object: "list",
      data: [{ id: "1" }, { id: "2" }],
      hasMore: true,
      nextCursor: "cursor_xyz",
      total: 100,
      url: "/agents",
      requestId: "req_abc123",
      timestamp: "2024-01-15T10:30:00.000Z",
    };
    expect(isApiListResponse(response)).toBe(true);
  });

  it("should return true for empty list response", () => {
    const response: ApiListResponse<never> = {
      object: "list",
      data: [],
      hasMore: false,
      url: "/agents",
      requestId: "req_abc123",
      timestamp: "2024-01-15T10:30:00.000Z",
    };
    expect(isApiListResponse(response)).toBe(true);
  });

  it("should return true for list without optional fields", () => {
    const response = {
      object: "list",
      data: [{ id: "1" }],
      hasMore: false,
      url: "/agents",
      requestId: "req_abc123",
      timestamp: "2024-01-15T10:30:00.000Z",
    };
    expect(isApiListResponse(response)).toBe(true);
  });

  it("should return false for single resource response", () => {
    const response = {
      object: "agent",
      data: { id: "agent_123" },
      requestId: "req_abc123",
      timestamp: "2024-01-15T10:30:00.000Z",
    };
    expect(isApiListResponse(response)).toBe(false);
  });

  it("should return false for error response", () => {
    const response = {
      object: "error",
      error: { code: "TEST", message: "test" },
      requestId: "req_abc123",
      timestamp: "2024-01-15T10:30:00.000Z",
    };
    expect(isApiListResponse(response)).toBe(false);
  });

  it("should return false for missing required fields", () => {
    expect(isApiListResponse({ object: "list" })).toBe(false);
    expect(isApiListResponse({ object: "list", data: [] })).toBe(false);
    expect(
      isApiListResponse({ object: "list", data: [], hasMore: false }),
    ).toBe(false);
  });

  it("should return false when data is not an array", () => {
    expect(
      isApiListResponse({
        object: "list",
        data: {},
        hasMore: false,
        url: "/test",
        requestId: "req_123",
        timestamp: "2024-01-15T10:30:00.000Z",
      }),
    ).toBe(false);
  });
});

describe("isApiErrorResponse", () => {
  it("should return true for valid error response", () => {
    const response: ApiErrorResponse = {
      object: "error",
      error: {
        code: "AGENT_NOT_FOUND",
        message: "Agent not found",
        severity: "terminal",
        hint: "Check the agent ID",
        alternative: "List agents first",
      },
      requestId: "req_abc123",
      timestamp: "2024-01-15T10:30:00.000Z",
    };
    expect(isApiErrorResponse(response)).toBe(true);
  });

  it("should return true for minimal error response", () => {
    const response: ApiErrorResponse = {
      object: "error",
      error: {
        code: "VALIDATION_FAILED",
        message: "Invalid request",
      },
      requestId: "req_abc123",
      timestamp: "2024-01-15T10:30:00.000Z",
    };
    expect(isApiErrorResponse(response)).toBe(true);
  });

  it("should return true for error with param field", () => {
    const response: ApiErrorResponse = {
      object: "error",
      error: {
        code: "VALIDATION_FAILED",
        message: "Invalid value",
        param: "status",
        severity: "recoverable",
      },
      requestId: "req_abc123",
      timestamp: "2024-01-15T10:30:00.000Z",
    };
    expect(isApiErrorResponse(response)).toBe(true);
  });

  it("should return false for single resource response", () => {
    const response = {
      object: "agent",
      data: { id: "agent_123" },
      requestId: "req_abc123",
      timestamp: "2024-01-15T10:30:00.000Z",
    };
    expect(isApiErrorResponse(response)).toBe(false);
  });

  it("should return false for list response", () => {
    const response = {
      object: "list",
      data: [],
      hasMore: false,
      url: "/agents",
      requestId: "req_abc123",
      timestamp: "2024-01-15T10:30:00.000Z",
    };
    expect(isApiErrorResponse(response)).toBe(false);
  });

  it("should return false for missing error field", () => {
    expect(
      isApiErrorResponse({
        object: "error",
        requestId: "req_123",
        timestamp: "2024-01-15T10:30:00.000Z",
      }),
    ).toBe(false);
  });

  it("should return false for error with missing code", () => {
    expect(
      isApiErrorResponse({
        object: "error",
        error: { message: "test" },
        requestId: "req_123",
        timestamp: "2024-01-15T10:30:00.000Z",
      }),
    ).toBe(false);
  });

  it("should return false for error with missing message", () => {
    expect(
      isApiErrorResponse({
        object: "error",
        error: { code: "TEST" },
        requestId: "req_123",
        timestamp: "2024-01-15T10:30:00.000Z",
      }),
    ).toBe(false);
  });
});

describe("isSuccessResponse", () => {
  it("should return true for single resource response", () => {
    const response: ApiResponse<{ id: string }> = {
      object: "agent",
      data: { id: "agent_123" },
      requestId: "req_abc123",
      timestamp: "2024-01-15T10:30:00.000Z",
    };
    expect(isSuccessResponse(response)).toBe(true);
  });

  it("should return true for list response", () => {
    const response: ApiListResponse<{ id: string }> = {
      object: "list",
      data: [{ id: "1" }],
      hasMore: false,
      url: "/agents",
      requestId: "req_abc123",
      timestamp: "2024-01-15T10:30:00.000Z",
    };
    expect(isSuccessResponse(response)).toBe(true);
  });

  it("should return false for error response", () => {
    const response: ApiErrorResponse = {
      object: "error",
      error: {
        code: "TEST",
        message: "test",
      },
      requestId: "req_abc123",
      timestamp: "2024-01-15T10:30:00.000Z",
    };
    expect(isSuccessResponse(response)).toBe(false);
  });
});

describe("Type Compatibility", () => {
  it("should allow typed data in ApiResponse", () => {
    interface Agent {
      id: string;
      status: "ready" | "executing";
      model: string;
    }

    const response: ApiResponse<Agent> = {
      object: "agent",
      data: {
        id: "agent_123",
        status: "ready",
        model: "claude-3-opus",
      },
      requestId: "req_abc123",
      timestamp: "2024-01-15T10:30:00.000Z",
    };

    // TypeScript should allow accessing typed fields
    expect(response.data.id).toBe("agent_123");
    expect(response.data.status).toBe("ready");
  });

  it("should allow typed data in ApiListResponse", () => {
    interface Checkpoint {
      id: string;
      agentId: string;
      createdAt: string;
    }

    const response: ApiListResponse<Checkpoint> = {
      object: "list",
      data: [
        { id: "cp_1", agentId: "agent_123", createdAt: "2024-01-15T10:00:00Z" },
        { id: "cp_2", agentId: "agent_123", createdAt: "2024-01-15T10:30:00Z" },
      ],
      hasMore: false,
      url: "/agents/agent_123/checkpoints",
      requestId: "req_abc123",
      timestamp: "2024-01-15T10:30:00.000Z",
    };

    // TypeScript should allow accessing typed fields
    const firstCheckpoint = response.data[0];
    expect(firstCheckpoint?.id).toBe("cp_1");
  });

  it("should allow all severity levels in ApiError", () => {
    const terminalError: ApiErrorResponse = {
      object: "error",
      error: {
        code: "AGENT_TERMINATED",
        message: "Agent has terminated",
        severity: "terminal",
      },
      requestId: "req_1",
      timestamp: "2024-01-15T10:30:00.000Z",
    };

    const recoverableError: ApiErrorResponse = {
      object: "error",
      error: {
        code: "VALIDATION_FAILED",
        message: "Invalid input",
        severity: "recoverable",
      },
      requestId: "req_2",
      timestamp: "2024-01-15T10:30:00.000Z",
    };

    const retryError: ApiErrorResponse = {
      object: "error",
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests",
        severity: "retry",
      },
      requestId: "req_3",
      timestamp: "2024-01-15T10:30:00.000Z",
    };

    expect(terminalError.error.severity).toBe("terminal");
    expect(recoverableError.error.severity).toBe("recoverable");
    expect(retryError.error.severity).toBe("retry");
  });
});
