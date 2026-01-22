/**
 * br (Beads) Service
 *
 * Gateway service layer for br CLI operations.
 * Provides typed CRUD wrappers + ready/list/show/close/update/sync.
 */

import path from "node:path";
import type {
  BrClient,
  BrCloseOptions,
  BrCommandOptions,
  BrCommandResult,
  BrCommandRunner,
  BrCreateInput,
  BrIssue,
  BrListOptions,
  BrReadyOptions,
  BrSyncOptions,
  BrSyncResult,
  BrSyncStatus,
  BrUpdateInput,
} from "@flywheel/flywheel-clients";
import { createBrClient } from "@flywheel/flywheel-clients";
import { getLogger } from "../middleware/correlation";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_OUTPUT_BYTES = 5 * 1024 * 1024;

// ============================================================================
// Helpers
// ============================================================================

function resolveProjectRoot(): string {
  const cwd = process.cwd();
  if (cwd.endsWith(`${path.sep}apps${path.sep}gateway`)) {
    return path.resolve(cwd, "../..");
  }
  return cwd;
}

export function getBrProjectRoot(): string {
  return (
    process.env["BR_PROJECT_ROOT"] ??
    process.env["BEADS_PROJECT_ROOT"] ??
    resolveProjectRoot()
  );
}

/**
 * Safely read a stream up to a limit, draining excess to avoid pipe blocking.
 */
async function readStreamSafe(
  stream: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let content = "";
  let totalBytes = 0;
  const drainLimit = maxBytes * 5;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.length;

      if (content.length < maxBytes) {
        content += decoder.decode(value, { stream: true });
      }

      if (totalBytes > drainLimit) {
        await reader.cancel();
        break;
      }
    }
  } catch {
    // Ignore stream errors
  } finally {
    reader.releaseLock();
  }

  return content.length > maxBytes ? content.slice(0, maxBytes) : content;
}

// ============================================================================
// Command Runner
// ============================================================================

interface RunOptions {
  cwd?: string;
  timeout?: number;
  maxOutputBytes?: number;
}

export async function runBrCommand(
  command: string,
  args: string[],
  options: RunOptions = {},
): Promise<BrCommandResult> {
  const log = getLogger();
  const cwd = options.cwd ?? getBrProjectRoot();
  const timeoutMs = options.timeout ?? DEFAULT_TIMEOUT_MS;
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;

  const start = performance.now();
  const proc = Bun.spawn([command, ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1" },
  });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill(9);
  }, timeoutMs);

  const stdoutPromise = readStreamSafe(proc.stdout, maxOutputBytes);
  const stderrPromise = readStreamSafe(proc.stderr, maxOutputBytes);

  await proc.exited;
  clearTimeout(timer);

  const stdout = await stdoutPromise;
  const stderr = await stderrPromise;

  const latencyMs = Math.round(performance.now() - start);

  if (timedOut) {
    log.warn({ command, args, latencyMs }, "br command timed out");
  } else {
    log.debug(
      { command, args, exitCode: proc.exitCode, latencyMs },
      "br command completed",
    );
  }

  return {
    stdout,
    stderr,
    exitCode: proc.exitCode ?? -1,
  };
}

export function createBrCommandRunner(
  executor: typeof runBrCommand = runBrCommand,
): BrCommandRunner {
  return {
    run: (command, args, options) => executor(command, args, options),
  };
}

// ============================================================================
// Client Management
// ============================================================================

let cachedClient: BrClient | undefined;

export function getBrClient(): BrClient {
  if (!cachedClient) {
    cachedClient = createBrClient({
      runner: createBrCommandRunner(),
      cwd: getBrProjectRoot(),
    });
  }
  return cachedClient;
}

