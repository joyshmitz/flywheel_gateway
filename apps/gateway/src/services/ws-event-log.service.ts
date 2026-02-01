/**
 * WebSocket Event Log Service
 *
 * Provides durable storage for WebSocket events to enable reliable replay
 * after client disconnects. Events are persisted to SQLite with configurable
 * retention policies per channel type.
 *
 * Features:
 * - Append events during hub.publish()
 * - Cursor-based replay for reconnecting clients
 * - Concurrent replay rate limiting per connection
 * - Authorization audit logging
 * - Configurable retention cleanup
 */

import { and, asc, desc, eq, gt, gte, lt, lte, sql } from "drizzle-orm";
import { db } from "../db/connection";
import { wsChannelConfig, wsEventLog, wsReplayAuditLog } from "../db/schema";
import { createCursor, decodeCursor } from "../ws/cursor";
import type { HubMessage, MessageMetadata, MessageType } from "../ws/messages";
import { BUFFER_CONFIGS } from "../ws/ring-buffer";
import { logger } from "./logger";

// ============================================================================
// Types
// ============================================================================

/** Event to be persisted */
export interface PersistableEvent {
  id: string;
  channel: string;
  cursor: string;
  sequence: number;
  messageType: MessageType;
  payload: unknown;
  metadata?: MessageMetadata;
}

/** Replay result */
export interface ReplayResult {
  messages: HubMessage[];
  lastCursor?: string;
  hasMore: boolean;
  cursorExpired: boolean;
  usedSnapshot: boolean;
}

/** Replay request for audit */
export interface ReplayRequest {
  connectionId: string;
  userId?: string;
  channel: string;
  fromCursor?: string;
  correlationId?: string;
}

/** Channel configuration (cached) */
interface ChannelConfig {
  persistEvents: boolean;
  retentionMs: number;
  maxEvents: number;
  snapshotEnabled: boolean;
  snapshotIntervalMs?: number;
  maxReplayRequestsPerMinute: number;
}

// ============================================================================
// Configuration Cache
// ============================================================================

/** Default channel configuration */
const DEFAULT_CHANNEL_CONFIG: ChannelConfig = {
  persistEvents: true,
  retentionMs: 300_000, // 5 minutes
  maxEvents: 10_000,
  snapshotEnabled: false,
  maxReplayRequestsPerMinute: 10,
};

/** Cached channel configurations */
let channelConfigCache = new Map<string, ChannelConfig>();
let channelConfigCacheLastRefresh = 0;
const CONFIG_CACHE_TTL_MS = 60_000; // 1 minute

/** Per-connection replay request tracking for rate limiting */
const replayRequestCounts = new Map<
  string,
  { count: number; windowStart: number }
>();

/**
 * Get channel configuration, checking cache first.
 */
async function getChannelConfig(channel: string): Promise<ChannelConfig> {
  const now = Date.now();

  // Refresh cache if stale
  if (now - channelConfigCacheLastRefresh > CONFIG_CACHE_TTL_MS) {
    await refreshChannelConfigCache();
  }

  // Try exact match
  if (channelConfigCache.has(channel)) {
    return channelConfigCache.get(channel)!;
  }

  // Try pattern match (e.g., "agent:output:*" matches "agent:output:abc123")
  for (const [pattern, config] of channelConfigCache) {
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      if (channel.startsWith(prefix)) {
        return config;
      }
    }
  }

  // Fall back to ring buffer config for defaults
  const channelType = getChannelTypePrefix(channel);
  const bufferConfig = BUFFER_CONFIGS[channelType];
  if (bufferConfig) {
    return {
      ...DEFAULT_CHANNEL_CONFIG,
      retentionMs: bufferConfig.ttlMs,
      maxEvents: bufferConfig.capacity,
    };
  }

  return DEFAULT_CHANNEL_CONFIG;
}

/**
 * Refresh channel configuration cache from database.
 */
async function refreshChannelConfigCache(): Promise<void> {
  try {
    const configs = await db.select().from(wsChannelConfig);

    const newCache = new Map<string, ChannelConfig>();
    for (const config of configs) {
      newCache.set(config.channelPattern, {
        persistEvents: config.persistEvents,
        retentionMs: config.retentionMs,
        maxEvents: config.maxEvents,
        snapshotEnabled: config.snapshotEnabled,
        snapshotIntervalMs: config.snapshotIntervalMs ?? undefined,
        maxReplayRequestsPerMinute: config.maxReplayRequestsPerMinute,
      });
    }

    channelConfigCache = newCache;
    channelConfigCacheLastRefresh = Date.now();
  } catch (error) {
    logger.error({ error }, "Failed to refresh channel config cache");
    channelConfigCacheLastRefresh = Date.now(); // Prevent retry storms
  }
}

