# Contract Tests

API contract tests that verify response schemas and API behavior.

## Running Tests

```bash
# Run contract tests (requires running server)
bun test:contract

# Or directly
bun test tests/contract/
```

## Test Files

- `api-schemas.test.ts` - API response schema validation using Zod

## What Contract Tests Verify

1. **Response Schemas**: API responses match expected Zod schemas
2. **Status Codes**: Correct HTTP status codes for success/error cases
3. **Error Responses**: Error responses follow consistent structure
4. **Headers**: Required headers (Content-Type, CORS) are present

## Schema Definitions

Schemas are defined using Zod for runtime validation:

```typescript
const AgentSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  status: z.enum(["idle", "ready", "executing", "paused", "failed"]),
});
```

## Writing New Contract Tests

1. Define the expected schema using Zod
2. Make an API request
3. Validate the response against the schema

```typescript
test("endpoint returns valid schema", async () => {
  const response = await fetch(`${BASE_URL}/api/endpoint`);
  const body = await response.json();

  const result = MySchema.safeParse(body);
  expect(result.success).toBe(true);
});
```

## Note

Contract tests require a running server. Tests will be skipped if the server is unavailable.
