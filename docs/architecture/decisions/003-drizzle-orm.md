# ADR-003: Drizzle ORM for Database Access

## Status

Accepted

## Context

The gateway needs a database abstraction layer for data persistence. Options considered:

1. **Prisma** - Popular, great DX, code generation
2. **TypeORM** - Feature-rich, decorator-based
3. **Drizzle** - Lightweight, SQL-like, TypeScript native
4. **Kysely** - Type-safe query builder
5. **Raw SQL** - Direct database access

## Decision

We chose **Drizzle ORM** for database access.

## Rationale

### SQL-First Design

Drizzle maintains proximity to SQL:

```typescript
// Drizzle query looks like SQL
const users = await db.select()
  .from(usersTable)
  .where(eq(usersTable.status, 'active'))
  .orderBy(usersTable.createdAt);
```

This makes queries predictable and easy to optimize.

### TypeScript Native

Drizzle provides excellent type safety:

- Schema defined in TypeScript
- Full type inference
- No code generation step
- Compile-time query validation

### Performance

Drizzle is lightweight and fast:

- No runtime overhead
- Direct driver access
- Efficient query building
- Minimal abstractions

### SQLite Support

Native support for bun:sqlite:

- Fast native binding
- Zero configuration
- File-based (easy development)
- Can migrate to PostgreSQL

### Migration System

Built-in migration management:

```bash
bun db:generate  # Generate from schema changes
bun db:migrate   # Apply migrations
bun db:studio    # Visual database browser
```

## Consequences

### Positive

- Fast query execution
- Predictable SQL output
- Easy debugging
- Small bundle impact
- Great TypeScript DX

### Negative

- Less abstraction than Prisma
- Manual relation handling
- Fewer automatic features
- Smaller community

### Mitigation

- Document common patterns
- Create helper functions for relations
- Use Drizzle Studio for debugging

## Schema Example

```typescript
// apps/gateway/src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  status: text('status').notNull().default('stopped'),
  config: text('config', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

## References

- [Drizzle Documentation](https://orm.drizzle.team)
- [Drizzle GitHub](https://github.com/drizzle-team/drizzle-orm)