/**
 * Get channel type prefix (e.g., "agent:output" from "agent:output:abc123").
 */
function getChannelTypePrefix(channel: string): string {
  const parts = channel.split(":");
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return `${parts[0]}:${parts[1]}`;
  }
  return channel;
}

// ============================================================================
// Event Persistence
// ============================================================================

/**
 * Persist an event to the durable log.
 *
 * @param event - Event to persist
 * @returns true if persisted, false if skipped (e.g., channel not configured for persistence)
 */
export async function persistEvent(event: PersistableEvent): Promise<boolean> {
  const config = await getChannelConfig(event.channel);

  if (!config.persistEvents) {
    return false;
  }

  const now = new Date();
  const expiresAt =
    config.retentionMs > 0
      ? new Date(now.getTime() + config.retentionMs)
      : null;

  try {
    await db.insert(wsEventLog).values({
      id: event.id,
      channel: event.channel,
      cursor: event.cursor,
      sequence: event.sequence,
      messageType: event.messageType,
      payload: JSON.stringify(event.payload),
      correlationId: event.metadata?.correlationId,
      agentId: event.metadata?.agentId,
      workspaceId: event.metadata?.workspaceId,
      createdAt: now,
      expiresAt,
    });

    return true;
  } catch (error) {
    logger.error(
      { error, eventId: event.id, channel: event.channel },
      "Failed to persist WebSocket event",
    );
    return false;
  }
}

/**
 * Persist multiple events in a batch.
 *
 * @param events - Events to persist
 * @returns Number of events persisted
 */
export async function persistEventBatch(
  events: PersistableEvent[],
): Promise<number> {
  if (events.length === 0) return 0;

  // Group by channel for config lookup
  const eventsByChannel = new Map<string, PersistableEvent[]>();
  for (const event of events) {
    const existing = eventsByChannel.get(event.channel) ?? [];
    existing.push(event);
    eventsByChannel.set(event.channel, existing);
  }

  let persisted = 0;
  const now = new Date();

  for (const [channel, channelEvents] of eventsByChannel) {
    const config = await getChannelConfig(channel);
    if (!config.persistEvents) continue;

    const expiresAt =
      config.retentionMs > 0
        ? new Date(now.getTime() + config.retentionMs)
        : null;

    const values = channelEvents.map((event) => ({
      id: event.id,
      channel: event.channel,
      cursor: event.cursor,
      sequence: event.sequence,
      messageType: event.messageType,
      payload: JSON.stringify(event.payload),
      correlationId: event.metadata?.correlationId,
      agentId: event.metadata?.agentId,
      workspaceId: event.metadata?.workspaceId,
      createdAt: now,
      expiresAt,
    }));

    try {
      await db.insert(wsEventLog).values(values);
      persisted += values.length;
    } catch (error) {
      logger.error(
        { error, channel, count: values.length },
        "Failed to persist WebSocket event batch",
      );
    }
  }

  return persisted;
}

// ============================================================================
// Replay
// ============================================================================

/**
 * Check if connection can make a replay request (rate limiting).
 *
 * @param connectionId - Connection ID
 * @param channel - Channel being replayed
 * @returns true if allowed, false if rate limited
 */
async function canReplay(
  connectionId: string,
  channel: string,
): Promise<boolean> {
  const config = await getChannelConfig(channel);
  const now = Date.now();
  const windowMs = 60_000; // 1 minute window

  const existing = replayRequestCounts.get(connectionId);
  if (!existing || now - existing.windowStart > windowMs) {
    // Start new window
    replayRequestCounts.set(connectionId, { count: 1, windowStart: now });
    return true;
  }

  if (existing.count >= config.maxReplayRequestsPerMinute) {
    return false;
  }

  existing.count++;
  return true;
}

/**
 * Replay events from a cursor position.
 *
 * @param request - Replay request with connection context
 * @param fromCursor - Starting cursor (exclusive), or undefined for all available
 * @param limit - Maximum events to return (default: 100)
 * @returns Replay result with messages and metadata
 */
