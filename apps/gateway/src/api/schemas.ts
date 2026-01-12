/**
 * OpenAPI Schema Registry
 *
 * Centralizes Zod schemas with OpenAPI metadata for automatic
 * OpenAPI specification generation.
 */

import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// Extend Zod with OpenAPI methods
extendZodWithOpenApi(z);

// Create the global registry
export const registry = new OpenAPIRegistry();

// ============================================================================
// Common Types
// ============================================================================

export const TimestampSchema = z.string().datetime().openapi({
  description: "ISO 8601 timestamp",
  example: "2024-01-15T10:30:00.000Z",
});

export const RequestIdSchema = z.string().openapi({
  description: "Unique request identifier for debugging",
  example: "req_abc123xyz",
});

// ============================================================================
// Response Envelope Schemas
// ============================================================================

export const ApiErrorSchema = z
  .object({
    code: z.string().openapi({
      description: "Error code from the error taxonomy",
      example: "AGENT_NOT_FOUND",
    }),
    message: z.string().openapi({
      description: "Human-readable error message",
      example: "Agent agent_123 not found",
    }),
    severity: z.enum(["terminal", "recoverable", "retry"]).optional().openapi({
      description: "Error severity for AI agents",
    }),
    hint: z.string().optional().openapi({
      description: "Suggested action to resolve the error",
    }),
    alternative: z.string().optional().openapi({
      description: "Alternative approach if current request cannot succeed",
    }),
    example: z.unknown().optional().openapi({
      description: "Example of valid input that would succeed",
    }),
    param: z.string().optional().openapi({
      description: "Specific field that caused the error",
    }),
    details: z.record(z.unknown()).optional().openapi({
      description: "Additional error details",
    }),
  })
  .openapi("ApiError");

registry.register("ApiError", ApiErrorSchema);

export const ApiErrorResponseSchema = z
  .object({
    object: z.literal("error").openapi({
      description: "Always 'error' for error responses",
    }),
    error: ApiErrorSchema,
    requestId: RequestIdSchema,
    timestamp: TimestampSchema,
  })
  .openapi("ApiErrorResponse");

registry.register("ApiErrorResponse", ApiErrorResponseSchema);

// ============================================================================
// Agent Schemas
// ============================================================================

export const AgentStateSchema = z
  .enum(["spawning", "ready", "busy", "terminated", "error"])
  .openapi({
    description: "Current state of the agent",
  });

registry.register("AgentState", AgentStateSchema);

export const SpawnAgentRequestSchema = z
  .object({
    workingDirectory: z.string().min(1).openapi({
      description: "Absolute path to the agent working directory",
      example: "/home/user/project",
    }),
    agentId: z.string().min(1).optional().openapi({
      description: "Custom agent ID (auto-generated if not provided)",
    }),
    systemPrompt: z.string().min(1).optional().openapi({
      description: "System prompt for the agent",
    }),
    timeout: z.number().min(1000).max(86400000).optional().openapi({
      description: "Timeout in milliseconds",
      default: 300000,
    }),
    maxTokens: z.number().min(1000).max(1000000).optional().openapi({
      description: "Maximum tokens for agent responses",
    }),
  })
  .openapi("SpawnAgentRequest");

registry.register("SpawnAgentRequest", SpawnAgentRequestSchema);

export const SendMessageRequestSchema = z
  .object({
    type: z.enum(["user", "system"]).openapi({
      description: "Message type",
    }),
    content: z.string().min(1).openapi({
      description: "Message content to send to the agent",
    }),
    stream: z.boolean().optional().openapi({
      description: "Whether to stream the response",
      default: false,
    }),
  })
  .openapi("SendMessageRequest");

registry.register("SendMessageRequest", SendMessageRequestSchema);

export const InterruptAgentRequestSchema = z
  .object({
    signal: z.enum(["SIGINT", "SIGTSTP", "SIGCONT"]).default("SIGINT").openapi({
      description: "Unix signal to send",
    }),
  })
  .openapi("InterruptAgentRequest");

