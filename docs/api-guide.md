# Flywheel Gateway API Guide

This guide covers the REST API patterns, authentication, and common operations for integrating with Flywheel Gateway.

## API Overview

The Gateway exposes a RESTful JSON API over HTTP with WebSocket support for real-time updates.

**Base URL**: `http://localhost:3000` (development)

**Documentation**:
- Swagger UI: `/docs`
- ReDoc: `/redoc`
- OpenAPI JSON: `/openapi.json`

## Request/Response Format

### Request Headers

```http
Content-Type: application/json
Accept: application/json
```

### Standard Response Envelope

All responses follow a consistent envelope format:

```json
{
  "type": "agent",
  "data": { ... },
  "links": { ... }
}
```

For list responses:

```json
{
  "type": "list",
  "data": [ ... ],
  "meta": {
    "total": 100,
    "hasMore": true,
    "nextCursor": "abc123"
  }
}
```

### Error Responses

```json
{
  "type": "error",
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agent with ID 'xyz' not found",
    "details": { ... }
  }
}
```

HTTP status codes follow standard conventions:
- `200` - Success
- `201` - Created
- `202` - Accepted (async operation started)
- `204` - No Content (successful deletion)
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error

## Agent API

Agents are AI coding assistants that execute tasks in a working directory.

### Spawn Agent

```http
POST /agents
```

**Request Body:**
```json
{
  "workingDirectory": "/path/to/project",
  "systemPrompt": "You are a helpful coding assistant.",
  "agentId": "my-custom-id",
  "timeout": 3600000,
  "maxTokens": 100000
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workingDirectory` | string | Yes | Project directory for the agent |
| `systemPrompt` | string | No | Custom system prompt |
| `agentId` | string | No | Custom agent ID (auto-generated if omitted) |
| `timeout` | number | No | Max execution time in ms (1000-86400000) |
| `maxTokens` | number | No | Token limit (1000-1000000) |

**Response (201):**
```json
{
  "type": "agent",
  "data": {
    "agentId": "ag_abc123",
    "state": "ready",
    "workingDirectory": "/path/to/project",
    "createdAt": "2026-01-12T10:00:00Z"
  },
  "links": {
    "self": "/agents/ag_abc123",
    "send": "/agents/ag_abc123/send",
    "output": "/agents/ag_abc123/output",
    "terminate": "/agents/ag_abc123"
  }
}
```

### List Agents

