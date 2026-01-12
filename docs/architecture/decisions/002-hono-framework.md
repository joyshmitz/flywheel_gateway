# ADR-002: Hono as HTTP Framework

## Status

Accepted

## Context

The gateway server needs an HTTP framework for routing, middleware, and request handling. Options considered:

1. **Express** - Most popular, large ecosystem
2. **Fastify** - Performance-focused, schema validation
3. **Hono** - Ultra-lightweight, multi-runtime
4. **Elysia** - Bun-native, type-safe

## Decision

We chose **Hono** as the HTTP framework for the gateway server.

## Rationale

### Multi-Runtime Support

Hono runs on multiple runtimes:

- Bun (primary)
- Node.js (fallback)
- Cloudflare Workers (edge deployment)
- Deno

This provides deployment flexibility without code changes.

### Performance

Hono is extremely lightweight:

- ~14KB minified
- No dependencies
- Optimized for speed
- Native Bun integration

### TypeScript First

Hono provides excellent TypeScript support:

- Fully typed routes and middleware
- Type inference for request/response
- Zod integration for validation
- End-to-end type safety with tRPC-like patterns

### Express Compatibility

Hono's API is familiar to Express users:

```typescript
// Express-like syntax
app.get('/users', (c) => c.json({ users: [] }));
app.post('/users', async (c) => {
  const body = await c.req.json();
  return c.json(body, 201);
});
```

### Middleware Ecosystem

Hono has useful built-in middleware:

- CORS
- JWT authentication
- Rate limiting
- Request logging
- Compression

## Consequences

### Positive

- Fast request handling
- Type-safe routes
- Easy to test
- Small bundle size
- Good documentation

### Negative

- Smaller ecosystem than Express
- Less middleware variety
- Some patterns differ from Express
- Fewer StackOverflow answers

### Mitigation

- Write custom middleware when needed
- Document patterns for team
- Keep Express knowledge for reference

## References

- [Hono Documentation](https://hono.dev)
- [Hono GitHub](https://github.com/honojs/hono)
