/**
 * Context Pack Types - Core type definitions for the Context Pack Builder.
 *
 * The Context Pack Builder assembles optimized context for agent prompts
 * by pulling from multiple data sources and intelligently allocating
 * token budget to maximize effectiveness.
 */

// ============================================================================
// Token Budget Types
// ============================================================================

/**
 * Breakdown of token allocation across sections.
 */
export interface TokenBreakdown {
  /** System prompt allocation */
  system: number;
  /** Triage beads allocation */
  triage: number;
  /** Memory rules allocation */
  memory: number;
  /** Search results allocation */
  search: number;
  /** Conversation history allocation */
  history: number;
  /** Reserved for response */
  reserved: number;
}

/**
 * Strategy for allocating token budget.
 */
export interface BudgetStrategy {
  /** Fixed allocations (absolute tokens) */
  fixed: {
    /** System prompt, typically 500-1000 */
    system: number;
    /** Response buffer, typically 2000-4000 */
    reserved: number;
  };

  /** Proportional allocations (% of remaining after fixed) */
  proportional: {
    /** Default: 0.30 (30%) */
    triage: number;
    /** Default: 0.20 (20%) */
    memory: number;
    /** Default: 0.25 (25%) */
    search: number;
    /** Default: 0.25 (25%) */
    history: number;
  };

  /** Minimum allocations (floor) */
  minimums: {
    /** At least 500 tokens */
    triage: number;
    /** At least 300 tokens */
    memory: number;
    /** At least 500 tokens */
    search: number;
    /** At least 1000 tokens */
    history: number;
  };

  /** Priority order for overflow redistribution (highest to lowest) */
  priority: ("triage" | "memory" | "search" | "history")[];
}

/**
 * Default budget strategy.
 */
export const DEFAULT_BUDGET_STRATEGY: BudgetStrategy = {
  fixed: { system: 800, reserved: 3000 },
  proportional: { triage: 0.3, memory: 0.2, search: 0.25, history: 0.25 },
  minimums: { triage: 500, memory: 300, search: 500, history: 1000 },
  priority: ["triage", "history", "search", "memory"],
};

// ============================================================================
// Section Types
// ============================================================================

/**
 * Bead type from Beads/BV system.
 */
export type BeadType = "bug" | "feature" | "task" | "epic" | "chore";

/**
 * A triaged bead included in context.
 */
export interface TriagedBead {
  id: string;
  type: BeadType;
  title: string;
  /** May be summarized if large */
  content: string;
  /** Valuation score from BV */
  score: number;
  tokens: number;
  /** Why this bead is relevant */
  reason: string;
}

/**
 * Triage section containing prioritized beads.
 */
export interface TriageSection {
  beads: TriagedBead[];
  totalTokens: number;
  truncated: boolean;
  metadata: {
    /** Total ready beads in BV */
    totalAvailable: number;
    /** Beads included in pack */
    included: number;
    /** Highest valuation score */
    topScore: number;
    /** Average score of included */
    avgScore: number;
  };
}

/**
 * A memory rule from Collective Memory.
 */
export interface MemoryRule {
  id: string;
  category: string;
  content: string;
  priority: number;
  tokens: number;
  /** 0-1 relevance score for current task */
  applicability: number;
}

/**
 * Memory section containing applicable rules.
 */
export interface MemorySection {
  rules: MemoryRule[];
  totalTokens: number;
  categories: string[];
  metadata: {
    totalRulesMatched: number;
    rulesIncluded: number;
    matchedCategories: string[];
  };
}

/**
 * A search result from CASS.
 */
export interface SearchResult {
  id: string;
  /** File path or document ID */
  source: string;
  /** Relevant snippet */
  content: string;
  /** Semantic similarity score */
  score: number;
  tokens: number;
  /** Surrounding context */
  context: string;
}

/**
 * Search section containing CASS results.
 */
export interface SearchSection {
  results: SearchResult[];
  totalTokens: number;
  query: string;
  metadata: {
    totalMatches: number;
    includedMatches: number;
    searchTimeMs: number;
  };
}

/**
 * A conversation history entry.
 */
export interface HistoryEntry {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  tokens: number;
}

