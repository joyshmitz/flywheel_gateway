# Tool Registry

The tool registry defines which CLI tools are available for Flywheel Gateway's setup wizard and system health checks. This guide explains how the registry is loaded, cached, and how to recover from errors.

## Overview

Flywheel Gateway loads tool definitions from an **ACFS manifest file** (YAML format). If the manifest is missing or invalid, the system automatically falls back to a **built-in registry** containing essential tools.

```
┌─────────────────────────────────────────────────────────────┐
│                    Registry Load Flow                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐                                          │
│   │ Load Request │                                          │
│   └──────┬───────┘                                          │
│          │                                                   │
│          ▼                                                   │
│   ┌──────────────┐     Cache valid?     ┌──────────────┐   │
│   │ Check Cache  │─────── Yes ─────────▶│ Return Cache │   │
│   └──────┬───────┘                       └──────────────┘   │
│          │ No                                                │
│          ▼                                                   │
│   ┌──────────────┐     Exists?          ┌──────────────┐   │
│   │ Check File   │─────── No ──────────▶│   Fallback   │   │
│   └──────┬───────┘                       └──────────────┘   │
│          │ Yes                                               │
│          ▼                                                   │
│   ┌──────────────┐     Readable?        ┌──────────────┐   │
│   │  Read File   │─────── No ──────────▶│   Fallback   │   │
│   └──────┬───────┘                       └──────────────┘   │
│          │ Yes                                               │
│          ▼                                                   │
│   ┌──────────────┐     Valid YAML?      ┌──────────────┐   │
│   │  Parse YAML  │─────── No ──────────▶│   Fallback   │   │
│   └──────┬───────┘                       └──────────────┘   │
│          │ Yes                                               │
│          ▼                                                   │
│   ┌──────────────┐     Valid Schema?    ┌──────────────┐   │
│   │   Validate   │─────── No ──────────▶│   Fallback   │   │
│   └──────┬───────┘                       └──────────────┘   │
│          │ Yes                                               │
│          ▼                                                   │
│   ┌──────────────┐                                          │
│   │Return + Cache│                                          │
│   └──────────────┘                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Registry Sources

### Manifest (Primary)

The ACFS manifest file (`acfs.manifest.yaml`) contains the full tool registry with all available tools, installation instructions, verification commands, and metadata.

When the manifest loads successfully:
- `source: "manifest"` is set in metadata
- Full tool catalog is available
- SHA-256 hash of the manifest is cached for change detection

### Fallback (Built-in)

When the manifest cannot be loaded, a minimal built-in registry is used containing only essential tools:

| Tool | Category | Description |
|------|----------|-------------|
| `claude` | agent | Claude Code CLI - primary agent interface |
| `dcg` | tool | Destructive Command Guard |
| `slb` | tool | Simultaneous Launch Button (two-person rule) |
| `ubs` | tool | Ultimate Bug Scanner |
| `br` | tool | Beads issue tracker |
| `bv` | tool | Graph-aware issue triage |

The fallback registry:
- Uses `schemaVersion: "1.0.0-fallback"` to indicate fallback mode
- Has `source: "built-in"` in metadata
- Contains only the minimum tools needed for basic operation

## Cache Behavior

The registry is cached in memory to avoid repeated file reads.

### Cache Parameters

| Parameter | Default | Environment Variable |
|-----------|---------|---------------------|
| TTL | 60 seconds | `ACFS_MANIFEST_TTL_MS` or `TOOL_REGISTRY_TTL_MS` |
| Path | `acfs.manifest.yaml` | `ACFS_MANIFEST_PATH` or `TOOL_REGISTRY_PATH` |

### Cache Invalidation

The cache is automatically invalidated when:
- TTL expires (default: 60 seconds)
- `bypassCache: true` option is passed to load functions
- `clearToolRegistryCache()` is called programmatically

### Example: Adjust Cache TTL

```bash
# Extend cache to 5 minutes
export ACFS_MANIFEST_TTL_MS=300000

