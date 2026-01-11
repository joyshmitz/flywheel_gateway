/**
 * Conflict Routes - REST API endpoints for conflict detection and management.
 *
 * Provides endpoints for:
 * - Listing active conflicts and history
 * - Getting conflict details
 * - Resolving conflicts
 * - Triggering conflict detection scans
 * - Configuration management
 */

import { Hono } from "hono";
import { z } from "zod";
import { getCorrelationId, getLogger } from "../middleware/correlation";
import {
  type ConflictSeverity,
  type ConflictType,
  checkReservationConflicts,
  detectGitConflicts,
  detectPotentialGitConflicts,
  detectResourceContention,
  getActiveConflicts,
  getAlertConfig,
  getConflict,
  getConflictHistory,
  getConflictStats,
  getRecommendedActions,
  resolveConflict,
  updateAlertConfig,
} from "../services/conflict.service";

const conflicts = new Hono();

// ============================================================================
// Validation Schemas
// ============================================================================

const ConflictFilterSchema = z.object({
  type: z
    .array(
      z.enum([
        "reservation_overlap",
        "git_merge_conflict",
        "git_potential_conflict",
        "resource_contention",
        "deadlock_detected",
      ]),
    )
    .optional(),
  severity: z
    .array(z.enum(["info", "warning", "error", "critical"]))
    .optional(),
  projectId: z.string().optional(),
  agentId: z.string().optional(),
});

const ResolveConflictSchema = z.object({
  type: z.enum(["wait", "manual", "auto", "override", "abort"]),
  description: z.string().max(500),
  resolvedBy: z.string().optional(),
});

const CheckReservationSchema = z.object({
  projectId: z.string().min(1),
  requesterId: z.string().min(1),
  patterns: z.array(z.string()).min(1),
  exclusive: z.boolean().default(true),
});

const GitConflictScanSchema = z.object({
  projectId: z.string().min(1),
  workingDirectory: z.string().min(1),
  baseBranch: z.string().optional(),
  compareBranch: z.string().optional(),
});

