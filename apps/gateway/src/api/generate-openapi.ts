/**
 * OpenAPI Specification Generator
 *
 * Generates a complete OpenAPI 3.1 specification from the
 * registered Zod schemas and route definitions.
 */

import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  AgentListResponseSchema,
  AgentResponseSchema,
  ApiErrorResponseSchema,
  CheckpointListResponseSchema,
  CheckpointResponseSchema,
  ConflictListResponseSchema,
  CreateCheckpointRequestSchema,
  CreateNotificationRequestSchema,
  CreatePipelineRequestSchema,
  CreateReservationRequestSchema,
  HealthCheckResponseSchema,
  InterruptAgentRequestSchema,
  NotificationListResponseSchema,
  PaginationQuerySchema,
  PipelineResponseSchema,
  ReservationResponseSchema,
  RestoreCheckpointRequestSchema,
  registry,
  SendMessageRequestSchema,
  SpawnAgentRequestSchema,
} from "./schemas";

// ============================================================================
// Route Definitions
// ============================================================================

// Health endpoint
registry.registerPath({
  method: "get",
  path: "/health",
  summary: "Health check",
  description: "Returns the current health status of the API server.",
  tags: ["System"],
  responses: {
    200: {
      description: "Server is healthy",
      content: {
        "application/json": {
          schema: HealthCheckResponseSchema,
        },
      },
    },
  },
});

// ============================================================================
// Agent Routes
// ============================================================================