export async function replayEvents(
  request: ReplayRequest,
  limit = 100,
): Promise<ReplayResult> {
  const startTime = Date.now();

  // Rate limiting
  const allowed = await canReplay(request.connectionId, request.channel);
  if (!allowed) {
    logger.warn(
      { connectionId: request.connectionId, channel: request.channel },
      "Replay request rate limited",
    );
    return {
      messages: [],
      hasMore: false,
      cursorExpired: false,
      usedSnapshot: false,
    };
  }

  const config = await getChannelConfig(request.channel);
  let cursorExpired = false;
  const usedSnapshot = false;

  // Determine starting point
  let startSequence: number | undefined;
  if (request.fromCursor) {
    const cursorData = decodeCursor(request.fromCursor);
    if (cursorData) {
      // Check if cursor is expired
      const cursorAge = Date.now() - cursorData.timestamp;
      if (config.retentionMs > 0 && cursorAge > config.retentionMs) {
        cursorExpired = true;
        // Fall through to get latest events
      } else {
        startSequence = cursorData.sequence;
      }
    } else {
      cursorExpired = true;
    }
  }

  // Query events
  const conditions = [eq(wsEventLog.channel, request.channel)];

  if (startSequence !== undefined && !cursorExpired) {
    conditions.push(gt(wsEventLog.sequence, startSequence));
  }

  // Exclude expired events
  const now = new Date();
  conditions.push(
    sql`(${wsEventLog.expiresAt} IS NULL OR ${wsEventLog.expiresAt} > ${now})`,
  );

  const events = await db
    .select()
    .from(wsEventLog)
    .where(and(...conditions))
    .orderBy(asc(wsEventLog.sequence))
    .limit(limit + 1); // Fetch one extra to check hasMore

  const hasMore = events.length > limit;
  const resultEvents = hasMore ? events.slice(0, limit) : events;

  // Convert to HubMessage format
  const messages: HubMessage[] = resultEvents.map((event) => ({
    id: event.id,
    cursor: event.cursor,
    timestamp: event.createdAt.toISOString(),
    channel: event.channel,
    type: event.messageType as MessageType,
    payload: JSON.parse(event.payload),
    metadata: {
      ...(event.correlationId && { correlationId: event.correlationId }),
      ...(event.agentId && { agentId: event.agentId }),
      ...(event.workspaceId && { workspaceId: event.workspaceId }),
    },
  }));

  const lastCursor = resultEvents[resultEvents.length - 1]?.cursor;

  // Audit log
  const durationMs = Date.now() - startTime;
  await logReplayRequest({
    connectionId: request.connectionId,
    userId: request.userId,
    channel: request.channel,
    fromCursor: request.fromCursor,
    toCursor: lastCursor,
    messagesReplayed: messages.length,
    cursorExpired,
    usedSnapshot,
    durationMs,
    correlationId: request.correlationId,
  });

  return {
    messages,
    lastCursor,
    hasMore,
    cursorExpired,
    usedSnapshot,
  };
}

/**
 * Log a replay request for audit.
 */
