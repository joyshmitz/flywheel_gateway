# Snapshot Latency Budget + Caching Policy

This document defines the latency budget, caching policy, and SLA targets for the system snapshot service.

## Overview

The system snapshot service aggregates state from multiple sources (NTM, beads, tool health, Agent Mail) into a unified view. To ensure responsive UI and prevent user-perceived stalls, we define strict latency budgets and graceful degradation strategies.

## Latency Budget

### Target SLA

| Metric | Target | Maximum |
|--------|--------|---------|
| **P50 response time** | < 50ms | - |
| **P95 response time** | < 200ms | - |
| **P99 response time** | < 500ms | 1000ms |
| **Cache hit response** | < 5ms | 10ms |
| **Fresh snapshot generation** | < 800ms | 2000ms |

### Per-Source Timeouts

Each data collection source has an independent timeout to prevent slow sources from blocking the entire snapshot:

| Source | Timeout | Rationale |
|--------|---------|-----------|
| **NTM** | 5000ms | External CLI; may spawn processes |
| **Beads (br/bv)** | 5000ms | External CLI with potential disk I/O |
| **Tool Health** | 5000ms | Multiple CLI checks in parallel |
| **Agent Mail** | 5000ms | Local file system reads |

**Total parallel collection budget**: 5000ms (sources run in parallel)

### Latency Breakdown

```
Request received
    │
    ├─► Cache check ──────────────────────► [< 1ms]
    │   └─► Hit? Return immediately
    │
    ├─► Parallel collection ──────────────► [< 5000ms]
    │   ├─► NTM snapshot
    │   ├─► Beads snapshot
    │   ├─► Tool health
    │   └─► Agent Mail
    │
    ├─► Summary generation ───────────────► [< 5ms]
    │
    ├─► Cache update ─────────────────────► [< 1ms]
    │
    └─► Response serialization ───────────► [< 10ms]

Total budget: ~5200ms maximum
```

## Caching Policy

### Cache Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **TTL** | 10 seconds | Balance freshness vs. performance |
| **Strategy** | Simple TTL | Low complexity, predictable behavior |
| **Invalidation** | Explicit only | Via `clearCache()` or `bypassCache` option |

### Cache Behavior

1. **On request**: Check if cached snapshot exists and is within TTL
2. **Cache hit**: Return immediately (< 5ms)
3. **Cache miss**: Collect fresh data, cache result, return
4. **TTL expiry**: Next request triggers fresh collection

### Cache Bypass

The `bypassCache` option forces fresh data collection. Use cases:

- Manual refresh requests from UI
- After configuration changes
- Debugging/troubleshooting

```typescript
const snapshot = await service.getSnapshot({ bypassCache: true });
```

## Graceful Degradation

### Partial Data Strategy

The snapshot service returns **partial data** when some sources fail, rather than failing entirely:

| Source Status | Behavior |
|---------------|----------|
| All succeed | Full snapshot, status "healthy" |
| Some timeout | Partial snapshot, status "degraded" |
| Some fail | Partial snapshot, affected sections empty |
| All fail | Minimal snapshot, status "unknown" |

### Fallback Values

Each source has a fallback structure when unavailable:

```typescript
// NTM fallback
{
  capturedAt: timestamp,
  available: false,
  sessions: [],
  summary: { totalSessions: 0, totalAgents: 0, ... },
  alerts: []
}

// Beads fallback
{
  capturedAt: timestamp,
  brAvailable: false,
  bvAvailable: false,
  statusCounts: { open: 0, closed: 0, ... },
  ...
}

// Tool health fallback
{
  capturedAt: timestamp,
  status: "unhealthy",
  issues: ["Tool health check failed"],
  ...
}
```

### Health Summary Derivation

The overall health status is derived from individual component statuses:

```
if (any unhealthy) → status = "unhealthy"
else if (any degraded OR any unknown) → status = "degraded"
else → status = "healthy"
```

## Monitoring

### Key Metrics

| Metric | Type | Alert Threshold |
|--------|------|-----------------|
| `snapshot_generation_duration_ms` | histogram | P95 > 1000ms |
| `snapshot_cache_hit_ratio` | gauge | < 0.5 over 5min |
| `snapshot_source_timeout_count` | counter | > 10 per minute |
| `snapshot_source_error_count` | counter | > 5 per minute |

### Logging

The service logs detailed information for observability:

```typescript
// Collection results
log.debug({
  ntm: { success: true, latencyMs: 150 },
  beads: { success: true, latencyMs: 200 },
  tools: { success: true, latencyMs: 180 },
  agentMail: { success: true, latencyMs: 50 }
}, "Data collection completed");

// Snapshot generated
log.info({
  status: "healthy",
  healthyCount: 4,
  unhealthyCount: 0,
  generationDurationMs: 250
}, "System snapshot generated");
```

## UI Integration Guidelines

### Polling Interval

Recommended polling interval for dashboard components:

| Component | Interval | Rationale |
|-----------|----------|-----------|
| Main dashboard | 30s | Balance freshness vs. load |
| Active agent view | 10s | Higher update frequency needed |
| System health badge | 60s | Low-frequency status indicator |

### Loading States

1. **Initial load**: Show skeleton/spinner until first snapshot
2. **Refresh**: Update in background, show stale indicator if > 30s old
3. **Error**: Show last known state with error banner

### Stale Data Handling

```typescript
const isStale = Date.now() - snapshot.meta.generatedAt > 30000;
if (isStale) {
  // Show "Data may be stale" indicator
  // Trigger background refresh
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SNAPSHOT_CACHE_TTL_MS` | 10000 | Cache TTL in milliseconds |
| `SNAPSHOT_COLLECTION_TIMEOUT_MS` | 5000 | Per-source timeout |

### Runtime Configuration

```typescript
const service = new SnapshotService({
  cacheTtlMs: 10000,
  collectionTimeoutMs: 5000,
  cwd: process.cwd()
});
```

## Performance Testing

### Test Scenarios

1. **Normal operation**: All sources respond within timeout
2. **Slow source**: One source takes > 4s but < timeout
3. **Source timeout**: One source exceeds timeout
4. **Multiple timeouts**: 2+ sources timeout simultaneously
5. **Cache effectiveness**: Measure cache hit ratio under load

### Acceptance Criteria

- [ ] P95 response time < 200ms with warm cache
- [ ] P99 response time < 1000ms with cold cache
- [ ] Cache hit ratio > 80% under normal load
- [ ] No UI stalls when sources timeout
- [ ] Partial data displayed when sources unavailable

## Future Improvements

1. **Staggered TTL**: Different TTL for frequently vs. rarely changing data
2. **Background refresh**: Proactively refresh cache before expiry
3. **Source prioritization**: Return fast sources first, stream slow sources
4. **Adaptive timeouts**: Adjust timeouts based on historical latency