const AlertConfigSchema = z.object({
  minSeverity: z.enum(["info", "warning", "error", "critical"]).optional(),
  cooldownMs: z.number().min(0).max(3600000).optional(),
  escalationTimeoutMs: z.number().min(0).max(86400000).optional(),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /conflicts - List active conflicts
 */
conflicts.get("/", async (c) => {
  const query = c.req.query();

  // Parse filter from query params
  const filter: {
    type?: ConflictType[];
    severity?: ConflictSeverity[];
    projectId?: string;
    agentId?: string;
  } = {};

  if (query["type"]) {
    filter.type = query["type"].split(",") as ConflictType[];
  }
  if (query["severity"]) {
    filter.severity = query["severity"].split(",") as ConflictSeverity[];
  }
  if (query["projectId"]) {
    filter.projectId = query["projectId"];
  }
  if (query["agentId"]) {
    filter.agentId = query["agentId"];
  }

  const activeList = getActiveConflicts(filter);

  return c.json({
    conflicts: activeList.map((conflict) => ({
      id: conflict.id,
      type: conflict.type,
      severity: conflict.severity,
      projectId: conflict.projectId,
      involvedAgents: conflict.involvedAgents,
      affectedResources: conflict.affectedResources,
      detectedAt: conflict.detectedAt.toISOString(),
      recommendedActions: getRecommendedActions(conflict),
    })),
    pagination: {
      total: activeList.length,
      hasMore: false,
    },
    correlationId: getCorrelationId(),
  });
});

/**
 * GET /conflicts/history - Get conflict history
 */
conflicts.get("/history", async (c) => {
  const limitParam = c.req.query("limit");
  const offsetParam = c.req.query("offset");

  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50;
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

  const {
    conflicts: historyList,
    total,
    hasMore,
  } = getConflictHistory(
    Number.isNaN(limit) ? 50 : limit,
    Number.isNaN(offset) ? 0 : offset,
  );

  return c.json({
    conflicts: historyList.map((conflict) => ({
      id: conflict.id,
      type: conflict.type,
      severity: conflict.severity,
      projectId: conflict.projectId,
      involvedAgents: conflict.involvedAgents,
      affectedResources: conflict.affectedResources,
      detectedAt: conflict.detectedAt.toISOString(),
      resolvedAt: conflict.resolvedAt?.toISOString(),
      resolution: conflict.resolution
        ? {
            type: conflict.resolution.type,
            description: conflict.resolution.description,
            resolvedBy: conflict.resolution.resolvedBy,
            resolvedAt: conflict.resolution.resolvedAt.toISOString(),
          }
        : undefined,
    })),
    pagination: {
      total,
      hasMore,
      offset,
      limit,
    },
    correlationId: getCorrelationId(),
  });
});

/**
 * GET /conflicts/stats - Get conflict statistics
 */
conflicts.get("/stats", async (c) => {
  const stats = getConflictStats();

  return c.json({
    stats,
    correlationId: getCorrelationId(),
  });
});

/**
 * GET /conflicts/:conflictId - Get conflict details
 */
conflicts.get("/:conflictId", async (c) => {
  const conflictId = c.req.param("conflictId");
  const conflict = getConflict(conflictId);

  if (!conflict) {
    return c.json(
      {
        error: {
          code: "CONFLICT_NOT_FOUND",
          message: `Conflict ${conflictId} not found`,
          correlationId: getCorrelationId(),
          timestamp: new Date().toISOString(),
        },
      },
      404,
    );
  }

  return c.json({
    conflict: {
      id: conflict.id,
      type: conflict.type,
      severity: conflict.severity,
      projectId: conflict.projectId,
      involvedAgents: conflict.involvedAgents,
      affectedResources: conflict.affectedResources,
      detectedAt: conflict.detectedAt.toISOString(),
      resolvedAt: conflict.resolvedAt?.toISOString(),
      resolution: conflict.resolution
        ? {
            type: conflict.resolution.type,
            description: conflict.resolution.description,
            resolvedBy: conflict.resolution.resolvedBy,
            resolvedAt: conflict.resolution.resolvedAt.toISOString(),
          }
        : undefined,
      metadata: conflict.metadata,
      recommendedActions: getRecommendedActions(conflict),
    },
    correlationId: getCorrelationId(),
  });
});

/**
 * POST /conflicts/:conflictId/resolve - Resolve a conflict
 */
conflicts.post("/:conflictId/resolve", async (c) => {
  const log = getLogger();
  const conflictId = c.req.param("conflictId");

  try {
    const body = await c.req.json();
    const validated = ResolveConflictSchema.parse(body);

    // Build resolution object, only including resolvedBy if present
    const resolution: { type: typeof validated.type; description: string; resolvedBy?: string } = {
      type: validated.type,
      description: validated.description,
    };
    if (validated.resolvedBy) {
      resolution.resolvedBy = validated.resolvedBy;
    }

    const resolved = resolveConflict(conflictId, resolution);

    if (!resolved) {
      return c.json(
        {
          error: {
            code: "CONFLICT_NOT_FOUND",
            message: `Conflict ${conflictId} not found or already resolved`,
            correlationId: getCorrelationId(),
            timestamp: new Date().toISOString(),
          },
        },
        404,
      );
    }

    return c.json({
      resolved: true,
      conflict: {
        id: resolved.id,
        type: resolved.type,
        resolvedAt: resolved.resolvedAt?.toISOString(),
        resolution: {
          type: resolved.resolution!.type,
          description: resolved.resolution!.description,
          resolvedBy: resolved.resolution!.resolvedBy,
          resolvedAt: resolved.resolution!.resolvedAt.toISOString(),
        },
      },
      correlationId: getCorrelationId(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "Validation failed",
            correlationId: getCorrelationId(),
            timestamp: new Date().toISOString(),
            details: error.issues,
          },
        },
        400,
      );
    }
    log.error({ error, conflictId }, "Error resolving conflict");
    throw error;
  }
});

/**
 * POST /conflicts/check/reservation - Check for reservation conflicts
 */
conflicts.post("/check/reservation", async (c) => {
  const log = getLogger();

  try {
    const body = await c.req.json();
    const validated = CheckReservationSchema.parse(body);

    const result = checkReservationConflicts(
      validated.projectId,
      validated.requesterId,
      validated.patterns,
      validated.exclusive,
    );

    return c.json({
      hasConflicts: result.hasConflicts,
      canProceed: result.canProceed,
      conflicts: result.conflicts.map((conflict) => ({
        id: conflict.id,
        type: conflict.type,
        severity: conflict.severity,
        affectedResources: conflict.affectedResources,
        recommendedActions: getRecommendedActions(conflict),
      })),
      correlationId: getCorrelationId(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "Validation failed",
            correlationId: getCorrelationId(),
            timestamp: new Date().toISOString(),
            details: error.issues,
          },
        },
        400,
      );
    }
    log.error({ error }, "Error checking reservation conflicts");
    throw error;
  }
});

