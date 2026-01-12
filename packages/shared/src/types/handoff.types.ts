/**
 * Session Handoff Protocol Types.
 *
 * Defines the types for first-class agent-to-agent work transfer
 * with context preservation, resource handover, and coordination.
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Handoff state machine phases.
 */
export type HandoffPhase =
  | "initiate" // Source agent requests handoff
  | "pending" // Awaiting receiver acceptance
  | "transfer" // Active context/resource transfer
  | "complete" // Handoff successful
  | "rejected" // Receiver declined
  | "failed" // Transfer failed mid-stream
  | "cancelled"; // Initiator cancelled

/**
 * Reason for initiating handoff.
 */
export type HandoffReason =
  | "session_limit" // Context window limit reached
  | "specialization_needed" // Different agent type needed
  | "agent_unavailable" // Current agent unavailable
  | "load_balancing" // Work redistribution
  | "user_requested" // User explicitly requested
  | "error_recovery"; // Recovery from error state

/**
 * Task phase for progress tracking.
 */
export type TaskPhase =
  | "not_started"
  | "planning"
  | "implementing"
  | "testing"
  | "reviewing"
  | "completing";

/**
 * Urgency level for handoff requests.
 */
export type HandoffUrgency = "low" | "normal" | "high" | "critical";

/**
 * Fallback behavior when handoff fails or times out.
 */
export type HandoffFallbackBehavior =
  | "retry" // Retry same target
  | "broadcast" // Broadcast to available agents
  | "escalate" // Escalate to user
  | "abort"; // Abort handoff

// ============================================================================
// Context Types
// ============================================================================

/**
 * File modification record.
 */
export interface FileModification {
  path: string;
  originalHash: string;
  currentHash: string;
  changeDescription: string;
}

/**
 * Uncommitted change record.
 */
export interface UncommittedChange {
  path: string;
  diff: string;
  reason: string;
}

/**
 * Decision record for audit trail.
 */
export interface Decision {
  timestamp: Date;
  decision: string;
  reasoning: string;
  alternatives: string[];
  outcome?: string;
}

/**
 * Hypothesis with confidence tracking.
 */
export interface Hypothesis {
  hypothesis: string;
  confidence: number;
  evidence: string[];
}

/**
 * Todo item with priority and status.
 */
export interface HandoffTodoItem {
  task: string;
  priority: number;
  status: "pending" | "in_progress" | "blocked";
  blockedBy?: string;
}

/**
 * Environment snapshot for reproducibility.
 */
export interface EnvironmentSnapshot {
  workingDirectory: string;
  gitBranch: string;
  gitCommit: string;
  uncommittedFiles: string[];
  envVars: Record<string, string>; // sanitized
}

/**
 * Full handoff context with all state needed for seamless transfer.
 */
export interface HandoffContext {
  // Core work state
  beadId?: string;
  taskDescription: string;
  currentPhase: TaskPhase;
  progressPercentage: number;
  startedAt: Date;

  // File changes
  filesModified: FileModification[];
  filesCreated: string[];
  filesDeleted: string[];
  uncommittedChanges: UncommittedChange[];

  // Decision trail
  decisionsMade: Decision[];

  // Conversation summary
  conversationSummary: string;
  keyPoints: string[];
  userRequirements: string[];
  constraints: string[];

  // Working state
  workingMemory: Record<string, unknown>;
  hypotheses: Hypothesis[];
  todoItems: HandoffTodoItem[];

  // Environment
  environmentSnapshot: EnvironmentSnapshot;
}

// ============================================================================
// Resource Types
// ============================================================================

/**
 * Resource manifest for transfer.
 */
export interface ResourceManifest {
  fileReservations: Array<{
    reservationId: string;
    patterns: string[];
    mode: "exclusive" | "shared";
    expiresAt: Date;
  }>;
  checkpoints: Array<{
    checkpointId: string;
    description: string;
    createdAt: Date;
  }>;
  pendingMessages: Array<{
    messageId: string;
    threadId: string;
    subject: string;
  }>;
  activeSubscriptions: Array<{
    subscriptionId: string;
    channel: string;
    type: string;
  }>;
}

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Handoff preferences for customizing behavior.
 */
