# Getting Started

This guide will help you set up Flywheel Gateway and run your first agent session.

## Prerequisites

Before you begin, ensure you have:

- Access to a Flywheel Gateway instance (self-hosted or managed)
- At least one AI provider account (Claude, Codex, or Gemini)
- A modern web browser (Chrome, Firefox, Safari, Edge)

## Step 1: Access the Dashboard

Navigate to your Flywheel Gateway URL in your browser:

- **Development**: `http://localhost:5173`
- **Production**: Your configured domain (e.g., `https://flywheel.example.com`)

## Step 2: Link Your First Account

Flywheel Gateway uses BYOA (Bring Your Own Account) for AI providers. You need to link at least one provider account to start using agents.

1. Click **Accounts** in the sidebar
2. Click **Add Account**
3. Select a provider (Claude, Codex, or Gemini)
4. Follow the authentication flow:
   - **OAuth**: Click authorize and approve access
   - **API Key**: Paste your API key from the provider dashboard
   - **Device Code**: Follow the on-screen instructions for headless auth

Once linked, your account will show a green "Verified" status.

## Step 3: View the Fleet Dashboard

The **Fleet** page shows all available agents and their status:

| Status | Description |
|--------|-------------|
| Running | Agent is active and accepting sessions |
| Idle | Agent is available but not currently working |
| Stopped | Agent is disabled |
| Error | Agent encountered an issue |

## Step 4: Start Your First Session

1. Navigate to **Sessions** in the sidebar
2. Click **New Session**
3. Select an agent from the dropdown
4. Enter your task description
5. Click **Start**

The session view will show:

- **Live Output**: Real-time terminal output from the agent
- **Status**: Current session state
- **Metrics**: Token usage, duration, and cost

## Step 5: Monitor Progress

While a session is running, you can:

- **Pause**: Temporarily halt execution
- **Resume**: Continue a paused session
- **Stop**: Terminate the session
- **View Logs**: See detailed execution logs

## Next Steps

- [Managing Agents](./agents.md) - Learn about agent configuration
- [Account Management](./accounts.md) - Set up additional providers
- [Configuration](./configuration.md) - Customize your setup

## Getting Help

If you encounter issues:

1. Check [Troubleshooting](./troubleshooting.md)
2. Review the [API Documentation](../api/)
3. Open an issue on [GitHub](https://github.com/Dicklesworthstone/flywheel_gateway/issues)