registry.register("InterruptAgentRequest", InterruptAgentRequestSchema);

export const AgentSchema = z
  .object({
    agentId: z.string().openapi({
      description: "Unique agent identifier",
      example: "agent_abc123",
    }),
    state: AgentStateSchema,
    driver: z.string().openapi({
      description: "Agent driver type",
      example: "sdk",
    }),
    workingDirectory: z.string().openapi({
      description: "Agent working directory path",
    }),
    pid: z.number().optional().openapi({
      description: "Process ID of the agent",
    }),
    createdAt: TimestampSchema,
    lastActivityAt: TimestampSchema.optional(),
  })
  .openapi("Agent");

registry.register("Agent", AgentSchema);

// ============================================================================
// Checkpoint Schemas
// ============================================================================

export const CreateCheckpointRequestSchema = z
  .object({
    name: z.string().min(1).max(100).optional().openapi({
      description: "Human-readable name for the checkpoint",
      example: "before-refactoring",
    }),
    description: z.string().max(500).optional().openapi({
      description: "Description of what the checkpoint captures",
    }),
  })
  .openapi("CreateCheckpointRequest");

registry.register("CreateCheckpointRequest", CreateCheckpointRequestSchema);

export const RestoreCheckpointRequestSchema = z
  .object({
    checkpointId: z.string().openapi({
      description: "ID of the checkpoint to restore",
    }),
    resumeSession: z.boolean().optional().openapi({
      description: "Whether to resume the agent session after restore",
      default: false,
    }),
  })
  .openapi("RestoreCheckpointRequest");

registry.register("RestoreCheckpointRequest", RestoreCheckpointRequestSchema);

export const CheckpointSchema = z
  .object({
    id: z.string().openapi({
      description: "Unique checkpoint identifier",
    }),
    agentId: z.string().openapi({
      description: "ID of the agent this checkpoint belongs to",
    }),
    name: z.string().optional().openapi({
      description: "Human-readable checkpoint name",
    }),
    description: z.string().optional().openapi({
      description: "Checkpoint description",
    }),
    createdAt: TimestampSchema,
    sizeBytes: z.number().optional().openapi({
      description: "Size of the checkpoint in bytes",
    }),
  })
  .openapi("Checkpoint");

registry.register("Checkpoint", CheckpointSchema);

// ============================================================================
// Reservation Schemas
// ============================================================================

export const CreateReservationRequestSchema = z
  .object({
    files: z
      .array(z.string())
      .min(1)
      .openapi({
        description: "List of file paths to reserve",
        example: ["/src/index.ts", "/src/utils.ts"],
      }),
    ttlSeconds: z.number().min(60).max(86400).optional().openapi({
      description: "Time-to-live in seconds",
      default: 3600,
    }),
    reason: z.string().max(500).optional().openapi({
      description: "Reason for the reservation",
    }),
  })
  .openapi("CreateReservationRequest");

registry.register("CreateReservationRequest", CreateReservationRequestSchema);

export const ReservationSchema = z
  .object({
    id: z.string().openapi({
      description: "Unique reservation identifier",
    }),
    agentId: z.string().openapi({
      description: "ID of the agent holding the reservation",
    }),
    files: z.array(z.string()).openapi({
      description: "Reserved file paths",
    }),
    reason: z.string().optional().openapi({
      description: "Reason for the reservation",
    }),
    expiresAt: TimestampSchema,
    createdAt: TimestampSchema,
  })
  .openapi("Reservation");

registry.register("Reservation", ReservationSchema);

// ============================================================================
// Conflict Schemas
// ============================================================================

export const ConflictStatusSchema = z
  .enum(["pending", "resolved", "escalated", "auto_resolved"])
  .openapi({
    description: "Current status of the conflict",
  });

registry.register("ConflictStatus", ConflictStatusSchema);

