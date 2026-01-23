# Graceful Degradation & Fallback Behavior

This document defines the graceful degradation and fallback behaviors for the Flywheel Gateway when external tools or dependencies are unavailable or unhealthy.

## Overview

The Gateway follows a "best effort with transparency" philosophy:
- **Partial success is preferred over total failure** - Return what we can, with clear indicators of what's missing
- **Fail-safe defaults** - When in doubt, allow operations to proceed (security decisions are conservative)
- **Clear status reporting** - Health endpoints distinguish between "healthy", "degraded", and "unhealthy"

## Error Response Format

All error responses follow a consistent envelope format:

```json
{
  "object_type": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "requestId": "req_abc123",
    "severity": "retry|recoverable|terminal",
    "hint": "Actionable guidance for the client",
    "details": { ... }
  }
}
```

### Severity Levels

| Severity | Meaning | Client Action |
|----------|---------|---------------|
| `retry` | Transient failure, safe to retry | Retry with exponential backoff |
| `recoverable` | Authentication/authorization issue | Re-authenticate or refresh credentials |
| `terminal` | Permanent failure, do not retry | Report to user, do not retry |

## HTTP Status Code Reference

| Status | Meaning | Severity | Example |
|--------|---------|----------|---------|
| 400 | Validation Error | terminal | Invalid request body, missing required field |
| 401 | Unauthorized | recoverable | Missing or invalid credentials |
| 403 | Forbidden | terminal | Insufficient permissions |
| 404 | Not Found | terminal | Resource does not exist |
| 409 | Conflict | terminal | Resource state conflict (e.g., reservation conflict) |
| 500 | Internal Error | retry | Unexpected server error |
| 503 | Service Unavailable | retry | External dependency unavailable |

## Tool-Specific Fallback Behaviors

### Beads CLI (br)

The Beads CLI (`br`) is used for issue tracking and task management.

| Scenario | Fallback Behavior | API Response |
|----------|-------------------|--------------|
| `br` not installed | Return empty bead lists | 200 with `beads: []` |
| `br` command timeout (30s) | Kill process, return error | 500 with `BR_COMMAND_TIMEOUT` |
| `br` non-zero exit | Parse stderr, return error | 500 with `BR_COMMAND_ERROR` |
| Malformed JSON from `br` | Log error, return empty | 200 with `beads: []` |

**Implementation notes:**
- br commands have a 30-second timeout by default
- Stream output is capped to prevent OOM on large outputs
- Non-zero exit codes are returned in result for caller interpretation

### Triage CLI (bv)

The Triage CLI (`bv`) provides graph-aware prioritization.

| Scenario | Fallback Behavior | API Response |
|----------|-------------------|--------------|
| `bv` not installed | Fall back to `br list` | 200 with degraded triage data |
| `bv` command timeout (60s) | Kill process, return error | 500 with `BV_COMMAND_TIMEOUT` |
| `bv` non-zero exit | Parse stderr, return error | 500 with `BV_COMMAND_ERROR` |

**Fallback chain:**
1. Try `bv --robot-triage`
2. On failure, try `br list --json`
3. On failure, return empty triage with `available: false`

### NTM (Named Tmux Manager)

NTM manages multi-agent sessions and provides execution plane data.

| Scenario | Fallback Behavior | API Response |
|----------|-------------------|--------------|
| NTM not installed | Return empty session lists | 200 with `sessions: []` |
| NTM daemon not running | Return empty with status hint | 200 with `available: false` |
| Partial alert collection failure | Log warning, return available alerts | 200 with partial data |
| Session status failure | Abort collection for that session | Excluded from response |

**Snapshot collection:**
- NTM data is collected with a 5-second timeout
- Alerts are collected separately with graceful failure
- Status checks use `ntm status --json` with timeout protection

### DCG (Dangerous Command Guard)

DCG provides safety guardrails for dangerous commands.

| Scenario | Fallback Behavior | API Response |
|----------|-------------------|--------------|
| DCG not installed | Allow all commands (fail-open) | 200 with `wouldBlock: false` |
| DCG command timeout | Allow command (fail-safe) | 200 with `wouldBlock: false` |
| DCG non-zero exit | Treat as valid result, parse output | Depends on parsed result |
| Pack not found | Return 404 | 404 with `DCG_PACK_NOT_FOUND` |

**Security philosophy:**
- DCG fails OPEN by default - if DCG is unavailable, commands are allowed
- This prevents DCG failures from blocking all agent work
- Security-critical deployments should ensure DCG availability

### Agent Mail MCP

Agent coordination messaging system.

| Scenario | Fallback Behavior | API Response |
|----------|-------------------|--------------|
| MCP server unavailable | Return empty message lists | 200 with `messages: []` |
| Message send failure | Return error with delivery status | 500 with `MAIL_SEND_FAILED` |
| Project not found | Auto-create project | 200 with new project |

## Health Check Interpretation

### Endpoint Summary

| Endpoint | Purpose | Status Codes |
|----------|---------|--------------|
| `GET /health` | Liveness probe | 200 (always, if server running) |
| `GET /health/ready` | Readiness probe | 200 (ready) / 503 (not ready) |
| `GET /health/detailed` | Comprehensive check | 200 (with status in body) |

### Detailed Health Response

