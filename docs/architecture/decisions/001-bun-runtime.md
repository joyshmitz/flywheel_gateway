# ADR-001: Bun as Runtime

## Status

Accepted

## Context

Flywheel Gateway needs a JavaScript/TypeScript runtime for both the backend server and build tooling. The options considered were:

1. **Node.js** - Established, mature ecosystem
2. **Deno** - Security-first, TypeScript native
3. **Bun** - Performance-focused, all-in-one toolkit

## Decision

We chose **Bun** as the primary runtime for Flywheel Gateway.

## Rationale

### Performance

Bun provides significant performance improvements over Node.js:

- 3-4x faster HTTP server throughput
- Native SQLite driver with excellent performance
- Faster package installation (10-100x faster than npm)
- Faster TypeScript execution (no transpilation step)

### Developer Experience

Bun simplifies the toolchain:

- Built-in TypeScript support (no ts-node or tsx)
- Built-in test runner
- Built-in bundler
- Single binary with all tools included

### WebSocket Support

Native WebSocket support is critical for real-time features:

- Built into the runtime
- Lower memory overhead than ws package
- Simpler API

### Ecosystem Compatibility

Bun maintains high Node.js compatibility:

- Runs most npm packages without modification
- Supports package.json and node_modules
- Compatible with existing tooling (ESLint, Prettier, etc.)

## Consequences

### Positive

- Faster development iteration
- Simpler toolchain configuration
- Better performance in production
- Native TypeScript without build step

### Negative

- Less mature than Node.js
- Some npm packages may have edge-case incompatibilities
- Smaller community (growing)
- Production deployment patterns still evolving

### Mitigation

- Test thoroughly with all dependencies
- Maintain fallback to Node.js for critical paths
- Monitor Bun releases for breaking changes

## References

- [Bun Documentation](https://bun.sh/docs)
- [Bun Performance Benchmarks](https://bun.sh/docs/runtime/performance)