# Disable caching entirely (reload every request)
export ACFS_MANIFEST_TTL_MS=0
```

## Error Categories

When the manifest fails to load, the system logs a specific error category to help diagnose the issue:

### `manifest_missing`

**Cause**: The manifest file does not exist at the configured path.

**Message**: "ACFS manifest file not found. Using built-in fallback registry."

**Resolution**:
1. Check the manifest path configuration
2. Ensure the file exists at the expected location
3. If using a custom path, verify `ACFS_MANIFEST_PATH` or `TOOL_REGISTRY_PATH`

### `manifest_read_error`

**Cause**: The file exists but cannot be read (permission denied, I/O error).

**Message**: "Failed to read ACFS manifest file. Using built-in fallback registry."

**Resolution**:
1. Check file permissions: `ls -la acfs.manifest.yaml`
2. Ensure the gateway process has read access
3. Verify the file is not locked by another process

### `manifest_parse_error`

**Cause**: The file contains invalid YAML syntax.

**Message**: "ACFS manifest contains invalid YAML. Using built-in fallback registry."

**Resolution**:
1. Validate YAML syntax with a linter: `yamllint acfs.manifest.yaml`
2. Check for common YAML issues:
   - Incorrect indentation
   - Unquoted special characters
   - Missing colons after keys

### `manifest_validation_error`

**Cause**: The YAML parses successfully but doesn't match the expected schema.

**Message**: "ACFS manifest failed schema validation. Using built-in fallback registry."

**Resolution**:
1. Check `schemaVersion` matches a supported version
2. Ensure all required fields are present
3. Verify field types match expectations (arrays, strings, numbers)
4. Review server logs for specific validation issues

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ACFS_MANIFEST_PATH` | Absolute or relative path to manifest | `acfs.manifest.yaml` |
| `TOOL_REGISTRY_PATH` | Alias for `ACFS_MANIFEST_PATH` | - |
| `ACFS_MANIFEST_TTL_MS` | Cache duration in milliseconds | `60000` |
| `TOOL_REGISTRY_TTL_MS` | Alias for `ACFS_MANIFEST_TTL_MS` | - |

Path resolution:
- Absolute paths are used as-is
- Relative paths are resolved from the project root
- If running from `apps/gateway/`, the resolver navigates to the monorepo root

### Example Configuration

```bash
# Use a custom manifest location
export ACFS_MANIFEST_PATH="/etc/flywheel/tools.yaml"

# Reduce cache TTL for development
export ACFS_MANIFEST_TTL_MS=5000

# Or use the alternate variable names
export TOOL_REGISTRY_PATH="./config/acfs.manifest.yaml"
export TOOL_REGISTRY_TTL_MS=30000
```

## Recovery Procedures

### Identifying Fallback Mode

Check if the system is using the fallback registry:

1. **Check logs** for warning messages containing `using fallback`
2. **Check metadata** via the API or `getToolRegistryMetadata()`:
   - `registrySource: "fallback"` indicates fallback mode
   - `errorCategory` shows why the manifest failed

### Recovering from Fallback

1. **Identify the error** from logs or metadata (see Error Categories above)

2. **Fix the underlying issue**:
   - Missing file: Create or restore the manifest
   - Read error: Fix file permissions
   - Parse error: Fix YAML syntax
   - Validation error: Fix schema compliance

3. **Wait for cache expiry** (default 60 seconds) or restart the gateway

4. **Verify recovery** by checking:
   - Logs show "Tool registry loaded from manifest"
   - Metadata shows `registrySource: "manifest"`

### Forcing a Reload

To immediately reload the manifest without waiting for cache expiry:

```typescript
import { clearToolRegistryCache, loadToolRegistry } from './services/tool-registry.service';

// Clear cache
clearToolRegistryCache();

// Force reload
const registry = await loadToolRegistry({ bypassCache: true });
```

Or restart the gateway service:

```bash
# Docker
docker compose restart gateway

# Direct
pkill -HUP -f "bun.*gateway"
```

## API Reference

### Loading Functions

```typescript
// Simple load (returns registry only)
const registry = await loadToolRegistry();

// Load with metadata (includes source info)
const result = await loadToolRegistryWithMetadata();
// result.registry - the tool registry
// result.source - "manifest" or "fallback"
// result.errorCategory - why fallback was used (if applicable)
// result.userMessage - human-readable error message

// Load with options
const registry = await loadToolRegistry({
  bypassCache: true,       // Skip cache, always reload
  pathOverride: '/path',   // Use custom manifest path
  throwOnError: true,      // Throw instead of falling back
});
```

### Metadata Functions

```typescript
// Get current cache state
const metadata = getToolRegistryMetadata();
// Returns null if not loaded yet, otherwise:
// {
//   manifestPath: string,
//   schemaVersion: string,
//   manifestHash: string | null,
//   loadedAt: number,
//   registrySource: "manifest" | "fallback",
//   errorCategory?: ManifestErrorCategory,
//   userMessage?: string
// }

// Check if using fallback
const isFallback = isUsingFallbackRegistry();
// true = fallback, false = manifest, null = not loaded

// Get fallback registry directly (for testing/comparison)
const fallback = getFallbackRegistry();
```

### Accessor Functions

```typescript
// List tools by category
const allTools = await listAllTools();
const agents = await listAgentTools();
const setupTools = await listSetupTools();

// List by priority
const required = await getRequiredTools();
const recommended = await getRecommendedTools();
const optional = await getOptionalTools();

// Get categorized breakdown
const { required, recommended, optional } = await categorizeTools();

// Get tools grouped by installation phase
const phases = await getToolsByPhase();
// [{ phase: 0, tools: [...] }, { phase: 1, tools: [...] }, ...]
```