async function logReplayRequest(entry: {
  connectionId: string;
  userId?: string;
  channel: string;
  fromCursor?: string;
  toCursor?: string;
  messagesReplayed: number;
  cursorExpired: boolean;
  usedSnapshot: boolean;
  durationMs: number;
  correlationId?: string;
}): Promise<void> {
  try {
    await db.insert(wsReplayAuditLog).values({
      id: crypto.randomUUID(),
      connectionId: entry.connectionId,
      userId: entry.userId,
      channel: entry.channel,
      fromCursor: entry.fromCursor,
      toCursor: entry.toCursor,
      messagesReplayed: entry.messagesReplayed,
      cursorExpired: entry.cursorExpired,
      usedSnapshot: entry.usedSnapshot,
      requestedAt: new Date(),
      durationMs: entry.durationMs,
      correlationId: entry.correlationId,
    });
  } catch (error) {
    logger.error({ error }, "Failed to log replay request");
  }
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Clean up expired events from the log.
 *
 * @returns Number of events deleted
 */
export async function cleanupExpiredEvents(): Promise<number> {
  const now = new Date();

  try {
    const result = await db
      .delete(wsEventLog)
      .where(
        and(
          sql`${wsEventLog.expiresAt} IS NOT NULL`,
          lte(wsEventLog.expiresAt, now),
        ),
      );

    const deleted = result.rowsAffected ?? 0;
    if (deleted > 0) {
      logger.info({ deleted }, "Cleaned up expired WebSocket events");
    }
    return deleted;
  } catch (error) {
    logger.error({ error }, "Failed to cleanup expired WebSocket events");
    return 0;
  }
}

/**
 * Trim events for a channel to stay under max events limit.
 *
 * @param channel - Channel to trim
 * @returns Number of events deleted
 */
export async function trimChannelEvents(channel: string): Promise<number> {
  const config = await getChannelConfig(channel);

  try {
    // Get count of events for channel
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(wsEventLog)
      .where(eq(wsEventLog.channel, channel));

    const count = countResult[0]?.count ?? 0;
    if (count <= config.maxEvents) {
      return 0;
    }

    const toDelete = count - config.maxEvents;

    // Delete oldest events
    const oldestEvents = await db
      .select({ id: wsEventLog.id })
      .from(wsEventLog)
      .where(eq(wsEventLog.channel, channel))
      .orderBy(asc(wsEventLog.sequence))
      .limit(toDelete);

    if (oldestEvents.length === 0) {
      return 0;
    }

    const idsToDelete = oldestEvents.map((e) => e.id);

    // Delete in batches to avoid large transactions
    let deleted = 0;
    const batchSize = 1000;
    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize);
      const result = await db.delete(wsEventLog).where(
        sql`${wsEventLog.id} IN (${sql.join(
          batch.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      );
      deleted += result.rowsAffected ?? 0;
    }

    if (deleted > 0) {
      logger.info({ channel, deleted }, "Trimmed channel events");
    }
    return deleted;
  } catch (error) {
    logger.error({ error, channel }, "Failed to trim channel events");
    return 0;
  }
}

/**
 * Run full cleanup: expired events + channel trimming.
 *
 * @returns Total events deleted
 */
export async function runCleanup(): Promise<number> {
  let total = 0;

  // Clean expired events
  total += await cleanupExpiredEvents();

  // Get distinct channels and trim each
  try {
    const channels = await db
      .selectDistinct({ channel: wsEventLog.channel })
      .from(wsEventLog);

    for (const { channel } of channels) {
      total += await trimChannelEvents(channel);
    }
  } catch (error) {
    logger.error({ error }, "Failed to get channels for trimming");
  }

  // Clean old audit logs (keep 7 days)
  const auditCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  try {
    const auditResult = await db
      .delete(wsReplayAuditLog)
      .where(lt(wsReplayAuditLog.requestedAt, auditCutoff));
    const auditDeleted = auditResult.rowsAffected ?? 0;
    if (auditDeleted > 0) {
      logger.info(
        { deleted: auditDeleted },
        "Cleaned up old replay audit logs",
      );
    }
  } catch (error) {
    logger.error({ error }, "Failed to cleanup replay audit logs");
  }

  return total;
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get event log statistics.
 */
export async function getStats(): Promise<{
  totalEvents: number;
  eventsByChannel: Record<string, number>;
  oldestEventAge?: number;
  newestEventAge?: number;
}> {
  try {
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(wsEventLog);
    const totalEvents = countResult[0]?.count ?? 0;

    const channelCounts = await db
      .select({
        channel: wsEventLog.channel,
        count: sql<number>`count(*)`,
      })
      .from(wsEventLog)
      .groupBy(wsEventLog.channel);

    const eventsByChannel: Record<string, number> = {};
    for (const row of channelCounts) {
      eventsByChannel[row.channel] = row.count;
    }

    // Get age range
    const ageResult = await db
      .select({
        oldest: sql<Date>`min(${wsEventLog.createdAt})`,
        newest: sql<Date>`max(${wsEventLog.createdAt})`,
      })
      .from(wsEventLog);

    const now = Date.now();
    const oldest = ageResult[0]?.oldest;
    const newest = ageResult[0]?.newest;

    return {
      totalEvents,
      eventsByChannel,
      oldestEventAge: oldest ? now - oldest.getTime() : undefined,
      newestEventAge: newest ? now - newest.getTime() : undefined,
    };
  } catch (error) {
    logger.error({ error }, "Failed to get event log stats");
    return {
      totalEvents: 0,
      eventsByChannel: {},
    };
  }
}

// ============================================================================
// Cleanup Job
// ============================================================================

let cleanupIntervalHandle: ReturnType<typeof setInterval> | null = null;
const CLEANUP_INTERVAL_MS = 60_000; // 1 minute

/**
 * Start the periodic cleanup job.
 */
export function startCleanupJob(): void {
  if (cleanupIntervalHandle !== null) {
    return;
  }

  cleanupIntervalHandle = setInterval(async () => {
    try {
      await runCleanup();
    } catch (error) {
      logger.error({ error }, "Event log cleanup job failed");
    }
  }, CLEANUP_INTERVAL_MS);

  // Ensure interval doesn't prevent process exit
  if (cleanupIntervalHandle.unref) {
    cleanupIntervalHandle.unref();
  }

  logger.info("WebSocket event log cleanup job started");
}

/**
 * Stop the periodic cleanup job.
 */
export function stopCleanupJob(): void {
  if (cleanupIntervalHandle !== null) {
    clearInterval(cleanupIntervalHandle);
    cleanupIntervalHandle = null;
    logger.info("WebSocket event log cleanup job stopped");
  }
}

/**
 * Clear rate limit tracking for a connection (call on disconnect).
 */
export function clearConnectionRateLimits(connectionId: string): void {
  replayRequestCounts.delete(connectionId);
}
