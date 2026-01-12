# Working with Sessions

Sessions represent individual agent task executions. This guide covers the session lifecycle and how to work with session outputs.

## Session Lifecycle

```
Created → Queued → Running → Completed/Failed/Cancelled
```

| State | Description |
|-------|-------------|
| Created | Session created, waiting to start |
| Queued | Session waiting for available agent |
| Running | Agent is executing the task |
| Completed | Task finished successfully |
| Failed | Task encountered an error |
| Cancelled | Session was manually stopped |

## Creating a Session

### From Dashboard

1. Navigate to **Sessions**
2. Click **New Session**
3. Fill in the form:
   - **Agent**: Select the agent to use
   - **Task**: Describe what you want done
   - **Repository**: (Optional) Target repository
   - **Branch**: (Optional) Git branch
4. Click **Start**

### From API

```bash
curl -X POST https://api.flywheel.example.com/api/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent_abc123",
    "task": "Fix the authentication bug in login.ts",
    "repository": "owner/repo",
    "branch": "main"
  }'
```

## Viewing Session Output

The session detail page shows real-time output:

### Output Panel

- **Live streaming** via WebSocket
- **Syntax highlighting** for code blocks
- **Search** within output (Ctrl+F)
- **Copy** individual sections

### Metrics Panel

| Metric | Description |
|--------|-------------|
| Duration | Total execution time |
| Tokens | Input + output token count |
| Cost | Estimated cost in USD |
| Tool Calls | Number of tool invocations |

### Events Timeline

View structured events:

- `tool_call` - Agent invoked a tool
- `tool_result` - Tool returned a result
- `text_delta` - Agent output text
- `error` - An error occurred

## Session Controls

| Action | Description | When Available |
|--------|-------------|----------------|
| Pause | Temporarily halt execution | Running |
| Resume | Continue after pause | Paused |
| Stop | Terminate the session | Running, Paused |
| Retry | Re-run with same parameters | Failed |
| Delete | Remove session record | Any final state |

## Working with Checkpoints

Checkpoints capture session state at specific points:

### Automatic Checkpoints

The gateway creates checkpoints:

- Before tool execution
- After significant output
- On state transitions

### Restoring from Checkpoint

1. Open session detail
2. Click **Checkpoints** tab
3. Select the checkpoint to restore
4. Click **Restore**

This creates a new session from that checkpoint.

## Session Search

Find sessions using filters:

| Filter | Description | Example |
|--------|-------------|---------|
| Status | Session state | `status:completed` |
| Agent | Agent name or ID | `agent:code-reviewer` |
| Date | Date range | `after:2026-01-01` |
| Task | Text in task description | `fix authentication` |

## Exporting Session Data

Export session data for analysis:

1. Open session detail
2. Click **Export** dropdown
3. Select format:
   - **JSON**: Full session data
   - **Markdown**: Formatted transcript
   - **CSV**: Metrics only

## Best Practices

### Task Descriptions

Write clear, specific task descriptions:

**Good**:
> Fix the authentication bug in src/auth/login.ts where users can't log in with valid credentials. The error appears in the console as "Invalid token format".

**Poor**:
> Fix the login bug

### Repository Context

Provide repository context when relevant:

- Link to the repository
- Specify the branch
- Reference related issues or PRs

### Monitoring Long Sessions

For sessions longer than a few minutes:

1. Check progress via the output panel
2. Use checkpoints for recovery
3. Set appropriate timeouts
4. Consider breaking into smaller tasks