/**
 * POST /conflicts/scan/git - Scan for git conflicts
 */
conflicts.post("/scan/git", async (c) => {
  const log = getLogger();

  try {
    const body = await c.req.json();
    const validated = GitConflictScanSchema.parse(body);

    const conflicts: Array<{
      id: string;
      type: string;
      severity: string;
      affectedResources: string[];
    }> = [];

    // Check for actual merge conflicts
    const mergeConflicts = await detectGitConflicts(
      validated.projectId,
      validated.workingDirectory,
    );
    for (const conflict of mergeConflicts) {
      conflicts.push({
        id: conflict.id,
        type: conflict.type,
        severity: conflict.severity,
        affectedResources: conflict.affectedResources,
      });
    }

    // Check for potential conflicts if branches specified
    if (validated.baseBranch && validated.compareBranch) {
      const potentialConflicts = await detectPotentialGitConflicts(
        validated.projectId,
        validated.workingDirectory,
        validated.baseBranch,
        validated.compareBranch,
      );
      for (const conflict of potentialConflicts) {
        conflicts.push({
          id: conflict.id,
          type: conflict.type,
          severity: conflict.severity,
          affectedResources: conflict.affectedResources,
        });
      }
    }

    return c.json({
      scanned: true,
      projectId: validated.projectId,
      conflictsFound: conflicts.length,
      conflicts,
      correlationId: getCorrelationId(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "Validation failed",
            correlationId: getCorrelationId(),
            timestamp: new Date().toISOString(),
            details: error.issues,
          },
        },
        400,
      );
    }
    log.error({ error }, "Error scanning for git conflicts");
    throw error;
  }
});

/**
 * POST /conflicts/scan/contention - Check for resource contention
 */
conflicts.post("/scan/contention", async (c) => {
  const log = getLogger();

  try {
    const body = await c.req.json().catch(() => ({}));
    const projectId = body.projectId;
    const windowMs = body.windowMs ?? 5000;

    if (!projectId || typeof projectId !== "string") {
      return c.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "projectId is required",
            correlationId: getCorrelationId(),
            timestamp: new Date().toISOString(),
          },
        },
        400,
      );
    }

    const contentionConflicts = detectResourceContention(projectId, windowMs);

    return c.json({
      scanned: true,
      projectId,
      windowMs,
      conflictsFound: contentionConflicts.length,
      conflicts: contentionConflicts.map((conflict) => ({
        id: conflict.id,
        type: conflict.type,
        severity: conflict.severity,
        involvedAgents: conflict.involvedAgents,
        affectedResources: conflict.affectedResources,
      })),
      correlationId: getCorrelationId(),
    });
  } catch (error) {
    log.error({ error }, "Error scanning for resource contention");
    throw error;
  }
});

/**
 * GET /conflicts/config - Get alert configuration
 */
conflicts.get("/config", async (c) => {
  const config = getAlertConfig();

  return c.json({
    config,
    correlationId: getCorrelationId(),
  });
});

/**
 * PATCH /conflicts/config - Update alert configuration
 */
conflicts.patch("/config", async (c) => {
  const log = getLogger();

  try {
    const body = await c.req.json();
    const validated = AlertConfigSchema.parse(body);

    // Build config update object, only including defined properties
    const configUpdate: Partial<{
      minSeverity: ConflictSeverity;
      cooldownMs: number;
      escalationTimeoutMs: number;
    }> = {};
    if (validated.minSeverity !== undefined) {
      configUpdate.minSeverity = validated.minSeverity;
    }
    if (validated.cooldownMs !== undefined) {
      configUpdate.cooldownMs = validated.cooldownMs;
    }
    if (validated.escalationTimeoutMs !== undefined) {
      configUpdate.escalationTimeoutMs = validated.escalationTimeoutMs;
    }

    const updated = updateAlertConfig(configUpdate);

    return c.json({
      config: updated,
      correlationId: getCorrelationId(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "Validation failed",
            correlationId: getCorrelationId(),
            timestamp: new Date().toISOString(),
            details: error.issues,
          },
        },
        400,
      );
    }
    log.error({ error }, "Error updating alert configuration");
    throw error;
  }
});

export { conflicts };
