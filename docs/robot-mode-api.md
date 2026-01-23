# Robot Mode API Reference

This document defines the **agent-facing API surface** for AI coding agents operating in robot/automation mode. It establishes conventions, endpoint contracts, and integration patterns that agents can rely on for consistent behavior.

## Overview

The Flywheel Gateway exposes a REST API designed for programmatic consumption by AI agents. Key design principles:

1. **JSON-first**: All endpoints return JSON with consistent envelope structure
2. **HATEOAS links**: Resources include navigation links for discoverability
3. **Cursor-based pagination**: Predictable iteration over large result sets
4. **Idempotency**: Safe retry behavior via `X-Idempotency-Key` header
5. **Correlation**: Request tracing via `X-Correlation-Id` header

## Authentication

All requests require authentication via one of:
- `Authorization: Bearer <api-key>` header
- `X-API-Key: <api-key>` header

For BYOA (Bring Your Own Account) operations, API keys are scoped to accounts.

---

## Task Management (Beads)

Beads are the canonical task substrate for the Flywheel stack. Agents use these endpoints for task claiming, progress tracking, and completion.

### List Ready Tasks

Get unblocked tasks ready for work (no unsatisfied dependencies, not deferred).

```http
GET /beads/list/ready
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max results (default: 50) |
| `assignee` | string | Filter by assignee |
| `unassigned` | boolean | Only unassigned tasks |
| `label` | string[] | Filter by labels (AND logic, repeatable) |
| `sort` | enum | `hybrid` (default), `priority`, `oldest` |

**Response:**
```json
{
  "type": "beads",
  "data": {
    "beads": [
      {
        "id": "bd-abc1",
        "title": "Implement feature X",
        "status": "open",
        "priority": 2,
        "issue_type": "task",
        "links": {
          "self": "/beads/bd-abc1",
          "update": "/beads/bd-abc1",
          "close": "/beads/bd-abc1/close",
          "claim": "/beads/bd-abc1/claim",
          "mail_thread": "/mail/threads/bd-abc1"
        },
        "threading": {
          "thread_id": "bd-abc1",
          "subject_prefix": "[bd-abc1]",
          "usage": "Use thread_id when sending Agent Mail about this bead"
        }
      }
    ],
    "count": 1
  }
}
```

### List Tasks with Filters

Full-featured listing with comprehensive filter support.

```http
GET /beads
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string[] | Filter by status (repeatable) |
| `type` | string[] | Filter by type: bug, feature, task, epic, chore |
| `assignee` | string | Filter by assignee |
| `unassigned` | boolean | Only unassigned |
| `id` | string[] | Filter by specific IDs (repeatable) |
| `label` | string[] | Filter by labels (AND logic) |
| `labelAny` | string[] | Filter by labels (OR logic) |
| `priority` | number[] | Filter by exact priority (0-4) |
| `priorityMin` | number | Minimum priority (0=critical, 4=backlog) |
| `priorityMax` | number | Maximum priority |
| `titleContains` | string | Title substring search |
| `descContains` | string | Description substring search |
| `notesContains` | string | Notes substring search |
| `all` | boolean | Include closed issues (default: false) |
| `limit` | number | Max results (default: 50, 0=unlimited) |
| `sort` | enum | `priority`, `created_at`, `updated_at`, `title` |
| `reverse` | boolean | Reverse sort order |
| `deferred` | boolean | Filter for deferred issues |
| `overdue` | boolean | Filter for overdue issues |

### Get Task Details

```http
GET /beads/:id
```

**Response includes:**
- Full task metadata (title, description, design, acceptance criteria, notes)
- Dependencies and dependents with status
- Labels, assignee, owner, due dates
- HATEOAS links and threading hints

### Claim a Task

Mark a task as in-progress and assign to the requesting agent.

```http
POST /beads/:id/claim
```

**Response:** Updated bead with `status: "in_progress"`

### Update Task Progress

```http
PATCH /beads/:id
```

**Request Body:**
```json
{
  "status": "in_progress",
  "notes": "Completed authentication module, starting tests",
  "addLabels": ["needs-review"],
  "estimateMinutes": 60
}
```

**Supported fields:**
- `title`, `description`, `design`, `acceptanceCriteria`, `notes`
- `status`, `priority`, `type`
- `assignee`, `owner`, `claim` (boolean)
- `due`, `defer`, `estimateMinutes`
- `addLabels`, `removeLabels`, `setLabels`
- `parent`, `externalRef`

### Close a Task

```http
POST /beads/:id/close
```

**Request Body:**
```json
{
  "reason": "completed",
  "force": false
}
```

**Note:** Closing a task with open dependencies will fail unless `force: true`.

### Create a Task

```http
POST /beads
```

**Request Body:**
```json
{
  "title": "Fix authentication bug",
  "type": "bug",
  "priority": 1,
  "description": "Users cannot log in after password reset",
  "labels": ["auth", "critical"],
  "deps": ["bd-xyz9"]
}
```

---

## Triage & Planning (BV)