/**
 * History section containing recent conversation.
 */
export interface HistorySection {
  entries: HistoryEntry[];
  totalTokens: number;
  metadata: {
    totalEntries: number;
    includedEntries: number;
    oldestIncluded: Date | null;
    newestIncluded: Date | null;
  };
}

/**
 * System section containing system prompts.
 */
export interface SystemSection {
  content: string;
  totalTokens: number;
}

/**
 * Record of a truncation decision.
 */
export interface TruncationRecord {
  section: string;
  originalTokens: number;
  truncatedTokens: number;
  itemsRemoved: number;
  reason: string;
}

// ============================================================================
// Context Pack Types
// ============================================================================

/**
 * Complete context pack ready for rendering.
 */
export interface ContextPack {
  /** ULID for tracking */
  id: string;
  sessionId: string;
  createdAt: Date;

  /** Budget tracking */
  budget: {
    /** Total tokens available */
    total: number;
    /** Tokens used */
    used: number;
    /** Tokens remaining */
    remaining: number;
    /** Per-section allocation */
    breakdown: TokenBreakdown;
  };

  /** Context sections */
  sections: {
    triage: TriageSection;
    memory: MemorySection;
    search: SearchSection;
    history: HistorySection;
    system: SystemSection;
  };

  /** Metadata */
  metadata: {
    buildTimeMs: number;
    sourcesQueried: string[];
    truncations: TruncationRecord[];
  };
}

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Options for building the triage section.
 */
export interface TriageOptions {
  /** Maximum beads to consider */
  maxBeads?: number;
  /** Minimum score threshold */
  minScore?: number;
  /** Filter by bead types */
  types?: BeadType[];
  /** Filter by labels */
  labels?: string[];
}

/**
 * Options for building the search section.
 */
export interface SearchOptions {
  /** Maximum results to include */
  maxResults?: number;
  /** Minimum similarity score */
  minScore?: number;
  /** Filter by sources */
  sources?: string[];
}

/**
 * Options for building the history section.
 */
export interface HistoryOptions {
  /** Maximum entries to include */
  maxEntries?: number;
  /** Maximum age of entries */
  maxAgeMs?: number;
  /** Include system messages */
  includeSystem?: boolean;
}

/**
 * Request to build a context pack.
 */
export interface ContextPackRequest {
  sessionId: string;
  /** Maximum tokens for the pack */
  maxTokens?: number;
  /** Budget allocation strategy */
  strategy?: BudgetStrategy;
  /** Task context for memory scoring */
  taskContext?: string;
  /** Query for CASS search */
  searchQuery?: string;
  /** Model to use (affects limits) */
  model?: string;
  /** Triage options */
  triageOptions?: TriageOptions;
  /** Search options */
  searchOptions?: SearchOptions;
  /** History options */
  historyOptions?: HistoryOptions;
}

/**
 * Preview of a context pack (dry run).
 */
export interface ContextPackPreview {
  estimatedTokens: number;
  breakdown: TokenBreakdown;
  warnings: string[];
  sectionsAvailable: {
    triage: boolean;
    memory: boolean;
    search: boolean;
    history: boolean;
  };
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for the Context Pack Builder.
 */
export interface ContextBuilderConfig {
  /** Default maximum tokens */
  defaultMaxTokens: number;
  /** Model-specific token limits */
  modelLimits: Record<string, number>;
  /** Default budget strategy */
  defaultStrategy: BudgetStrategy;
  /** Cache TTL in seconds */
  cacheTTLSeconds: number;
  /** Maximum concurrent builds */
  maxConcurrentBuilds: number;
}

/**
 * Default configuration.
 */
export const DEFAULT_CONTEXT_BUILDER_CONFIG: ContextBuilderConfig = {
  defaultMaxTokens: 100000,
  modelLimits: {
    "claude-3-opus": 200000,
    "claude-3-sonnet": 200000,
    "claude-3-haiku": 200000,
    "sonnet-4": 200000,
    "gpt-4": 128000,
    "gpt-4-turbo": 128000,
  },
  defaultStrategy: DEFAULT_BUDGET_STRATEGY,
  cacheTTLSeconds: 60,
  maxConcurrentBuilds: 10,
};
