# ADR-007: CLI Tool Logging Standards

> **Bead**: bd-2k6i
> **Status**: Accepted
> **Date**: 2026-01-27

## Context

Flywheel Gateway invokes multiple CLI tools (br, bv, cass, cm, ntm, dcg, slb, ubs) as subprocesses. Consistent, structured logging is essential for:
- Debugging tool failures
- Tracing requests across tool invocations
- Auditing command execution
- Preventing sensitive data leakage

## Decision

### 1. Required Log Fields

All CLI tool invocations MUST include these fields:

| Field | Type | Description |
|-------|------|-------------|
| `tool` | string | Tool identifier (e.g., "br", "bv", "dcg") |
| `command` | string | Subcommand or action (e.g., "list", "ready") |
| `args` | string[] | Command arguments (redacted) |
| `latencyMs` | number | Execution time in milliseconds |
| `exitCode` | number | Process exit code |
| `correlationId` | string | Request correlation ID for tracing |

### 2. Optional Log Fields

| Field | Type | When to Include |
|-------|------|-----------------|
| `stdout` | string | Debugging (truncated to 500 chars) |
| `stderr` | string | Errors (truncated to 500 chars) |
| `timedOut` | boolean | When command timed out |
| `cwd` | string | When using non-default directory |

### 3. Log Levels

| Level | When to Use |
|-------|-------------|
| `debug` | Low-level command execution details |
| `info` | Successful operation completions |
| `warn` | Timeouts, non-zero exit codes |
| `error` | Command failures, parse errors |

### 4. Redaction Rules

**Sensitive patterns (automatically redacted):**
```
--password=*, --passwd=*, --secret=*
--token=*, --api-key=*, --apikey=*
--auth=*, --key=*, --authorization=*
--bearer=*, --credentials=*
```

**Example:**
```
Input:  ["--token=abc123", "--verbose"]
Output: ["--token=[REDACTED]", "--verbose"]
```

### 5. Output Truncation

- Maximum `stdout`/`stderr` in logs: 500 characters
- Format: `{first 500 chars}... [truncated, {total} total bytes]`
- Prevents log bloat from large command outputs

## Implementation

### Location

```
apps/gateway/src/utils/cli-logging.ts
```

### Core Functions

```typescript
// Build standardized log fields
buildCliCommandLogFields(input: CliCommandLogInput): CliCommandLogFields

// Log at different levels
logCliCommand(input, message)  // debug
logCliResult(tool, operation, latencyMs, message, extra?)  // info
logCliWarning(input, message)  // warn
logCliError(input, message, error?)  // error

// Create scoped logger for a tool
createToolLogger(tool: string)
```

### Usage Pattern

```typescript
// In service file
import { createToolLogger, logCliCommand, logCliWarning } from "../utils/cli-logging";

const brLogger = createToolLogger("br");

export async function getBrList(options?: BrListOptions): Promise<BrIssue[]> {
  const start = performance.now();
  const issues = await getBrClient().list(options);
  const latencyMs = Math.round(performance.now() - start);

  // Log successful operation at info level
  brLogger.result("br list", latencyMs, "br list fetched", {
    count: issues.length,
  });

  return issues;
}
```

### Low-Level Command Logging

```typescript
// After running a command
const result = await runner.run(command, args, options);
const latencyMs = Math.round(performance.now() - start);

if (result.timedOut) {
  logCliWarning(
    { tool: "br", command, args, latencyMs, exitCode: result.exitCode, timedOut: true },
    "br command timed out",
  );
} else {
  logCliCommand(
    { tool: "br", command, args, exitCode: result.exitCode, latencyMs },
    "br command completed",
  );
}
```

## Adoption Status

### Services Using Logging Standards

| Service | Status | Notes |
|---------|--------|-------|
| `br.service.ts` | ✅ | Uses `createToolLogger`, `logCliCommand`, `logCliWarning` |
| `bv.service.ts` | ✅ | Uses `createToolLogger` |
| `dcg-cli.service.ts` | ✅ | Uses `createToolLogger` |
| `ubs.service.ts` | ✅ | Uses `createToolLogger` |
| `slb.service.ts` | 🔶 | Partial - needs review |
| `cass.service.ts` | 🔶 | Partial - needs review |
| `cm.service.ts` | 🔶 | Partial - needs review |
| `ntm-ingest.service.ts` | 🔶 | Partial - needs review |

### Example Log Output

```json
{
  "level": "info",
  "time": "2026-01-27T16:30:00.000Z",
  "tool": "br",
  "operation": "br list",
  "latencyMs": 42,
  "correlationId": "abc123",
  "count": 15,
  "msg": "br list fetched"
}
```

```json
{
  "level": "warn",
  "time": "2026-01-27T16:30:00.000Z",
  "tool": "br",
  "command": "br",
  "args": ["list", "--json"],
  "latencyMs": 30000,
  "exitCode": -1,
  "timedOut": true,
  "correlationId": "abc123",
  "msg": "br command timed out"
}
```

## Consequences

### Positive

- Consistent log format across all tool invocations
- Correlation IDs enable request tracing
- Sensitive data automatically redacted
- Log volume controlled via truncation

### Negative

- All services must adopt the standard (migration effort)
- Slight overhead from redaction processing
- Truncation may hide useful debugging information

### Mitigation

- Unit tests validate logging compliance (bd-3vj0)
- Debug logs capture full output when needed
- Structured logging enables filtering/aggregation

## Compliance Checklist

New tool integrations MUST:

- [ ] Import logging utilities from `../utils/cli-logging`
- [ ] Create scoped logger: `createToolLogger("toolname")`
- [ ] Log command execution with `logCliCommand` or `toolLogger.command`
- [ ] Log successful operations with `logCliResult` or `toolLogger.result`
- [ ] Log warnings/errors with appropriate functions
- [ ] Include correlation ID (automatic via utilities)
- [ ] Ensure sensitive args are redacted (automatic)

## Related Beads

- **bd-2k6i**: This ADR
- **bd-3vj0**: Unit tests for logging standards compliance
- **bd-pfkx**: Shared CLI runner utility
- **bd-2p50**: Tool adapter layer in flywheel-clients
