# ADR-006: Tool JSON Schema Versioning and Compatibility Policy

> **Bead**: bd-33u3
> **Status**: Accepted
> **Date**: 2026-01-27

## Context

Flywheel Gateway integrates with multiple CLI tools (br, bv, cass, cm, ntm) that emit JSON output. These tools may evolve independently, leading to potential schema drift. We need a clear policy for handling schema changes to ensure gateway stability while allowing tool evolution.

## Decision

### 1. Schema Validation Strategy

**Use Zod with `.passthrough()` for defensive parsing.**

All client adapters in `@flywheel/flywheel-clients` use Zod schemas with `.passthrough()` to:
- Validate required fields exist and have correct types
- Allow unknown fields to pass through without error
- Enable forward compatibility with tool updates

```typescript
// Example from br/index.ts
const BrIssueSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    // ... required fields
  })
  .passthrough(); // Allow extra fields from newer tool versions
```

### 2. Version Detection

**Check tool versions at startup, log mismatches as warnings.**

```typescript
// Detection service pattern
async function checkToolVersion(tool: string): Promise<VersionInfo | null> {
  const result = await runner.run(tool, ['--version']);
  // Parse and return version, or null if unavailable
}
```

Version mismatches should:
- Log a warning, not fail startup
- Be included in health check responses
- Be surfaced in snapshot metadata

### 3. Error Classification

| Error Type | Handling | User Impact |
|------------|----------|-------------|
| **Missing required field** | Throw `CliClientError` with `validation_error` | Request fails with 400 |
| **Wrong field type** | Throw `CliClientError` with `validation_error` | Request fails with 400 |
| **Unknown extra field** | Pass through silently | None |
| **Tool not installed** | Return `not_installed` status | Graceful degradation |
| **Tool timeout** | Throw `CliClientError` with `timeout` | Request fails with 504 |
| **Parse failure** | Throw `CliClientError` with `parse_error` | Request fails with 502 |

### 4. Fallback Behavior

**Graceful degradation over hard failures.**

When a tool is unavailable or returns unexpected output:

1. **Detection**: Return `installed: false` in health checks
2. **Operations**: Return clear error with remediation steps
3. **Snapshot**: Include partial data, mark missing sections
4. **UI**: Show degraded state, not blank/error page

### 5. Schema Evolution Rules

**For tool maintainers:**

| Change Type | Compatibility | Gateway Impact |
|-------------|---------------|----------------|
| Add optional field | Backward compatible | None (passthrough) |
| Add required field | Breaking | Requires client update |
| Remove field | Breaking if required | May cause validation error |
| Change field type | Breaking | Validation error |
| Rename field | Breaking | Validation error |
| Change array to object | Breaking | Validation error |

**For gateway maintainers:**

1. Pin minimum tool versions in documentation
2. Use `.optional()` for fields that may not exist in older versions
3. Use `.passthrough()` on all object schemas
4. Log schema mismatches with tool version for debugging
5. Include schema version in error responses when available

### 6. Version Pinning Strategy

**Document minimum versions, don't enforce at runtime.**

```typescript
// In tool registry or manifest
const MINIMUM_VERSIONS = {
  br: '0.10.0',
  bv: '0.5.0',
  ntm: '0.8.0',
  cass: '0.3.0',
  cm: '0.2.0',
};
```

At runtime:
- Check version if available
- Log warning if below minimum
- Proceed with best-effort parsing
- Include version mismatch in health check

### 7. Error Response Format

All schema-related errors follow the standard format:

```json
{
  "error": {
    "kind": "validation_error",
    "message": "Invalid br list response",
    "details": {
      "tool": "br",
      "toolVersion": "0.9.0",
      "minimumVersion": "0.10.0",
      "issues": [
        {
          "path": ["issues", 0, "priority"],
          "expected": "number",
          "received": "string"
        }
      ]
    }
  }
}
```

## Implementation Checklist

### Client Adapters (`@flywheel/flywheel-clients`)

- [x] Use Zod with `.passthrough()` for all object schemas
- [x] Use `.optional()` for fields that may be absent
- [x] Include tool version in error context when available
- [x] Throw typed `CliClientError` on validation failure

### Gateway Services (`apps/gateway/src/services/`)

- [x] Catch and transform client errors to API errors
- [x] Include tool version in health check responses
- [x] Log schema mismatches with structured context
- [x] Support graceful degradation when tools unavailable

### API Routes (`apps/gateway/src/routes/`)

- [x] Return appropriate HTTP status codes for error types
- [x] Include actionable error details in responses
- [x] Document expected schema in OpenAPI spec

## Consequences

### Positive

- Tools can evolve independently without breaking gateway
- Clear error messages help diagnose version mismatches
- Graceful degradation improves user experience
- Forward compatibility reduces maintenance burden

### Negative

- Extra fields may carry data that could be useful
- Version warnings may be ignored if not surfaced in UI
- Passthrough allows invalid data to reach clients

### Mitigation

- Log extra fields at debug level for analysis
- Surface version warnings in health check UI
- Add schema snapshot tests (bd-20sm) to catch drift

## Related Beads

- **bd-33u3**: This ADR
- **bd-20sm**: Schema snapshot tests for tool JSON outputs
- **bd-2p50**: Tool adapter layer in flywheel-clients
- **bd-3vj0**: Additional tool client adapters

## Examples

### Handling Schema Drift in br Client

```typescript
// br/index.ts - Defensive schema with passthrough
const BrIssueSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string().optional(), // Optional for forward compat
  // New fields from tool updates pass through
}).passthrough();

// Parse with error handling
function parseIssues(stdout: string): BrIssue[] {
  try {
    const data = JSON.parse(stdout);
    return z.array(BrIssueSchema).parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BrClientError('validation_error', 'Invalid br response', {
        issues: error.issues,
      });
    }
    throw new BrClientError('parse_error', 'Failed to parse br output');
  }
}
```

### Gateway Service Error Handling

```typescript
// br.service.ts - Graceful error handling
export async function getBrList(options?: BrListOptions): Promise<BrIssue[]> {
  try {
    return await getBrClient().list(options);
  } catch (error) {
    if (error instanceof BrClientError) {
      log.warn({ kind: error.kind, details: error.details }, 'br client error');
      throw new ApiError(mapClientErrorToStatus(error.kind), error.message);
    }
    throw error;
  }
}

function mapClientErrorToStatus(kind: CliErrorKind): number {
  switch (kind) {
    case 'validation_error': return 400;
    case 'timeout': return 504;
    case 'parse_error': return 502;
    case 'not_installed': return 503;
    default: return 500;
  }
}
```

### Health Check Response

```typescript
// GET /health/tools response
{
  "tools": {
    "br": {
      "installed": true,
      "version": "0.10.5",
      "minimumVersion": "0.10.0",
      "healthy": true,
      "versionOk": true
    },
    "bv": {
      "installed": true,
      "version": "0.4.0",
      "minimumVersion": "0.5.0",
      "healthy": true,
      "versionOk": false,
      "versionWarning": "Version 0.4.0 is below minimum 0.5.0"
    }
  }
}
```
