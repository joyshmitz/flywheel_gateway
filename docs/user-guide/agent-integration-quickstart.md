# Agent Integration Quick Start

This guide walks through the complete flow for spawning an AI agent, sending messages, and streaming output via the Flywheel Gateway API. Designed for developers and AI toolchains integrating programmatically.

## Prerequisites

- Flywheel Gateway running (default: `http://localhost:3000`)
- At least one AI provider account linked
- `curl` or equivalent HTTP client

## Health Check

Before spawning agents, verify the gateway is healthy:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "data": {
    "status": "healthy",
    "version": "0.1.0",
    "uptime": 12345,
    "timestamp": "2026-01-17T12:00:00Z"
  },
  "meta": { "type": "health" }
}
```

For detailed component health (database, drivers, WebSocket):

```bash
curl http://localhost:3000/health?detail=true
```

## Quick Start: Spawn → Send → Stream

### 1. Spawn an Agent

Create a new agent session:

```bash
curl -X POST http://localhost:3000/agents \
  -H "Content-Type: application/json" \
  -d '{
    "workingDirectory": "/path/to/your/project",
    "timeout": 300000,
    "maxTokens": 100000
  }'
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workingDirectory` | string | Yes | Absolute path where agent operates |
| `agentId` | string | No | Custom agent ID (auto-generated if omitted) |
| `systemPrompt` | string | No | Custom system prompt override |
| `timeout` | number | No | Session timeout in ms (default: 300000) |
| `maxTokens` | number | No | Max tokens for session (default: 100000) |

**Response (201 Created):**

```json
{
  "data": {
    "agentId": "agent_01HV8X9Y2Z",
    "status": "initializing",
    "workingDirectory": "/path/to/your/project",
    "driver": "sdk",
    "createdAt": "2026-01-17T12:00:00Z"
  },
  "links": {
    "self": "/agents/agent_01HV8X9Y2Z",
    "send": "/agents/agent_01HV8X9Y2Z/send",
    "output": "/agents/agent_01HV8X9Y2Z/output",
    "status": "/agents/agent_01HV8X9Y2Z/status",
    "ws": "/agents/agent_01HV8X9Y2Z/ws"
  },
  "meta": { "type": "agent" }
}
```

### 2. Send a Message

Send a task to the agent:

```bash
curl -X POST http://localhost:3000/agents/agent_01HV8X9Y2Z/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "user",
    "content": "List the files in this directory and explain the project structure."
  }'
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | "user" \| "system" | Yes | Message type |
| `content` | string | Yes | Message content |
| `stream` | boolean | No | Request streaming response |

**Response (202 Accepted):**

```json
{
  "data": {
    "messageId": "msg_01HV8XA3B4",
    "agentId": "agent_01HV8X9Y2Z",
    "queued": true,
    "timestamp": "2026-01-17T12:00:01Z"
  },
  "meta": { "type": "message_sent" }
}
```

### 3. Stream Output

#### Option A: Polling (REST API)

Get agent output with pagination:

```bash
curl "http://localhost:3000/agents/agent_01HV8X9Y2Z/output?limit=100"
```

**Response:**

```json
{
  "data": [
    {
      "type": "text",
      "content": "I'll list the files...",
      "timestamp": "2026-01-17T12:00:02Z"
    },
    {
      "type": "tool_call",
      "tool": "bash",
      "input": { "command": "ls -la" },
      "timestamp": "2026-01-17T12:00:03Z"
    },
    {
      "type": "tool_result",
      "tool": "bash",
      "output": "total 48\ndrwxr-xr-x  5 user ...",
      "timestamp": "2026-01-17T12:00:04Z"
    }
  ],
  "meta": {
    "hasMore": true,
    "nextCursor": "cursor_abc123"
  }
}
```

Use `cursor` parameter for pagination:

```bash
curl "http://localhost:3000/agents/agent_01HV8X9Y2Z/output?cursor=cursor_abc123"
```

#### Option B: WebSocket (Real-Time)

For real-time streaming, connect via WebSocket:

```bash
wscat -c "ws://localhost:3000/agents/agent_01HV8X9Y2Z/ws"
```

Or use the global WebSocket endpoint with subscription:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  // Subscribe to agent output
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: `agent:output:agent_01HV8X9Y2Z`
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Output chunk:', data);
};
```

**WebSocket channels:**

| Channel | Description |
|---------|-------------|
| `agent:output:{agentId}` | Agent output chunks |
| `agent:state:{agentId}` | State transitions |
| `agent:tools:{agentId}` | Tool call events |
| `system:notifications` | System-wide alerts |

## Tool Call Handling

When an agent makes a tool call, you'll receive events like:

```json
{
  "type": "tool_call",
  "tool": "bash",
  "id": "call_01HV8XB5C6",
  "input": {
    "command": "git status",
    "description": "Check git repository status"
  },
  "timestamp": "2026-01-17T12:00:05Z"
}
```

Followed by the result:

```json
{
  "type": "tool_result",
  "tool": "bash",
  "id": "call_01HV8XB5C6",
  "output": "On branch main\nnothing to commit, working tree clean",
  "exitCode": 0,
  "durationMs": 42,
  "timestamp": "2026-01-17T12:00:05Z"
}
```

## Agent Lifecycle

### Check Status

```bash
curl http://localhost:3000/agents/agent_01HV8X9Y2Z/status
```

**Response:**

```json
{
  "data": {
    "agentId": "agent_01HV8X9Y2Z",
    "lifecycleState": "executing",
    "stateEnteredAt": "2026-01-17T12:00:02Z",
    "uptime": 120,
    "healthChecks": {
      "lifecycle": "healthy",
      "process": "healthy",
      "driver": "healthy"
    },
    "metrics": {
      "messagesReceived": 2,
      "messagesSent": 5,
      "tokensUsed": 1250,
      "toolCalls": 3
    }
  },
  "meta": { "type": "agent_status" }
}
```

**Lifecycle states:**

| State | Description |
|-------|-------------|
| `initializing` | Agent starting up |
| `idle` | Ready, waiting for input |
| `executing` | Processing a task |
| `paused` | Temporarily suspended |
| `completed` | Session finished successfully |
| `failed` | Session ended with error |
| `terminated` | Manually stopped |

### Interrupt Agent

Send a signal to interrupt the current operation:

```bash
curl -X POST http://localhost:3000/agents/agent_01HV8X9Y2Z/interrupt \
  -H "Content-Type: application/json" \
  -d '{ "signal": "SIGINT" }'