BV provides AI-powered triage recommendations and dependency analysis.

### Get Triage Recommendations

```http
GET /beads/triage
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max recommendations |
| `minScore` | number | Minimum score threshold |

**Response:**
```json
{
  "type": "triage",
  "data": {
    "generated_at": "2026-01-22T10:00:00Z",
    "data_hash": "abc123",
    "triage": {
      "recommendations": [
        {
          "id": "bd-abc1",
          "title": "Fix critical bug",
          "score": 0.95,
          "reasons": ["blocking 3 other tasks", "high priority", "overdue"]
        }
      ],
      "quick_wins": [...],
      "blockers_to_clear": [...]
    }
  }
}
```

### Get Quick Wins

Tasks that are easy to complete and unblock other work.

```http
GET /beads/triage/quick-wins
```

Alias: `GET /beads/ready` (deprecated, use `/beads/triage/quick-wins`)

### Get Blockers to Clear

High-impact tasks blocking multiple dependents.

```http
GET /beads/blocked
```

### Get Dependency Graph

```http
GET /beads/graph
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `format` | enum | `json` (default), `dot`, `mermaid` |
| `rootId` | string | Root node for subgraph |
| `depth` | number | Max depth (0=unlimited) |

### Get Planning Insights

```http
GET /beads/insights
```

Returns graph metrics: critical paths, bottlenecks, cycle detection.

### Get Execution Plan

```http
GET /beads/plan
```

Returns optimal execution order based on dependencies and priorities.

---

## Agent Lifecycle

### Spawn Agent

```http
POST /agents
```

**Request Body:**
```json
{
  "workingDirectory": "/path/to/project",
  "agentId": "optional-custom-id",
  "systemPrompt": "You are a code reviewer...",
  "timeout": 3600000,
  "maxTokens": 100000
}
```

### List Agents

```http
GET /agents
```

**Query Parameters:**
- `state`: Filter by lifecycle state (comma-separated)
- `driver`: Filter by driver type
- `createdAfter`, `createdBefore`: Time range filters
- `limit`, `cursor`: Pagination

### Get Agent Status

```http
GET /agents/:agentId/status
```

**Response:**
```json
{
  "type": "agent_status",
  "data": {
    "agentId": "agent_123",
    "lifecycleState": "executing",
    "stateEnteredAt": "2026-01-22T10:00:00Z",
    "uptime": 3600,
    "healthChecks": {
      "lifecycle": "healthy",
      "process": "healthy",
      "driver": "healthy"
    },
    "metrics": {
      "messagesReceived": 42,
      "messagesSent": 38,
      "tokensUsed": 15000,
      "toolCalls": 120
    },
    "history": [...]
  }
}
```

### Send Message to Agent

```http
POST /agents/:agentId/send
```

**Request Body:**
```json
{
  "type": "user",
  "content": "Please review the authentication module"
}
```

### Interrupt Agent

```http
POST /agents/:agentId/interrupt
```

**Request Body:**
```json
{
  "signal": "SIGINT"
}
```

Signals: `SIGINT` (default), `SIGTSTP`, `SIGCONT`

### Terminate Agent

```http
DELETE /agents/:agentId?graceful=true
```

---

## Agent Coordination (Mail)

Agents coordinate via a message-passing system tied to bead IDs as thread identifiers.

### Check Inbox

```http
GET /mail/inbox/:agentId
```

**Query Parameters:**
- `unread`: Only unread messages
- `threadId`: Filter by thread (typically a bead ID)
- `limit`, `cursor`: Pagination

### Send Message

```http
POST /mail/send
```

**Request Body:**
```json
{
  "to": "agent_456",
  "threadId": "bd-abc1",
  "subject": "[bd-abc1] Handoff: authentication module",
  "body": "I've completed the implementation. Please review and test.",
  "priority": "normal"
}
```

### Get Thread Messages

```http
GET /mail/threads/:threadId/messages
```

---

## Safety & DCG

The Destructive Command Guard (DCG) blocks dangerous commands. Agents must handle blocks gracefully.

### Check Pending Exceptions

```http
GET /dcg/pending
```

### Get Exception Details

```http
GET /dcg/pending/:shortCode
```

**Response:**
```json
{
  "type": "pending_exception",
  "data": {
    "shortCode": "abc123",
    "command": "rm -rf /important/directory",
    "severity": "critical",
    "blockedAt": "2026-01-22T10:00:00Z",
    "expiresAt": "2026-01-22T10:10:00Z",
    "status": "pending",
    "links": {
      "self": "/dcg/pending/abc123",
      "approve": "/dcg/pending/abc123/approve",
      "deny": "/dcg/pending/abc123/deny"
    }
  }
}
```

### Approve Exception (Requires Human)

```http
POST /dcg/pending/:shortCode/approve
```

**Note:** Approval typically requires human confirmation via dashboard.

---

## System State

### Get Unified Snapshot

```http
GET /system/snapshot
```

**Query Parameters:**
- `bypass_cache`: Force fresh data collection