export const ConflictSchema = z
  .object({
    id: z.string().openapi({
      description: "Unique conflict identifier",
    }),
    type: z.string().openapi({
      description: "Type of conflict",
      example: "file_edit",
    }),
    status: ConflictStatusSchema,
    agents: z.array(z.string()).openapi({
      description: "IDs of agents involved in the conflict",
    }),
    files: z.array(z.string()).optional().openapi({
      description: "Files involved in the conflict",
    }),
    detectedAt: TimestampSchema,
    resolvedAt: TimestampSchema.optional(),
    resolution: z.string().optional().openapi({
      description: "How the conflict was resolved",
    }),
  })
  .openapi("Conflict");

registry.register("Conflict", ConflictSchema);

// ============================================================================
// Notification Schemas
// ============================================================================

export const NotificationCategorySchema = z
  .enum(["agents", "coordination", "tasks", "costs", "security", "system"])
  .openapi({
    description: "Notification category",
  });

registry.register("NotificationCategory", NotificationCategorySchema);

export const NotificationPrioritySchema = z
  .enum(["urgent", "high", "normal", "low"])
  .openapi({
    description: "Notification priority level",
  });

registry.register("NotificationPriority", NotificationPrioritySchema);

export const CreateNotificationRequestSchema = z
  .object({
    recipientId: z.string().openapi({
      description: "User ID of the notification recipient",
    }),
    category: NotificationCategorySchema,
    priority: NotificationPrioritySchema.default("normal"),
    title: z.string().min(1).max(200).openapi({
      description: "Notification title",
    }),
    body: z.string().min(1).max(2000).openapi({
      description: "Notification body text",
    }),
    link: z.string().url().optional().openapi({
      description: "Optional link for more details",
    }),
    channels: z
      .array(z.enum(["in_app", "email", "slack", "webhook"]))
      .optional()
      .openapi({
        description: "Delivery channels to use",
        default: ["in_app"],
      }),
  })
  .openapi("CreateNotificationRequest");

registry.register("CreateNotificationRequest", CreateNotificationRequestSchema);

export const NotificationSchema = z
  .object({
    id: z.string().openapi({
      description: "Unique notification identifier",
    }),
    recipientId: z.string(),
    category: NotificationCategorySchema,
    priority: NotificationPrioritySchema,
    title: z.string(),
    body: z.string(),
    link: z.string().optional(),
    status: z.enum(["unread", "read", "actioned", "dismissed"]).openapi({
      description: "Notification status",
    }),
    createdAt: TimestampSchema,
    readAt: TimestampSchema.optional(),
  })
  .openapi("Notification");

registry.register("Notification", NotificationSchema);

// ============================================================================
// Pipeline Schemas
// ============================================================================

export const PipelineStepTypeSchema = z
  .enum([
    "agent_task",
    "conditional",
    "parallel",
    "approval",
    "script",
    "loop",
    "wait",
  ])
  .openapi({
    description: "Type of pipeline step",
  });

registry.register("PipelineStepType", PipelineStepTypeSchema);

export const PipelineStepSchema = z
  .object({
    id: z.string().openapi({
      description: "Unique step identifier",
    }),
    name: z.string().openapi({
      description: "Human-readable step name",
    }),
    type: PipelineStepTypeSchema,
    config: z.record(z.unknown()).openapi({
      description: "Step-specific configuration",
    }),
    dependsOn: z.array(z.string()).optional().openapi({
      description: "IDs of steps this step depends on",
    }),
  })
  .openapi("PipelineStep");

registry.register("PipelineStep", PipelineStepSchema);

export const CreatePipelineRequestSchema = z
  .object({
    name: z.string().min(1).max(100).openapi({
      description: "Pipeline name",
    }),
    description: z.string().max(500).optional().openapi({
      description: "Pipeline description",
    }),
    steps: z.array(PipelineStepSchema).min(1).openapi({
      description: "Pipeline steps",
    }),
  })
  .openapi("CreatePipelineRequest");

registry.register("CreatePipelineRequest", CreatePipelineRequestSchema);

