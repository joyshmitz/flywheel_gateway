/**
 * Checkpoint Service - Agent state persistence and recovery.
 *
 * Checkpoints capture agent state for:
 * - Rollback after mistakes
 * - Disaster recovery
 * - Session handoffs
 * - Context window refreshes
 */

import { getLogger, getCorrelationId } from "../middleware/correlation";
import type { Checkpoint, CheckpointMetadata, TokenUsage } from "@flywheel/agent-drivers";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended checkpoint with delta support.
 */
export interface DeltaCheckpoint extends Checkpoint {
  /** Parent checkpoint ID for delta chain */
  parentCheckpointId: string | undefined;
  /** Whether this is a full checkpoint or delta */
  isDelta: boolean;
  /** Delta entries since parent (if isDelta) */
  deltaEntries?: Array<{
    type: "message" | "tool_result" | "file_change";
    timestamp: Date;
    content: unknown;
  }>;
}

/**
 * Result of checkpoint verification.
 */
export interface VerifyResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Options for creating a checkpoint.
 */
export interface CreateCheckpointOptions {
  description?: string;
  tags?: string[];
  /** If true, create delta from last checkpoint instead of full */
  delta?: boolean;
  /** Include file snapshots in checkpoint */
  includeFileSnapshots?: boolean;
}

/**
 * Options for restoring a checkpoint.
 */
export interface RestoreCheckpointOptions {
  /** If true, verify checkpoint before restoring */
  verify?: boolean;
  /** If true, create a new agent instead of restoring to existing */
  createNew?: boolean;
}

/**
 * Export format for checkpoints.
 */
export interface ExportedCheckpoint {
  version: string;
  exportedAt: string;
  checkpoint: Checkpoint;
  /** SHA-256 hash of checkpoint data */
  hash: string;
}

// ============================================================================
// Storage
// ============================================================================

/** In-memory checkpoint storage (should be SQLite in production) */
const checkpoints = new Map<string, DeltaCheckpoint>();
const agentCheckpoints = new Map<string, string[]>(); // agentId -> checkpoint IDs

// ============================================================================
// Checkpoint Creation
// ============================================================================

/**
 * Generate a unique checkpoint ID.
 */