**Response:**
```json
{
  "type": "system_snapshot",
  "data": {
    "timestamp": "2026-01-22T10:00:00Z",
    "ntm": {
      "available": true,
      "sessions": [...],
      "alerts": [...]
    },
    "beads": {
      "ready_count": 5,
      "in_progress_count": 2,
      "blocked_count": 1
    },
    "tools": {
      "dcg": { "status": "healthy" },
      "ubs": { "status": "healthy" }
    },
    "summary": {
      "status": "healthy",
      "healthyCount": 4,
      "degradedCount": 0,
      "unhealthyCount": 0
    }
  }
}
```

### Get Readiness Status

```http
GET /setup/readiness
```

Returns tool detection status with recommendations for missing components.

---

## WebSocket API

Real-time updates are delivered via WebSocket at `/ws`.

### Connection

```javascript
const ws = new WebSocket('wss://gateway.example.com/ws');

ws.onopen = () => {
  // Subscribe to channels
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['agent:state:agent_123', 'agent:output:agent_123']
  }));
};
```

### Channel Patterns

| Channel Pattern | Description |
|-----------------|-------------|
| `agent:state:{agentId}` | Lifecycle state changes |
| `agent:output:{agentId}` | Streaming output chunks |
| `agent:tools:{agentId}` | Tool call events |
| `ntm:state` | NTM session/agent state changes |
| `ntm:health` | NTM health status changes |
| `ntm:alerts` | NTM alert events |
| `dcg:blocks` | DCG block events |
| `dcg:config` | DCG configuration changes |
| `beads:updates` | Bead CRUD events |
| `setup:install:progress` | Installation progress |
| `session:{sessionId}` | Session-specific events |

### Message Format

```json
{
  "channel": "agent:state:agent_123",
  "type": "state_changed",
  "data": {
    "previousState": "ready",
    "newState": "executing",
    "timestamp": "2026-01-22T10:00:00Z",
    "reason": "message_received"
  },
  "cursor": "cursor_abc123",
  "timestamp": "2026-01-22T10:00:00.123Z"
}
```

### Reconnection

On reconnect, send the last received cursor to catch up on missed messages:

```json
{
  "type": "subscribe",
  "channels": ["agent:output:agent_123"],
  "cursor": "cursor_abc123"
}
```

### Acknowledgments

For critical channels, acknowledge receipt:

```json
{
  "type": "ack",
  "cursor": "cursor_abc123"
}
```

---

## Error Handling

### Error Response Format

```json
{
  "type": "error",
  "error": {
    "code": "BEAD_NOT_FOUND",
    "message": "Bead not found: bd-invalid",
    "details": {},
    "timestamp": "2026-01-22T10:00:00Z"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `INVALID_REQUEST` | 400 | Malformed request body |
| `BEAD_NOT_FOUND` | 404 | Bead ID does not exist |
| `AGENT_NOT_FOUND` | 404 | Agent ID does not exist |
| `AGENT_TERMINATED` | 409 | Agent is in terminal state |
| `SYSTEM_UNAVAILABLE` | 503 | Backend service unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Retry Strategy

Agents should implement exponential backoff for retryable errors:

```
Base delay: 1000ms
Max delay: 30000ms
Max retries: 5
Jitter: +/- 20%

Retryable: 429, 503, 504, network errors
Non-retryable: 400, 401, 403, 404, 409
```

---

## CLI Tool Robot Modes

The underlying CLI tools support robot modes for automation:

### BR (Beads)

```bash
br list --json                    # JSON output
br ready --json                   # Ready tasks
br show bd-abc1 --json           # Task details
br create "Title" --json         # Create task
br update bd-abc1 --json         # Update task
br close bd-abc1 --json          # Close task
```

### BV (Triage)

```bash
bv --robot-triage                # Triage recommendations
bv --robot-insights              # Graph insights
bv --robot-plan                  # Execution plan
bv --robot-graph                 # Dependency graph
```

### NTM (Session Manager)

```bash
ntm --robot-status               # Session status
ntm --robot-snapshot             # Full snapshot
ntm --robot-health=SESSION       # Session health
ntm --robot-is-working           # Work detection
ntm --robot-context=SESSION      # Context usage
ntm --robot-tail=SESSION         # Output tail
```

All robot commands output JSON with `--robot-format=json` (NTM/BV) or `--json` (BR).

---

## Idempotency

For mutating operations, include an idempotency key:

```http
POST /beads
X-Idempotency-Key: unique-request-id-12345
Content-Type: application/json

{"title": "New task"}
```

The server caches responses by idempotency key for 24 hours. Replaying the same request returns the cached response.

---

## Rate Limiting

Default limits:
- 100 requests/minute per API key
- 10 concurrent agent spawns
- 1000 WebSocket messages/minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706000000
```

On `429 Too Many Requests`, respect the `Retry-After` header.

---

## Versioning

The API is versioned via URL path (future) or `Accept` header:

```http
Accept: application/vnd.flywheel.v1+json
```

Current version: v1 (implicit)