export const PipelineSchema = z
  .object({
    id: z.string().openapi({
      description: "Unique pipeline identifier",
    }),
    name: z.string(),
    description: z.string().optional(),
    steps: z.array(PipelineStepSchema),
    status: z.enum(["draft", "active", "paused", "archived"]).openapi({
      description: "Pipeline status",
    }),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .openapi("Pipeline");

registry.register("Pipeline", PipelineSchema);

// ============================================================================
// Pagination Schemas
// ============================================================================

export const PaginationQuerySchema = z
  .object({
    limit: z.coerce.number().min(1).max(100).optional().openapi({
      description: "Maximum number of items to return",
      default: 20,
    }),
    cursor: z.string().optional().openapi({
      description: "Pagination cursor for next page",
    }),
  })
  .openapi("PaginationQuery");

registry.register("PaginationQuery", PaginationQuerySchema);

// ============================================================================
// Health Check Schema
// ============================================================================

export const HealthCheckResponseSchema = z
  .object({
    status: z.enum(["healthy", "degraded", "unhealthy"]).openapi({
      description: "Overall health status",
    }),
    version: z.string().openapi({
      description: "API version",
      example: "1.0.0",
    }),
    uptime: z.number().openapi({
      description: "Server uptime in seconds",
    }),
    timestamp: TimestampSchema,
  })
  .openapi("HealthCheckResponse");

registry.register("HealthCheckResponse", HealthCheckResponseSchema);

// ============================================================================
// Export utility for creating response schemas
// ============================================================================

/**
 * Create a typed API response schema for a resource.
 */
export function createApiResponseSchema<T extends z.ZodTypeAny>(
  name: string,
  dataSchema: T,
  objectType: string,
) {
  const schema = z
    .object({
      object: z.literal(objectType).openapi({
        description: `Always '${objectType}' for this response type`,
      }),
      data: dataSchema,
      requestId: RequestIdSchema,
      timestamp: TimestampSchema,
      links: z.record(z.string()).optional().openapi({
        description: "HATEOAS links for resource navigation",
      }),
    })
    .openapi(name);

  registry.register(name, schema);
  return schema;
}

/**
 * Create a typed API list response schema.
 */
export function createApiListResponseSchema<T extends z.ZodTypeAny>(
  name: string,
  itemSchema: T,
) {
  const schema = z
    .object({
      object: z.literal("list").openapi({
        description: "Always 'list' for collection responses",
      }),
      data: z.array(itemSchema),
      hasMore: z.boolean().openapi({
        description: "Whether more items exist beyond this page",
      }),
      nextCursor: z.string().optional().openapi({
        description: "Pagination cursor for next page",
      }),
      total: z.number().optional().openapi({
        description: "Total count across all pages",
      }),
      url: z.string().openapi({
        description: "URL for this list endpoint",
      }),
      requestId: RequestIdSchema,
      timestamp: TimestampSchema,
    })
    .openapi(name);

  registry.register(name, schema);
  return schema;
}

// Register response wrappers for common types
export const AgentResponseSchema = createApiResponseSchema(
  "AgentResponse",
  AgentSchema,
  "agent",
);

export const AgentListResponseSchema = createApiListResponseSchema(
  "AgentListResponse",
  AgentSchema,
);

export const CheckpointResponseSchema = createApiResponseSchema(
  "CheckpointResponse",
  CheckpointSchema,
  "checkpoint",
);

export const CheckpointListResponseSchema = createApiListResponseSchema(
  "CheckpointListResponse",
  CheckpointSchema,
);

export const ReservationResponseSchema = createApiResponseSchema(
  "ReservationResponse",
  ReservationSchema,
  "reservation",
);

export const ConflictListResponseSchema = createApiListResponseSchema(
  "ConflictListResponse",
  ConflictSchema,
);

export const NotificationListResponseSchema = createApiListResponseSchema(
  "NotificationListResponse",
  NotificationSchema,
);

export const PipelineResponseSchema = createApiResponseSchema(
  "PipelineResponse",
  PipelineSchema,
  "pipeline",
);