function generateCheckpointId(): string {
  return `chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a checkpoint for an agent.
 *
 * @param agentId - The agent to checkpoint
 * @param state - Current agent state snapshot
 * @param options - Checkpoint options
 * @returns The created checkpoint metadata
 */
export async function createCheckpoint(
  agentId: string,
  state: {
    conversationHistory: unknown[];
    toolState: Record<string, unknown>;
    tokenUsage: TokenUsage;
    contextPack?: unknown;
  },
  options: CreateCheckpointOptions = {}
): Promise<CheckpointMetadata> {
  const log = getLogger();
  const correlationId = getCorrelationId();
  const checkpointId = generateCheckpointId();
  const now = new Date();

  // Get agent's checkpoint history
  const agentChkList = agentCheckpoints.get(agentId) || [];
  const lastCheckpointId = agentChkList[agentChkList.length - 1];

  // Build checkpoint
  const checkpoint: DeltaCheckpoint = {
    id: checkpointId,
    agentId,
    createdAt: now,
    tokenUsage: state.tokenUsage,
    description: options.description,
    tags: options.tags,
    conversationHistory: state.conversationHistory,
    toolState: state.toolState,
    contextPack: state.contextPack,
    isDelta: false,
    parentCheckpointId: undefined,
  };

  // If delta mode and we have a parent, only store differences
  if (options.delta && lastCheckpointId) {
    const parentCheckpoint = checkpoints.get(lastCheckpointId);
    if (parentCheckpoint) {
      checkpoint.isDelta = true;
      checkpoint.parentCheckpointId = lastCheckpointId;
      // In delta mode, we only store new entries since parent
      // For simplicity, we store full history but mark as delta
      // A real implementation would compute the delta
    }
  }

  // Store checkpoint
  checkpoints.set(checkpointId, checkpoint);

  // Update agent's checkpoint list
  agentChkList.push(checkpointId);
  agentCheckpoints.set(agentId, agentChkList);

  log.info(
    {
      type: "checkpoint",
      agentId,
      checkpointId,
      isDelta: checkpoint.isDelta,
      tokenUsage: state.tokenUsage.totalTokens,
      correlationId,
    },
    `[CHECKPOINT] Created checkpoint ${checkpointId} for agent ${agentId}`
  );

  return {
    id: checkpointId,
    agentId,
    createdAt: now,
    tokenUsage: state.tokenUsage,
    description: options.description,
    tags: options.tags,
  };
}

// ============================================================================
// Checkpoint Retrieval
// ============================================================================

/**
 * Get a checkpoint by ID.
 */
export async function getCheckpoint(checkpointId: string): Promise<Checkpoint | undefined> {
  return checkpoints.get(checkpointId);
}

/**
 * Get all checkpoints for an agent.
 */
export async function getAgentCheckpoints(agentId: string): Promise<CheckpointMetadata[]> {
  const ids = agentCheckpoints.get(agentId) || [];
  const result: CheckpointMetadata[] = [];

  for (const id of ids) {
    const chk = checkpoints.get(id);
    if (chk) {
      result.push({
        id: chk.id,
        agentId: chk.agentId,
        createdAt: chk.createdAt,
        tokenUsage: chk.tokenUsage,
        description: chk.description,
        tags: chk.tags,
      });
    }
  }

  return result;
}

/**
 * Get the latest checkpoint for an agent.
 */
export async function getLatestCheckpoint(agentId: string): Promise<Checkpoint | undefined> {
  const ids = agentCheckpoints.get(agentId) || [];
  const lastId = ids[ids.length - 1];
  return lastId ? checkpoints.get(lastId) : undefined;
}

// ============================================================================
// Checkpoint Restoration
// ============================================================================

/**
 * Resolve a delta checkpoint to its full state.
 * Walks the parent chain and merges all deltas.
 */
async function resolveDeltaCheckpoint(checkpoint: DeltaCheckpoint): Promise<Checkpoint> {
  if (!checkpoint.isDelta || !checkpoint.parentCheckpointId) {
    return checkpoint;
  }

  const parent = checkpoints.get(checkpoint.parentCheckpointId);
  if (!parent) {
    throw new CheckpointError(
      "PARENT_NOT_FOUND",
      `Parent checkpoint ${checkpoint.parentCheckpointId} not found`
    );
  }

  // Recursively resolve parent if it's also a delta
  const resolvedParent = await resolveDeltaCheckpoint(parent);

  // Merge checkpoint onto parent
  // In a real implementation, this would apply delta entries
  return {
    ...resolvedParent,
    id: checkpoint.id,
    agentId: checkpoint.agentId,
    createdAt: checkpoint.createdAt,
    tokenUsage: checkpoint.tokenUsage,
    description: checkpoint.description,
    tags: checkpoint.tags,
    conversationHistory: checkpoint.conversationHistory,
    toolState: { ...resolvedParent.toolState, ...checkpoint.toolState },
    contextPack: checkpoint.contextPack ?? resolvedParent.contextPack,
  };
}

/**
 * Restore an agent from a checkpoint.
 *
 * @param checkpointId - The checkpoint to restore from
 * @param options - Restore options
 * @returns The full checkpoint state to apply
 */
export async function restoreCheckpoint(
  checkpointId: string,
  options: RestoreCheckpointOptions = {}
): Promise<Checkpoint> {
  const log = getLogger();
  const correlationId = getCorrelationId();

  const checkpoint = checkpoints.get(checkpointId);
  if (!checkpoint) {
    throw new CheckpointError("CHECKPOINT_NOT_FOUND", `Checkpoint ${checkpointId} not found`);
  }

  // Verify if requested
  if (options.verify) {
    const verifyResult = await verifyCheckpoint(checkpointId);
    if (!verifyResult.valid) {
      throw new CheckpointError(
        "CHECKPOINT_INVALID",
        `Checkpoint verification failed: ${verifyResult.errors.join(", ")}`
      );
    }
  }

  // Resolve delta chain if needed
  const resolvedCheckpoint = await resolveDeltaCheckpoint(checkpoint);

  log.info(
    {
      type: "checkpoint",
      action: "restore",
      checkpointId,
      agentId: checkpoint.agentId,
      correlationId,
    },
    `[CHECKPOINT] Restored checkpoint ${checkpointId} for agent ${checkpoint.agentId}`
  );

  return resolvedCheckpoint;
}

// ============================================================================
// Checkpoint Verification
// ============================================================================

/**
 * Verify checkpoint integrity.
 */
export async function verifyCheckpoint(checkpointId: string): Promise<VerifyResult> {
  const checkpoint = checkpoints.get(checkpointId);

  if (!checkpoint) {
    return {
      valid: false,
      errors: [`Checkpoint ${checkpointId} not found`],
      warnings: [],
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!checkpoint.agentId) {
    errors.push("Missing agentId");
  }
  if (!checkpoint.createdAt) {
    errors.push("Missing createdAt");
  }
  if (!checkpoint.conversationHistory) {
    errors.push("Missing conversationHistory");
  }

  // Check delta chain integrity
  if (checkpoint.isDelta && checkpoint.parentCheckpointId) {
    const parent = checkpoints.get(checkpoint.parentCheckpointId);
    if (!parent) {
      errors.push(`Parent checkpoint ${checkpoint.parentCheckpointId} not found`);
    }
  }

  // Check token usage sanity
  if (checkpoint.tokenUsage) {
    const { promptTokens, completionTokens, totalTokens } = checkpoint.tokenUsage;
    if (promptTokens + completionTokens !== totalTokens) {
      warnings.push("Token usage sum mismatch");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Checkpoint Export/Import
// ============================================================================

/**
 * Export a checkpoint to a portable format.
 */
export async function exportCheckpoint(checkpointId: string): Promise<ExportedCheckpoint> {
  const checkpoint = checkpoints.get(checkpointId);
  if (!checkpoint) {
    throw new CheckpointError("CHECKPOINT_NOT_FOUND", `Checkpoint ${checkpointId} not found`);
  }

  // Resolve delta to full checkpoint for export
  const fullCheckpoint = await resolveDeltaCheckpoint(checkpoint);

  // Compute hash for integrity
  const hash = await computeCheckpointHash(fullCheckpoint);

  return {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    checkpoint: fullCheckpoint,
    hash,
  };
}

/**
 * Import a checkpoint from exported format.
 */
export async function importCheckpoint(
  exported: ExportedCheckpoint,
  targetAgentId?: string
): Promise<CheckpointMetadata> {
  const log = getLogger();

  // Verify hash
  const computedHash = await computeCheckpointHash(exported.checkpoint);
  if (computedHash !== exported.hash) {
    throw new CheckpointError("IMPORT_HASH_MISMATCH", "Checkpoint hash verification failed");
  }

  // Generate new ID for imported checkpoint
  const newId = generateCheckpointId();
  const agentId = targetAgentId ?? exported.checkpoint.agentId;

  const importedCheckpoint: DeltaCheckpoint = {
    ...exported.checkpoint,
    id: newId,
    agentId,
    isDelta: false,
    parentCheckpointId: undefined,
  };

  // Store
  checkpoints.set(newId, importedCheckpoint);

  // Update agent's checkpoint list
  const agentChkList = agentCheckpoints.get(agentId) || [];
  agentChkList.push(newId);
  agentCheckpoints.set(agentId, agentChkList);

  log.info(
    {
      type: "checkpoint",
      action: "import",
      originalId: exported.checkpoint.id,
      newId,
      agentId,
    },
    `[CHECKPOINT] Imported checkpoint as ${newId}`
  );

  return {
    id: newId,
    agentId,
    createdAt: importedCheckpoint.createdAt,
    tokenUsage: importedCheckpoint.tokenUsage,
    description: importedCheckpoint.description,
    tags: importedCheckpoint.tags,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Compute SHA-256 hash of checkpoint data.
 */
async function computeCheckpointHash(checkpoint: Checkpoint): Promise<string> {
  const data = JSON.stringify({
    agentId: checkpoint.agentId,
    createdAt: checkpoint.createdAt,
    conversationHistory: checkpoint.conversationHistory,
    toolState: checkpoint.toolState,
    tokenUsage: checkpoint.tokenUsage,
  });

  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Delete a checkpoint.
 */
export async function deleteCheckpoint(checkpointId: string): Promise<void> {
  const log = getLogger();
  const checkpoint = checkpoints.get(checkpointId);

  if (!checkpoint) {
    return; // Already deleted
  }

  // Check if any other checkpoints depend on this one
  for (const chk of checkpoints.values()) {
    if (chk.parentCheckpointId === checkpointId) {
      throw new CheckpointError(
        "CHECKPOINT_HAS_DEPENDENTS",
        `Cannot delete checkpoint ${checkpointId}: it has dependent checkpoints`
      );
    }
  }

  // Remove from storage
  checkpoints.delete(checkpointId);

  // Remove from agent's list
  const agentChkList = agentCheckpoints.get(checkpoint.agentId);
  if (agentChkList) {
    const index = agentChkList.indexOf(checkpointId);
    if (index >= 0) {
      agentChkList.splice(index, 1);
    }
  }

  log.info(
    { type: "checkpoint", action: "delete", checkpointId },
    `[CHECKPOINT] Deleted checkpoint ${checkpointId}`
  );
}

/**
 * Clean up old checkpoints for an agent, keeping only the most recent N.
 */
export async function pruneCheckpoints(agentId: string, keepCount: number): Promise<number> {
  const log = getLogger();
  const ids = agentCheckpoints.get(agentId) || [];

  if (ids.length <= keepCount) {
    return 0;
  }

  // Keep the most recent ones
  const toDelete = ids.slice(0, ids.length - keepCount);
  let deleted = 0;

  for (const id of toDelete) {
    try {
      await deleteCheckpoint(id);
      deleted++;
    } catch {
      // Skip checkpoints that can't be deleted (have dependents)
    }
  }

  log.info(
    { type: "checkpoint", action: "prune", agentId, deleted },
    `[CHECKPOINT] Pruned ${deleted} old checkpoints for agent ${agentId}`
  );

  return deleted;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Custom error class for checkpoint operations.
 */
export class CheckpointError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "CheckpointError";
  }
}