```http
GET /agents?state=ready,executing&limit=50&cursor=abc123
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `state` | string | Filter by state (comma-separated) |
| `driver` | string | Filter by driver type |
| `createdAfter` | string | ISO date filter |
| `createdBefore` | string | ISO date filter |
| `limit` | number | Max results (default: 50) |
| `cursor` | string | Pagination cursor |

### Get Agent Details

```http
GET /agents/:agentId
```

### Get Agent Status

```http
GET /agents/:agentId/status
```

Returns detailed status including lifecycle state, health checks, metrics, and recent state history.

### Send Message to Agent

```http
POST /agents/:agentId/send
```

**Request Body:**
```json
{
  "type": "user",
  "content": "Please fix the bug in auth.ts"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | `"user"` or `"system"` |
| `content` | string | Yes | Message content |
| `stream` | boolean | No | Enable streaming response |

**Response (202):**
```json
{
  "type": "message_sent",
  "data": {
    "messageId": "msg_xyz789",
    "agentId": "ag_abc123",
    "status": "queued"
  }
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

Supported signals: `SIGINT`, `SIGTSTP`, `SIGCONT`

### Get Agent Output

```http
GET /agents/:agentId/output?cursor=abc&limit=100&types=text,tool
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `cursor` | string | Pagination cursor |
| `limit` | number | Max chunks (default: 100) |
| `types` | string | Filter by output type (comma-separated) |

### Terminate Agent

```http
DELETE /agents/:agentId?graceful=true
```

Returns `202 Accepted` with termination status.

## Cost Analytics API

Track AI usage costs, manage budgets, and get optimization recommendations.

### Record Cost

```http
POST /cost-analytics/records
```

**Request Body:**
```json
{
  "model": "claude-3-opus",
  "provider": "anthropic",
  "promptTokens": 1500,
  "completionTokens": 500,
  "agentId": "ag_abc123",
  "success": true
}
```

### Get Cost Summary

```http
GET /cost-analytics/summary?since=2026-01-01&until=2026-01-12
```

**Response:**
```json
{
  "type": "costSummary",
  "data": {
    "totalCostUnits": 125000,
    "formattedTotalCost": "$1.25",
    "totalRequests": 150,
    "totalPromptTokens": 50000,
    "totalCompletionTokens": 25000,
    "avgCostPerRequest": 833,
    "formattedAvgCost": "$0.01"
  }
}
```

### Cost Breakdown by Dimension

```http
GET /cost-analytics/breakdown/:dimension
```

Dimensions: `model`, `agent`, `project`, `provider`

### Cost Trends

```http
# Daily trend (last 30 days)
GET /cost-analytics/trends/daily?days=30

# Hourly trend (last 24 hours)
GET /cost-analytics/trends/hourly?hours=24
```

### Budget Management

**Create Budget:**
```http
POST /cost-analytics/budgets
```

```json
{
  "name": "Monthly AI Budget",
  "period": "monthly",
  "amountUnits": 10000000,
  "alertThresholds": [50, 80, 95],
  "actionOnExceed": "alert"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `period` | string | `daily`, `weekly`, `monthly`, `yearly` |
| `amountUnits` | number | Budget in cost units (1 unit = $0.00001) |
| `alertThresholds` | number[] | Percentage thresholds for alerts |
| `actionOnExceed` | string | `alert`, `throttle`, `block` |

**Get Budget Status:**
```http
GET /cost-analytics/budgets/:budgetId/status
```

Response includes usage percentage, burn rate, projected end-of-period costs, and days until exhaustion.

### Cost Forecasting

**Generate Forecast:**
```http
POST /cost-analytics/forecasts
```

```json
{
  "horizonDays": 30,
  "historicalDays": 90,
  "methodology": "ensemble"
}
```

**Get Latest Forecast:**
```http
GET /cost-analytics/forecasts/latest
```

### Optimization Recommendations

**Generate Recommendations:**
```http
POST /cost-analytics/recommendations/generate
```

**Get Recommendations:**
```http
GET /cost-analytics/recommendations?status=pending&category=model_optimization
```

Categories: `model_optimization`, `caching`, `batching`, `context_optimization`, `consolidation`, `scheduling`, `rate_limiting`

**Update Recommendation Status:**
```http
PUT /cost-analytics/recommendations/:id/status
```

```json
{
  "status": "implemented",
  "implementedBy": "user@example.com",
  "actualSavingsUnits": 50000
}
```

## WebSocket API

Connect to `/ws` for real-time updates.

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');
```

### Subscribe to Channels

```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'agent:output:*'
}));
```

**Channel Patterns:**
| Pattern | Description |
|---------|-------------|
| `agent:output:*` | All agent output |
| `agent:output:{agentId}` | Specific agent output |
| `agent:state:*` | All state changes |
| `agent:tools:*` | Tool execution events |

### Message Format

```json
{
  "channel": "agent:output:ag_abc123",
  "cursor": "cursor_xyz",
  "timestamp": "2026-01-12T10:00:00Z",
  "payload": {
    "type": "text",
    "content": "Working on the task..."
  }
}
```

### Replay from Cursor

For reconnection, request messages from a specific cursor:

```javascript
ws.send(JSON.stringify({
  type: 'replay',
  channel: 'agent:output:ag_abc123',
  fromCursor: 'cursor_xyz'
}));
```

## Health & Metrics

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": "2h 30m"
}
```

### Prometheus Metrics

```http
GET /metrics
```

Returns Prometheus-formatted metrics for monitoring.

## Pagination

List endpoints support cursor-based pagination:

```http
GET /agents?limit=50&cursor=eyJpZCI6MTAwfQ
```

**Response includes:**
```json
{
  "meta": {
    "total": 150,
    "hasMore": true,
    "nextCursor": "eyJpZCI6MTUwfQ"
  }
}
```

## Rate Limiting

The API enforces rate limits per API key:
- Default: 100 requests/minute
- Burst: 20 requests/second

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1736683200
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AGENT_NOT_FOUND` | 404 | Agent ID does not exist |
| `AGENT_NOT_READY` | 409 | Agent is not in ready state |
| `INVALID_REQUEST` | 400 | Malformed request body |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `BUDGET_EXCEEDED` | 429 | Budget limit reached |
| `RATE_LIMITED` | 429 | Too many requests |

## SDK Usage

### JavaScript/TypeScript

```typescript
import { FlywheelClient } from '@flywheel/client';

const client = new FlywheelClient({
  baseUrl: 'http://localhost:3000',
  apiKey: 'your-api-key'
});

// Spawn an agent
const agent = await client.agents.spawn({
  workingDirectory: '/path/to/project'
});

// Send a message
await client.agents.send(agent.agentId, {
  type: 'user',
  content: 'Fix the login bug'
});

// Subscribe to output
const subscription = client.subscribe(`agent:output:${agent.agentId}`);
for await (const event of subscription) {
  console.log(event.payload);
}
```

## References

- [Architecture Overview](architecture.md)
- [Getting Started](getting-started.md)
- [OpenAPI Spec](/openapi.json)
