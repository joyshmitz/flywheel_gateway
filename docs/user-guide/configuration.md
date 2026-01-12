# Configuration

This guide covers system configuration options for Flywheel Gateway.

## Configuration Methods

Configuration can be set via:

1. **Environment variables** - Server-side settings
2. **Dashboard settings** - User preferences
3. **Config files** - Advanced customization

## Environment Variables

### Core Settings

```bash
# Server
PORT=3000                    # HTTP server port
NODE_ENV=production          # Environment mode
LOG_LEVEL=info               # Logging verbosity

# Database
DATABASE_URL="postgresql://..." # Database connection

# Security
JWT_SECRET="..."              # JWT signing secret (32+ chars)
CORS_ORIGINS="https://..."    # Allowed CORS origins
```

### WebSocket Settings

```bash
WS_HEARTBEAT_INTERVAL=30000   # Heartbeat interval (ms)
WS_MAX_PAYLOAD=16777216       # Max message size (bytes)
WS_RECONNECT_DELAY=1000       # Initial reconnect delay (ms)
WS_MAX_RECONNECT_DELAY=30000  # Max reconnect delay (ms)
```

### Agent Settings

```bash
AGENT_DEFAULT_TIMEOUT=3600000  # Default session timeout (ms)
AGENT_MAX_SESSIONS=10          # Max concurrent sessions per agent
AGENT_MEMORY_LIMIT=2147483648  # Memory limit per agent (bytes)
```

### DCG (Destructive Command Guard)

```bash
DCG_ENABLED=true              # Enable/disable DCG
DCG_SAFE_DIRS="/tmp,/var/tmp" # Directories exempt from rm checks
DCG_ALLOWLIST=""              # Patterns to allow (comma-separated)
```

## Dashboard Settings

Access via **Settings** in the sidebar.

### Display Preferences

| Setting | Default | Description |
|---------|---------|-------------|
| Theme | System | Light, Dark, or System |
| Compact Mode | Off | Reduce UI spacing |
| Animations | On | Enable motion effects |
| Font Size | Medium | Small, Medium, Large |

### Notification Preferences

| Setting | Default | Description |
|---------|---------|-------------|
| Session Complete | On | Notify when sessions finish |
| Session Error | On | Notify on session errors |
| Account Issues | On | Notify on account problems |
| Sound | Off | Play notification sounds |

### Session Defaults

| Setting | Default | Description |
|---------|---------|-------------|
| Auto-scroll Output | On | Scroll to new output |
| Line Wrap | Off | Wrap long lines |
| Timestamp Format | Relative | Relative or Absolute |
| Max History | 1000 | Lines to keep in view |

## Advanced Configuration

### Custom DCG Rules

Create `dcg.config.json` in the project root:

```json
{
  "enabled": true,
  "rules": [
    {
      "pattern": "rm -rf /important",
      "action": "block",
      "message": "Cannot delete /important directory"
    },
    {
      "pattern": "git push --force",
      "action": "warn",
      "requireConfirmation": true
    }
  ],
  "allowlist": [
    "rm -rf /tmp/build-*",
    "rm -rf node_modules"
  ],
  "safeDirs": [
    "/tmp",
    "/var/tmp",
    ".cache"
  ]
}
```

### Custom Agent Drivers

Register custom agent drivers in `agents.config.json`:

```json
{
  "drivers": {
    "custom-sdk": {
      "type": "sdk",
      "endpoint": "https://custom-api.example.com",
      "auth": {
        "type": "bearer",
        "tokenEnv": "CUSTOM_API_TOKEN"
      }
    }
  }
}
```

### Logging Configuration

Create `pino.config.json` for custom logging:

```json
{
  "level": "info",
  "transport": {
    "target": "pino-pretty",
    "options": {
      "colorize": true,
      "translateTime": "SYS:standard"
    }
  },
  "redact": [
    "req.headers.authorization",
    "*.apiKey",
    "*.password"
  ]
}
```

## Configuration Precedence

When the same setting is defined multiple times:

1. Environment variables (highest priority)
2. Config files
3. Dashboard settings
4. Default values (lowest priority)

## Validating Configuration

Check your configuration:

```bash
# Validate all config files
bun run config:validate

# Show effective configuration
bun run config:show

# Test database connection
bun run db:test
```

## Security Recommendations

### Production Settings

```bash
NODE_ENV=production
LOG_LEVEL=warn
DCG_ENABLED=true
```

### Secrets Management

- Never commit secrets to version control
- Use environment variables for sensitive values
- Consider secrets managers (Vault, AWS Secrets Manager)
- Rotate secrets periodically

### Network Security

- Always use HTTPS in production
- Configure strict CORS origins
- Use a reverse proxy (nginx, Caddy)
- Enable rate limiting