export interface HandoffPreferences {
  requireAcknowledgment: boolean;
  allowPartialTransfer: boolean;
  timeoutMs: number;
  fallbackBehavior: HandoffFallbackBehavior;
  priorityAgents: string[]; // Preferred receivers
}

/**
 * Handoff request from source to target agent.
 */
export interface HandoffRequest {
  handoffId: string;
  sourceAgentId: string;
  targetAgentId: string | null; // null = broadcast to available agents
  projectId: string;
  beadId?: string;
  reason: HandoffReason;
  urgency: HandoffUrgency;
  context: HandoffContext;
  resourceManifest: ResourceManifest;
  preferences: HandoffPreferences;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Context receipt details.
 */
export interface ContextReceipt {
  filesModified: number;
  decisionsReceived: number;
  resourcesTransferred: number;
}

/**
 * Partial transfer details.
 */
export interface PartialTransferDetails {
  accepted: string[];
  rejected: string[];
  reasons: Record<string, string>;
}

/**
 * Handoff acknowledgment from receiver.
 */
export interface HandoffAcknowledgment {
  handoffId: string;
  receivingAgentId: string;
  status: "accepted" | "rejected" | "partial";

  // For accepted
  acceptedAt?: Date;
  contextReceived?: ContextReceipt;

  // For rejected
  rejectedAt?: Date;
  rejectionReason?: string;
  suggestedAlternative?: string;

  // For partial
  partialDetails?: PartialTransferDetails;

  // Receiver's commitment
  estimatedResumeTime?: Date;
  receiverNotes?: string;
}

// ============================================================================
// State Machine Types
// ============================================================================

/**
 * Valid state transitions for handoff state machine.
 */
export const VALID_HANDOFF_TRANSITIONS: Record<HandoffPhase, HandoffPhase[]> = {
  initiate: ["pending", "cancelled"],
  pending: ["transfer", "rejected", "cancelled"],
  transfer: ["complete", "failed", "cancelled"],
  complete: [], // Terminal state
  rejected: ["cancelled"], // Can be cancelled after rejection
  failed: ["cancelled"], // Can be cancelled after failure
  cancelled: [], // Terminal state
};

/**
 * Handoff record with full state.
 */
export interface HandoffRecord {
  id: string;
  phase: HandoffPhase;
  request: HandoffRequest;
  acknowledgment?: HandoffAcknowledgment;
  transferProgress?: {
    totalResources: number;
    transferredResources: number;
    currentResource?: string;
    startedAt: Date;
    estimatedCompletionAt?: Date;
  };
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
    occurredAt: Date;
  };
  auditTrail: Array<{
    timestamp: Date;
    event: string;
    details: Record<string, unknown>;
  }>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// ============================================================================
// Service Response Types
// ============================================================================

/**
 * Result of initiating a handoff.
 */
export interface InitiateHandoffResult {
  success: boolean;
  handoffId?: string;
  phase?: HandoffPhase;
  error?: string;
  expiresAt?: Date;
}

/**
 * Result of accepting/rejecting a handoff.
 */
export interface RespondHandoffResult {
  success: boolean;
  handoffId: string;
  phase: HandoffPhase;
  error?: string;
}

/**
 * Result of transferring resources.
 */
export interface TransferResult {
  success: boolean;
  transferredResources: number;
  failedResources: string[];
  error?: string;
}

/**
 * Result of completing a handoff.
 */
export interface CompleteHandoffResult {
  success: boolean;
  handoffId: string;
  newOwnerAgentId: string;
  transferSummary: {
    filesModified: number;
    reservationsTransferred: number;
    checkpointsTransferred: number;
    messagesForwarded: number;
  };
  error?: string;
}

/**
 * Handoff statistics.
 */
export interface HandoffStats {
  totalHandoffs: number;
  completedHandoffs: number;
  failedHandoffs: number;
  cancelledHandoffs: number;
  averageTransferTimeMs: number;
  byReason: Record<HandoffReason, number>;
  byUrgency: Record<HandoffUrgency, number>;
}