registry.registerPath({
  method: "get",
  path: "/agents",
  summary: "List agents",
  description:
    "Returns a paginated list of all agents accessible to the authenticated user.",
  tags: ["Agents"],
  request: {
    query: PaginationQuerySchema.extend({
      status: z
        .enum(["spawning", "ready", "busy", "terminated", "error"])
        .optional()
        .openapi({
          description: "Filter by agent status",
        }),
    }),
  },
  responses: {
    200: {
      description: "List of agents",
      content: {
        "application/json": {
          schema: AgentListResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/agents",
  summary: "Spawn a new agent",
  description: "Creates and starts a new AI agent in the specified directory.",
  tags: ["Agents"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: SpawnAgentRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Agent created successfully",
      content: {
        "application/json": {
          schema: AgentResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid request body",
      content: {
        "application/json": {
          schema: ApiErrorResponseSchema,
        },
      },
    },
    409: {
      description: "Agent with this ID already exists",
      content: {
        "application/json": {
          schema: ApiErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/agents/{agentId}",
  summary: "Get agent details",
  description: "Returns detailed information about a specific agent.",
  tags: ["Agents"],
  request: {
    params: z.object({
      agentId: z.string().openapi({
        description: "Agent identifier",
        example: "agent_abc123",
      }),
    }),
  },
  responses: {
    200: {
      description: "Agent details",
      content: {
        "application/json": {
          schema: AgentResponseSchema,
        },
      },
    },
    404: {
      description: "Agent not found",
      content: {
        "application/json": {
          schema: ApiErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/agents/{agentId}/messages",
  summary: "Send message to agent",
  description:
    "Sends a message to the agent and optionally streams the response.",
  tags: ["Agents"],
  request: {
    params: z.object({
      agentId: z.string().openapi({
        description: "Agent identifier",
      }),
    }),
    body: {
      required: true,
      content: {
        "application/json": {
          schema: SendMessageRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Message sent successfully",
      content: {
        "application/json": {
          schema: z.object({
            object: z.literal("message"),
            data: z.object({
              response: z.string(),
            }),
            requestId: z.string(),
            timestamp: z.string(),
          }),
        },
      },
    },
    404: {
      description: "Agent not found",
      content: {
        "application/json": {
          schema: ApiErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/agents/{agentId}/interrupt",
  summary: "Interrupt agent",
  description: "Sends an interrupt signal to the agent.",
  tags: ["Agents"],
  request: {
    params: z.object({
      agentId: z.string(),
    }),
    body: {
      required: false,
      content: {
        "application/json": {
          schema: InterruptAgentRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Interrupt signal sent",
      content: {
        "application/json": {
          schema: AgentResponseSchema,
        },
      },
    },
    404: {
      description: "Agent not found",
      content: {
        "application/json": {
          schema: ApiErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/agents/{agentId}",
  summary: "Terminate agent",
  description: "Terminates and removes an agent.",
  tags: ["Agents"],
  request: {
    params: z.object({
      agentId: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Agent terminated",
      content: {
        "application/json": {
          schema: AgentResponseSchema,
        },
      },
    },
    404: {
      description: "Agent not found",
      content: {
        "application/json": {
          schema: ApiErrorResponseSchema,
        },
      },
    },
  },
});

// ============================================================================
// Checkpoint Routes
// ============================================================================

registry.registerPath({
  method: "get",
  path: "/agents/{agentId}/checkpoints",
  summary: "List agent checkpoints",
  description: "Returns a list of checkpoints for the specified agent.",
  tags: ["Checkpoints"],
  request: {
    params: z.object({
      agentId: z.string(),
    }),
    query: PaginationQuerySchema,
  },
  responses: {
    200: {
      description: "List of checkpoints",
      content: {
        "application/json": {
          schema: CheckpointListResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/agents/{agentId}/checkpoints",
  summary: "Create checkpoint",
  description: "Creates a new checkpoint capturing the current agent state.",
  tags: ["Checkpoints"],
  request: {
    params: z.object({
      agentId: z.string(),
    }),
    body: {
      required: false,
      content: {
        "application/json": {
          schema: CreateCheckpointRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Checkpoint created",
      content: {
        "application/json": {
          schema: CheckpointResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/agents/{agentId}/checkpoints/restore",
  summary: "Restore checkpoint",
  description: "Restores the agent to a previous checkpoint state.",
  tags: ["Checkpoints"],
  request: {
    params: z.object({
      agentId: z.string(),
    }),
    body: {
      required: true,
      content: {
        "application/json": {
          schema: RestoreCheckpointRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Checkpoint restored",
      content: {
        "application/json": {
          schema: AgentResponseSchema,
        },
      },
    },
  },
});

// ============================================================================
// Reservation Routes
// ============================================================================

registry.registerPath({
  method: "post",
  path: "/reservations",
  summary: "Create file reservation",
  description:
    "Creates a reservation to prevent concurrent edits to specified files.",
  tags: ["Reservations"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: CreateReservationRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Reservation created",
      content: {
        "application/json": {
          schema: ReservationResponseSchema,
        },
      },
    },
    409: {
      description: "File conflict - files already reserved",
      content: {
        "application/json": {
          schema: ApiErrorResponseSchema,
        },
      },
    },
  },
});

// ============================================================================
// Conflict Routes
// ============================================================================

registry.registerPath({
  method: "get",
  path: "/conflicts",
  summary: "List conflicts",
  description: "Returns a list of detected conflicts between agents.",
  tags: ["Conflicts"],
  request: {
    query: PaginationQuerySchema.extend({
      status: z
        .enum(["pending", "resolved", "escalated", "auto_resolved"])
        .optional(),
    }),
  },
  responses: {
    200: {
      description: "List of conflicts",
      content: {
        "application/json": {
          schema: ConflictListResponseSchema,
        },
      },
    },
  },
});

// ============================================================================
// Notification Routes
// ============================================================================

registry.registerPath({
  method: "get",
  path: "/notifications",
  summary: "List notifications",
  description: "Returns a paginated list of notifications for the user.",
  tags: ["Notifications"],
  request: {
    query: PaginationQuerySchema.extend({
      unreadOnly: z.coerce.boolean().optional().openapi({
        description: "Only return unread notifications",
      }),
      category: z
        .enum([
          "agents",
          "coordination",
          "tasks",
          "costs",
          "security",
          "system",
        ])
        .optional(),
    }),
  },
  responses: {
    200: {
      description: "List of notifications",
      content: {
        "application/json": {
          schema: NotificationListResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/notifications",
  summary: "Create notification",
  description: "Creates a new notification for a user.",
  tags: ["Notifications"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: CreateNotificationRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Notification created",
      content: {
        "application/json": {
          schema: z.object({
            object: z.literal("notification"),
            data: z.object({
              id: z.string(),
            }),
            requestId: z.string(),
            timestamp: z.string(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/notifications/{notificationId}/read",
  summary: "Mark notification as read",
  description: "Marks a notification as read.",
  tags: ["Notifications"],
  request: {
    params: z.object({
      notificationId: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Notification marked as read",
      content: {
        "application/json": {
          schema: z.object({
            object: z.literal("notification"),
            data: z.object({
              success: z.boolean(),
            }),
            requestId: z.string(),
            timestamp: z.string(),
          }),
        },
      },
    },
  },
});

// ============================================================================
// Pipeline Routes
// ============================================================================

registry.registerPath({
  method: "post",
  path: "/pipelines",
  summary: "Create pipeline",
  description: "Creates a new multi-step pipeline for agent orchestration.",
  tags: ["Pipelines"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: CreatePipelineRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Pipeline created",
      content: {
        "application/json": {
          schema: PipelineResponseSchema,
        },
      },
    },
  },
});

// ============================================================================
// OpenAPI Document Generator
// ============================================================================

/**
 * Generate the complete OpenAPI 3.1 specification.
 */
export function generateOpenAPISpec() {
  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Flywheel Gateway API",
      version: "1.0.0",
      description: `
# Flywheel Gateway API

The Flywheel Gateway provides a unified REST API for managing AI agents,
sessions, checkpoints, and real-time coordination.

## Authentication

All endpoints require Bearer token authentication:

\`\`\`
Authorization: Bearer <your-api-key>
\`\`\`

## Rate Limiting

API requests are limited to 1000 requests per minute per API key.
Rate limit headers are included in all responses:

- \`X-RateLimit-Limit\`: Maximum requests per window
- \`X-RateLimit-Remaining\`: Remaining requests in current window
- \`X-RateLimit-Reset\`: Unix timestamp when the window resets

## Pagination

List endpoints use cursor-based pagination:

- \`limit\`: Number of items per page (1-100, default 20)
- \`cursor\`: Pagination cursor from previous response

Responses include \`hasMore\` and \`nextCursor\` for navigation.

## Error Handling

All errors follow a consistent structure with:
- \`code\`: Machine-readable error code
- \`message\`: Human-readable description
- \`hint\`: Suggested action for AI agents
- \`severity\`: Error severity (terminal, recoverable, retry)

## WebSocket

Real-time updates are available via WebSocket at \`/ws\`.
See the WebSocket documentation for event types and subscription.
      `.trim(),
      contact: {
        name: "Flywheel Gateway Support",
        email: "support@flywheel.dev",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local development",
      },
      {
        url: "https://api.flywheel.dev/v1",
        description: "Production",
      },
    ],
    tags: [
      {
        name: "System",
        description: "System health and status endpoints",
      },
      {
        name: "Agents",
        description: "Agent lifecycle and communication",
      },
      {
        name: "Checkpoints",
        description: "Agent state checkpoints for rollback",
      },
      {
        name: "Reservations",
        description: "File reservation to prevent edit conflicts",
      },
      {
        name: "Conflicts",
        description: "Conflict detection and resolution",
      },
      {
        name: "Notifications",
        description: "User notification management",
      },
      {
        name: "Pipelines",
        description: "Multi-step agent orchestration pipelines",
      },
    ],
    security: [
      {
        bearerAuth: [],
      },
    ],
  });
}

/**
 * Get OpenAPI spec as formatted JSON string.
 */
export function getOpenAPISpecJson(): string {
  return JSON.stringify(generateOpenAPISpec(), null, 2);
}
