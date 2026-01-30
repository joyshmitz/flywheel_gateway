/**
 * Circuit Breaker for Tool Health Checks
 *
 * Prevents noisy repeated failures when tools (DCG, NTM, br, bv, etc.)
 * are unavailable. Caches failure state with exponential backoff and
 * exposes breaker status for health/readiness endpoints.
 *
 * States:
 *   CLOSED   → normal operation, checks go through
 *   OPEN     → tool is known-bad, checks short-circuit to failure
 *   HALF_OPEN → backoff elapsed, next check is a probe
 *
 * Transition rules:
 *   CLOSED  + failureThreshold consecutive failures  → OPEN
 *   OPEN    + backoff elapsed                        → HALF_OPEN
 *   HALF_OPEN + probe success                        → CLOSED (reset)
 *   HALF_OPEN + probe failure                        → OPEN (double backoff)
 */

import { logger } from "./logger";

// ============================================================================
// Types
// ============================================================================

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerConfig {
  /** Consecutive failures before opening the circuit. Default: 3 */
  failureThreshold?: number;
  /** Initial backoff in ms when circuit opens. Default: 30_000 (30s) */
  initialBackoffMs?: number;
  /** Maximum backoff in ms. Default: 300_000 (5min) */
  maxBackoffMs?: number;
  /** Backoff multiplier. Default: 2 */
  backoffMultiplier?: number;
}

export interface CircuitBreakerStatus {
  tool: string;
  state: CircuitState;
  failureCount: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailedAt: Date | null;
  lastSucceededAt: Date | null;
  nextRetryAt: Date | null;
  currentBackoffMs: number;
  totalChecks: number;
  totalFailures: number;
  totalSuccesses: number;
}

// ============================================================================
// Circuit Breaker
// ============================================================================

interface BreakerState {
  state: CircuitState;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailedAt: Date | null;
  lastSucceededAt: Date | null;
  nextRetryAt: Date | null;
  currentBackoffMs: number;
  totalChecks: number;
  totalFailures: number;
  totalSuccesses: number;
}

const DEFAULT_CONFIG: Required<CircuitBreakerConfig> = {
  failureThreshold: 3,
  initialBackoffMs: 30_000,
  maxBackoffMs: 300_000,
  backoffMultiplier: 2,
};

/** Per-tool circuit breaker states. */
const breakers = new Map<string, BreakerState>();

/** Global config (can be overridden per-tool). */
const toolConfigs = new Map<string, Required<CircuitBreakerConfig>>();

function getConfig(tool: string): Required<CircuitBreakerConfig> {
  return toolConfigs.get(tool) ?? DEFAULT_CONFIG;
}

