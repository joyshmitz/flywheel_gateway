/**
 * Tests for global error handler middleware.
 */

import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { z } from "zod";
import { globalErrorHandler } from "../middleware/error-handler";

describe("globalErrorHandler", () => {
  test("handles ZodError and returns 400 with validation errors", async () => {
    const app = new Hono();
    app.onError(globalErrorHandler);

    const TestSchema = z.object({
      name: z.string().min(1),
      age: z.number().min(0),
    });

    app.post("/test", async (c) => {
      const body = await c.req.json();
      TestSchema.parse(body); // Will throw ZodError
      return c.json({ success: true });
    });

    const res = await app.request("/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", age: -1 }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.object).toBe("error");
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(body.error.details?.errors).toBeDefined();
    expect(Array.isArray(body.error.details.errors)).toBe(true);
  });

  test("handles SyntaxError for invalid JSON and returns 400", async () => {
    const app = new Hono();
    app.onError(globalErrorHandler);

    app.post("/test", async (c) => {
      const body = await c.req.json(); // Will throw SyntaxError for invalid JSON
      return c.json(body);
    });

    const res = await app.request("/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ invalid json }",
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.object).toBe("error");
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe("INVALID_REQUEST");
    expect(body.error.message).toContain("JSON");
  });

  test("handles unknown errors and returns 500", async () => {
    const app = new Hono();
    app.onError(globalErrorHandler);

    app.get("/test", () => {
      throw new Error("Something went wrong");
    });

    const res = await app.request("/test");

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.object).toBe("error");
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});