export function clearBrCache(): void {
  cachedClient = undefined;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * List ready (unblocked, not deferred) issues.
 */
export async function getBrReady(options?: BrReadyOptions): Promise<BrIssue[]> {
  const log = getLogger();
  const start = performance.now();
  const issues = await getBrClient().ready(options);
  const latencyMs = Math.round(performance.now() - start);
  log.info(
    { brCommand: "br ready", count: issues.length, latencyMs },
    "br ready fetched",
  );
  return issues;
}

/**
 * List issues with filtering options.
 */
export async function getBrList(options?: BrListOptions): Promise<BrIssue[]> {
  const log = getLogger();
  const start = performance.now();
  const issues = await getBrClient().list(options);
  const latencyMs = Math.round(performance.now() - start);
  log.info(
    { brCommand: "br list", count: issues.length, latencyMs },
    "br list fetched",
  );
  return issues;
}

/**
 * Show details of one or more issues by ID.
 */
export async function getBrShow(
  ids: string | string[],
  options?: BrCommandOptions,
): Promise<BrIssue[]> {
  const log = getLogger();
  const start = performance.now();
  const issues = await getBrClient().show(ids, options);
  const latencyMs = Math.round(performance.now() - start);
  log.info(
    { brCommand: "br show", ids, count: issues.length, latencyMs },
    "br show fetched",
  );
  return issues;
}

/**
 * Create a new issue.
 */
export async function createBrIssue(
  input: BrCreateInput,
  options?: BrCommandOptions,
): Promise<BrIssue> {
  const log = getLogger();
  const start = performance.now();
  const issue = await getBrClient().create(input, options);
  const latencyMs = Math.round(performance.now() - start);
  log.info(
    { brCommand: "br create", id: issue.id, title: input.title, latencyMs },
    "br issue created",
  );
  return issue;
}

/**
 * Update one or more issues.
 */
export async function updateBrIssues(
  ids: string | string[],
  input: BrUpdateInput,
  options?: BrCommandOptions,
): Promise<BrIssue[]> {
  const log = getLogger();
  const start = performance.now();
  const issues = await getBrClient().update(ids, input, options);
  const latencyMs = Math.round(performance.now() - start);
  log.info(
    { brCommand: "br update", ids, count: issues.length, latencyMs },
    "br issues updated",
  );
  return issues;
}

/**
 * Close one or more issues.
 */
export async function closeBrIssues(
  ids: string | string[],
  options?: BrCloseOptions,
): Promise<BrIssue[]> {
  const log = getLogger();
  const start = performance.now();
  const issues = await getBrClient().close(ids, options);
  const latencyMs = Math.round(performance.now() - start);
  log.info(
    { brCommand: "br close", ids, count: issues.length, latencyMs },
    "br issues closed",
  );
  return issues;
}

// ============================================================================
// Sync Operations
// ============================================================================

/**
 * Get sync status (dirty count, last export/import times).
 */
export async function getBrSyncStatus(
  options?: BrCommandOptions,
): Promise<BrSyncStatus> {
  const log = getLogger();
  const start = performance.now();
  const status = await getBrClient().syncStatus(options);
  const latencyMs = Math.round(performance.now() - start);
  log.info(
    {
      brCommand: "br sync --status",
      dirtyCount: status.dirty_count,
      latencyMs,
    },
    "br sync status fetched",
  );
  return status;
}

/**
 * Run sync operation (export, import, or merge).
 */
export async function syncBr(options?: BrSyncOptions): Promise<BrSyncResult> {
  const log = getLogger();
  const start = performance.now();
  const result = await getBrClient().sync(options);
  const latencyMs = Math.round(performance.now() - start);
  log.info(
    { brCommand: "br sync", mode: options?.mode ?? "default", latencyMs },
    "br sync completed",
  );
  return result;
}

// ============================================================================
// Service Interface
// ============================================================================

export interface BrService {
  ready: (options?: BrReadyOptions) => Promise<BrIssue[]>;
  list: (options?: BrListOptions) => Promise<BrIssue[]>;
  show: (
    ids: string | string[],
    options?: BrCommandOptions,
  ) => Promise<BrIssue[]>;
  create: (
    input: BrCreateInput,
    options?: BrCommandOptions,
  ) => Promise<BrIssue>;
  update: (
    ids: string | string[],
    input: BrUpdateInput,
    options?: BrCommandOptions,
  ) => Promise<BrIssue[]>;
  close: (
    ids: string | string[],
    options?: BrCloseOptions,
  ) => Promise<BrIssue[]>;
  syncStatus: (options?: BrCommandOptions) => Promise<BrSyncStatus>;
  sync: (options?: BrSyncOptions) => Promise<BrSyncResult>;
}

export function createBrService(): BrService {
  return {
    ready: getBrReady,
    list: getBrList,
    show: getBrShow,
    create: createBrIssue,
    update: updateBrIssues,
    close: closeBrIssues,
    syncStatus: getBrSyncStatus,
    sync: syncBr,
  };
}
