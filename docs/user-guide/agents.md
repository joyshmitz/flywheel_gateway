# Managing Agents

Agents are AI assistants that execute coding tasks. This guide covers agent configuration and management.

## Agent Types

Flywheel Gateway supports multiple agent backends:

| Type | Description | Best For |
|------|-------------|----------|
| SDK | Direct API integration | Web-native workflows, structured events |
| ACP | JSON-RPC over stdio | IDE integration, multi-provider support |
| Tmux | Terminal-based | Visual debugging, power users |

## Viewing Agents

Navigate to **Fleet** to see all agents:

- **Name**: Agent identifier
- **Type**: Backend type (SDK, ACP, Tmux)
- **Status**: Current state
- **Sessions**: Active session count
- **Uptime**: Time since last restart

## Agent Lifecycle

```
Creating → Starting → Running → Stopping → Stopped
                ↓
              Error
```

| State | Description | Actions Available |
|-------|-------------|-------------------|
| Creating | Agent is being provisioned | Wait |
| Starting | Agent is initializing | Wait |
| Running | Agent is active | Stop, Restart |
| Stopping | Agent is shutting down | Wait |
| Stopped | Agent is inactive | Start, Delete |
| Error | Agent encountered an issue | Restart, View Logs |

## Agent Configuration

Each agent has configurable settings:

### General Settings

- **Name**: Display name for the agent
- **Description**: Brief description of purpose
- **Tags**: Labels for organization

### Execution Settings

- **Max Sessions**: Maximum concurrent sessions
- **Timeout**: Session timeout in seconds
- **Memory Limit**: Maximum memory usage

### Provider Settings

- **Primary Provider**: Default AI provider to use
- **Fallback Providers**: Backup providers on failure
- **Model**: Specific model version

## Restarting Agents

To restart an agent:

1. Navigate to the agent detail page
2. Click **Restart**
3. Wait for the agent to return to "Running" status

Restarts preserve:
- Agent configuration
- Session history
- Linked accounts

Restarts reset:
- Current session state
- In-memory caches
- WebSocket connections

## Agent Logs

View agent logs for debugging:

1. Click the agent name in Fleet
2. Select the **Logs** tab
3. Use filters to narrow results:
   - **Level**: debug, info, warn, error
   - **Time Range**: Last hour, day, week
   - **Search**: Text search in log messages

## Best Practices

### Naming Conventions

Use descriptive names that indicate purpose:

- `code-reviewer` - Reviews pull requests
- `bug-fixer` - Fixes reported bugs
- `test-writer` - Generates test cases

### Resource Management

- Set appropriate memory limits to prevent runaway usage
- Configure timeouts to avoid stuck sessions
- Use max sessions to prevent overload

### Monitoring

- Check agent health regularly via Fleet dashboard
- Set up alerts for error states
- Review logs when performance degrades