function getOrCreateBreaker(tool: string): BreakerState {
  let b = breakers.get(tool);
  if (!b) {
    b = {
      state: "CLOSED",
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastFailedAt: null,
      lastSucceededAt: null,
      nextRetryAt: null,
      currentBackoffMs: getConfig(tool).initialBackoffMs,
      totalChecks: 0,
      totalFailures: 0,
      totalSuccesses: 0,
    };
    breakers.set(tool, b);
  }
  return b;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Configure the circuit breaker for a specific tool.
 */
export function configureBreaker(
  tool: string,
  config: CircuitBreakerConfig,
): void {
  toolConfigs.set(tool, { ...DEFAULT_CONFIG, ...config });
}

/**
 * Check whether a health check should be attempted for this tool.
 *
 * Returns `true` if the check should proceed, `false` if the circuit
 * is open and the caller should use the cached failure.
 */
export function shouldCheck(tool: string): boolean {
  const b = getOrCreateBreaker(tool);

  if (b.state === "CLOSED") return true;

  if (b.state === "OPEN") {
    // Check if backoff has elapsed
    if (b.nextRetryAt && Date.now() >= b.nextRetryAt.getTime()) {
      b.state = "HALF_OPEN";
      logger.info(
        { tool, previousBackoffMs: b.currentBackoffMs },
        "circuit-breaker: transitioning to HALF_OPEN",
      );
      return true;
    }
    return false;
  }

  // HALF_OPEN: allow the probe
  return true;
}

/**
 * Record a successful health check result.
 */
export function recordSuccess(tool: string): void {
  const b = getOrCreateBreaker(tool);
  const prevState = b.state;
  const cfg = getConfig(tool);

  b.totalChecks++;
  b.totalSuccesses++;
  b.consecutiveSuccesses++;
  b.consecutiveFailures = 0;
  b.lastSucceededAt = new Date();

  if (prevState === "HALF_OPEN" || prevState === "OPEN") {
    b.state = "CLOSED";
    b.currentBackoffMs = cfg.initialBackoffMs;
    b.nextRetryAt = null;
    logger.info(
      { tool, previousState: prevState },
      "circuit-breaker: CLOSED (recovered)",
    );
  }
}

/**
 * Record a failed health check result.
 */
export function recordFailure(tool: string): void {
  const b = getOrCreateBreaker(tool);
  const cfg = getConfig(tool);

  b.totalChecks++;
  b.totalFailures++;
  b.consecutiveFailures++;
  b.consecutiveSuccesses = 0;
  b.lastFailedAt = new Date();

  if (b.state === "HALF_OPEN") {
    // Probe failed, re-open with doubled backoff
    b.state = "OPEN";
    b.currentBackoffMs = Math.min(
      b.currentBackoffMs * cfg.backoffMultiplier,
      cfg.maxBackoffMs,
    );
    b.nextRetryAt = new Date(Date.now() + b.currentBackoffMs);
    logger.warn(
      { tool, backoffMs: b.currentBackoffMs },
      "circuit-breaker: OPEN (probe failed, backoff increased)",
    );
    return;
  }

  if (b.state === "CLOSED" && b.consecutiveFailures >= cfg.failureThreshold) {
    b.state = "OPEN";
    b.nextRetryAt = new Date(Date.now() + b.currentBackoffMs);
    logger.warn(
      {
        tool,
        failures: b.consecutiveFailures,
        backoffMs: b.currentBackoffMs,
      },
      "circuit-breaker: OPEN (failure threshold reached)",
    );
  }
}

/**
 * Execute a health check function through the circuit breaker.
 *
 * If the circuit is open, returns the cached failure immediately.
 * Otherwise runs the check and records the result.
 */
export async function withCircuitBreaker<T>(
  tool: string,
  checkFn: () => Promise<T>,
  fallbackValue: T,
): Promise<{ result: T; fromCache: boolean }> {
  if (!shouldCheck(tool)) {
    return { result: fallbackValue, fromCache: true };
  }

  try {
    const result = await checkFn();
    recordSuccess(tool);
    return { result, fromCache: false };
  } catch {
    recordFailure(tool);
    return { result: fallbackValue, fromCache: true };
  }
}

/**
 * Get the current status of a tool's circuit breaker.
 */
export function getBreakerStatus(tool: string): CircuitBreakerStatus {
  const b = getOrCreateBreaker(tool);
  return {
    tool,
    state: b.state,
    failureCount: b.consecutiveFailures,
    consecutiveFailures: b.consecutiveFailures,
    consecutiveSuccesses: b.consecutiveSuccesses,
    lastFailedAt: b.lastFailedAt,
    lastSucceededAt: b.lastSucceededAt,
    nextRetryAt: b.nextRetryAt,
    currentBackoffMs: b.currentBackoffMs,
    totalChecks: b.totalChecks,
    totalFailures: b.totalFailures,
    totalSuccesses: b.totalSuccesses,
  };
}

/**
 * Get status for all tracked circuit breakers.
 */
export function getAllBreakerStatuses(): CircuitBreakerStatus[] {
  const statuses: CircuitBreakerStatus[] = [];
  breakers.forEach((_state, tool) => {
    statuses.push(getBreakerStatus(tool));
  });
  return statuses;
}

/**
 * Manually reset a circuit breaker to CLOSED state.
 */
export function resetBreaker(tool: string): void {
  const b = breakers.get(tool);
  if (b) {
    const cfg = getConfig(tool);
    b.state = "CLOSED";
    b.consecutiveFailures = 0;
    b.consecutiveSuccesses = 0;
    b.currentBackoffMs = cfg.initialBackoffMs;
    b.nextRetryAt = null;
    logger.info({ tool }, "circuit-breaker: manually reset to CLOSED");
  }
}

/**
 * Clear all breaker state (for testing).
 */
export function _clearAllBreakers(): void {
  breakers.clear();
  toolConfigs.clear();
}