```

**Signals:**

| Signal | Effect |
|--------|--------|
| `SIGINT` | Graceful interrupt (Ctrl+C) |
| `SIGTSTP` | Suspend (Ctrl+Z) |
| `SIGCONT` | Resume suspended agent |

### Terminate Agent

End the agent session:

```bash
# Graceful termination (allows cleanup)
curl -X DELETE http://localhost:3000/agents/agent_01HV8X9Y2Z

# Force termination
curl -X DELETE "http://localhost:3000/agents/agent_01HV8X9Y2Z?graceful=false"
```

## Detect Available CLIs

Check which agent CLIs and tools are available:

```bash
curl http://localhost:3000/agents/detected
```

**Response:**

```json
{
  "data": {
    "agents": [
      {
        "name": "claude",
        "installed": true,
        "version": "1.2.0",
        "authenticated": true,
        "capabilities": ["mcp", "tools", "vision"]
      }
    ],
    "tools": [
      {
        "name": "dcg",
        "installed": true,
        "version": "0.5.0"
      }
    ],
    "summary": {
      "agentsInstalled": 1,
      "agentsAuthenticated": 1,
      "toolsInstalled": 5
    }
  },
  "meta": { "type": "detected_clis" }
}
```

Use `?refresh=true` to bypass cache.

## Error Handling

All errors follow a consistent structure:

```json
{
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agent with ID 'agent_xyz' not found",
    "details": {
      "agentId": "agent_xyz"
    },
    "hint": "Verify the agent ID is correct and the session hasn't expired"
  },
  "meta": {
    "correlationId": "req_01HV8XC7D8"
  }
}
```

**Common error codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AGENT_NOT_FOUND` | 404 | Agent doesn't exist |
| `AGENT_NOT_RUNNING` | 400 | Agent not in valid state |
| `AGENT_ALREADY_EXISTS` | 409 | Agent ID collision |
| `DRIVER_NOT_AVAILABLE` | 503 | No driver can handle request |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INVALID_REQUEST` | 400 | Malformed request body |
| `VALIDATION_ERROR` | 400 | Schema validation failed |

Include the `correlationId` when reporting issues.

## Troubleshooting

### Agent Stuck in Initializing

1. Check CLI is installed:
   ```bash
   curl http://localhost:3000/agents/detected
   ```

2. Verify provider account is linked and verified

3. Check server logs for driver errors

### No Output Appearing

1. Verify WebSocket connection is open
2. Check agent status:
   ```bash
   curl http://localhost:3000/agents/{agentId}/status
   ```

3. Try polling the output endpoint directly

### Tool Calls Not Executing

1. Check DCG (Destructive Command Guard) isn't blocking:
   ```bash
   curl http://localhost:3000/dcg/blocks?agentId={agentId}
   ```

2. Review pending approvals if command was flagged

### Session Timeout

- Default timeout is 5 minutes (300000ms)
- Increase with `timeout` parameter on spawn
- Maximum is 24 hours (86400000ms)

## Complete Example: Python Client

```python
import requests
import websocket
import json
import threading

BASE_URL = "http://localhost:3000"

# 1. Spawn agent
response = requests.post(f"{BASE_URL}/agents", json={
    "workingDirectory": "/path/to/project",
    "timeout": 600000
})
agent = response.json()["data"]
agent_id = agent["agentId"]
print(f"Spawned agent: {agent_id}")

# 2. Connect WebSocket for streaming
def on_message(ws, message):
    data = json.loads(message)
    if data.get("channel", "").startswith("agent:output:"):
        print(f"[Output] {data.get('payload', {}).get('content', '')}")

ws = websocket.WebSocketApp(
    f"ws://localhost:3000/ws",
    on_message=on_message
)

# Subscribe to output channel
def on_open(ws):
    ws.send(json.dumps({
        "type": "subscribe",
        "channel": f"agent:output:{agent_id}"
    }))

ws.on_open = on_open
ws_thread = threading.Thread(target=ws.run_forever)
ws_thread.daemon = True
ws_thread.start()

# 3. Send task
response = requests.post(f"{BASE_URL}/agents/{agent_id}/send", json={
    "type": "user",
    "content": "Analyze the project structure and suggest improvements."
})
print(f"Message sent: {response.json()['data']['messageId']}")

# 4. Wait for completion (simplified)
import time
while True:
    status = requests.get(f"{BASE_URL}/agents/{agent_id}/status").json()
    state = status["data"]["lifecycleState"]
    if state in ["completed", "failed", "terminated"]:
        print(f"Agent finished with state: {state}")
        break
    time.sleep(2)

# 5. Cleanup
requests.delete(f"{BASE_URL}/agents/{agent_id}")
```

## Next Steps

- [API Reference](../api-guide.md) - Full API documentation
- [WebSocket Protocol](../architecture/data-flow.md) - Detailed WebSocket messaging
- [Troubleshooting](./troubleshooting.md) - More debugging tips
- [Configuration](./configuration.md) - Customize gateway settings