```json
{
  "status": "healthy|degraded|unhealthy",
  "version": "1.0.0",
  "uptime": 3600,
  "components": {
    "database": { "status": "healthy", "latencyMs": 5 },
    "dcg": { "status": "healthy", "version": "1.2.0" },
    "br": { "status": "healthy", "version": "0.5.0" },
    "bv": { "status": "degraded", "error": "timeout" },
    "ntm": { "status": "unhealthy", "error": "not installed" },
    "agentDrivers": { "status": "healthy", "count": 3 }
  },
  "passes": ["database", "dcg", "br", "agentDrivers"],
  "degraded": ["bv"],
  "failed": ["ntm"]
}
```

### Status Determination

| Overall Status | Condition |
|----------------|-----------|
| `healthy` | All components healthy |
| `degraded` | Some components degraded but core functionality available |
| `unhealthy` | Critical component failed (database, no agent drivers) |

**Critical components:**
- Database - Required for all operations
- Agent Drivers - At least one driver must be registered

**Non-critical components (degraded if unavailable):**
- DCG, CASS, UBS CLI tools
- NTM service
- BV triage service

## Snapshot Service Degradation

The snapshot service aggregates data from multiple sources. Each source is collected independently with timeout protection.

### Collection Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    System Snapshot Collection                    │
├──────────────┬──────────────┬───────────────┬──────────────────┤
│  NTM Data    │  Beads Data  │  Tool Health  │  Agent Mail      │
│  (5s timeout)│  (5s timeout)│  (5s timeout) │  (5s timeout)    │
├──────────────┼──────────────┼───────────────┼──────────────────┤
│  sessions    │  triage (bv) │  dcg version  │  inbox count     │
│  alerts      │  or list(br) │  cass version │  unread count    │
│  agents      │  ready beads │  ubs version  │                  │
└──────────────┴──────────────┴───────────────┴──────────────────┘
```

### Partial Success Response

When some sources fail, the snapshot still returns with partial data:

```json
{
  "ntm": {
    "available": false,
    "error": "NTM daemon not running",
    "sessions": [],
    "alerts": []
  },
  "beads": {
    "available": true,
    "bvAvailable": false,
    "brAvailable": true,
    "triage": null,
    "ready": [...]
  },
  "tools": {
    "dcg": { "available": true, "version": "1.2.0" },
    "cass": { "available": false },
    "ubs": { "available": false }
  }
}
```

## API Error Code Reference

### Agent Errors

| Code | HTTP | Description |
|------|------|-------------|
| `AGENT_NOT_FOUND` | 404 | Agent with specified ID does not exist |
| `AGENT_BUSY` | 409 | Agent is currently executing and cannot accept new input |
| `AGENT_TERMINATED` | 409 | Agent has been terminated |
| `AGENT_SPAWN_FAILED` | 500 | Failed to spawn agent process |
| `AGENT_TIMEOUT` | 500 | Agent execution exceeded timeout |

### Beads Errors

| Code | HTTP | Description |
|------|------|-------------|
| `BEAD_NOT_FOUND` | 404 | Bead with specified ID does not exist |
| `BR_COMMAND_ERROR` | 500 | br CLI command failed |
| `BR_COMMAND_TIMEOUT` | 500 | br CLI command exceeded timeout |
| `BV_COMMAND_ERROR` | 500 | bv CLI command failed |
| `BV_COMMAND_TIMEOUT` | 500 | bv CLI command exceeded timeout |

### DCG Errors

| Code | HTTP | Description |
|------|------|-------------|
| `DCG_NOT_AVAILABLE` | 503 | DCG CLI not installed or not accessible |
| `DCG_PACK_NOT_FOUND` | 404 | Specified pack does not exist |
| `DCG_COMMAND_ERROR` | 500 | DCG CLI command failed |

### Reservation Errors

| Code | HTTP | Description |
|------|------|-------------|
| `RESERVATION_NOT_FOUND` | 404 | Reservation does not exist |
| `RESERVATION_CONFLICT` | 409 | Path already reserved by another agent |
| `RESERVATION_EXPIRED` | 409 | Reservation has expired |

### Job Errors

| Code | HTTP | Description |
|------|------|-------------|
| `JOB_NOT_FOUND` | 404 | Job with specified ID does not exist |
| `JOB_CANCELLED` | 409 | Job was cancelled |
| `JOB_VALIDATION_ERROR` | 400 | Invalid job configuration |
| `NO_HANDLER_ERROR` | 500 | No handler registered for job type |

### Validation Errors

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Request body failed validation |
| `INVALID_CURSOR` | 400 | Pagination cursor is invalid or expired |
| `INVALID_FILTER` | 400 | Filter parameter value is invalid |

### General Errors

| Code | HTTP | Description |
|------|------|-------------|
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | External service temporarily unavailable |
| `UNAUTHORIZED` | 401 | Authentication required or invalid |
| `FORBIDDEN` | 403 | Insufficient permissions |

## Known Gaps & Future Improvements

The following areas have been identified for future improvement:

1. **Circuit Breaker Pattern** - Currently, each health check re-attempts CLI connections. A circuit breaker would cache failures and avoid repeated connection attempts.

2. **Event Loss Notification** - The throttled event batcher drops events silently when limits are exceeded. Clients should be notified of dropped events.

3. **Cross-Component Dependency Analysis** - Health checks report individual component status but don't analyze dependencies (e.g., "NTM unavailable because br missing").

4. **Unified Tool Unavailability Classification** - Different services handle tool unavailability slightly differently. A unified error classification would improve consistency.

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-22 | JadeBadger | Initial document - bd-1tin |
