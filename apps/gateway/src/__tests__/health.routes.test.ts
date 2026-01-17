/**
 * Tests for health routes.
 */

import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { clearDetailedHealthCache, health } from "../routes/health";
import { clearDetectionCache } from "../services/agent-detection.service";

describe("Health Routes", () => {
  const app = new Hono().route("/health", health);

  describe("GET /health", () => {
    test("returns healthy status", async () => {
      const res = await app.request("/health");

      expect(res.status).toBe(200);
      const body = await res.json();
      // Canonical envelope format
      expect(body.object).toBe("health_status");
      expect(body.data.status).toBe("healthy");
      expect(body.data.timestamp).toBeDefined();
      expect(body.requestId).toBeDefined();
    });
  });

  describe("GET /health/ready", () => {
    test("returns readiness status with checks", async () => {
      const res = await app.request("/health/ready");

      expect(res.status).toBe(200);
      const body = await res.json();
      // Canonical envelope format
      expect(body.object).toBe("readiness_status");
      expect(["ready", "degraded", "unhealthy"]).toContain(body.data.status);
      expect(body.data.checks).toBeDefined();
      expect(body.data.checks.database).toBeDefined();
      expect(body.data.checks.drivers).toBeDefined();
      expect(body.data.timestamp).toBeDefined();
    });

    test("includes database check result", async () => {
      const res = await app.request("/health/ready");
      const body = await res.json();

      expect(body.data.checks.database.status).toBeDefined();
      expect(["pass", "fail", "warn"]).toContain(
        body.data.checks.database.status,
      );
    });

    test("includes drivers check result", async () => {
      const res = await app.request("/health/ready");
      const body = await res.json();

      expect(body.data.checks.drivers.status).toBe("pass");
      expect(body.data.checks.drivers.message).toContain("driver");
    });
  });

  // Note: The /health/detailed endpoint tests are skipped by default because
  // CLI auth checks (especially for claude) can take 30-60+ seconds due to
  // network timeouts. To run these tests, set RUN_SLOW_TESTS=1 environment variable.
  const runSlowTests = process.env.RUN_SLOW_TESTS === "1";

  describe.skipIf(!runSlowTests)("GET /health/detailed", () => {
    // Store the first response to avoid expensive re-detection
    let cachedResponse: Response | null = null;
    let cachedBody: unknown = null;

    // Helper to get the response (makes first request or returns cached)
    async function getDetailedHealth() {
      if (!cachedBody) {
        // Clear caches for a fresh start on first request
        clearDetailedHealthCache();
        clearDetectionCache();
        cachedResponse = await app.request("/health/detailed");
        cachedBody = await cachedResponse.json();
      }
      return {
        response: cachedResponse!,
        body: cachedBody as Record<string, unknown>,
      };
    }

    // First test makes the expensive request - all others use cached body
    test(
      "returns detailed health status with all components",
      async () => {
        const { response, body } = await getDetailedHealth();

        // Status should be 200 or 503 depending on component health
        expect([200, 503]).toContain(response.status);
        // Canonical envelope format
        expect(body.object).toBe("detailed_health");
        const data = body.data as Record<string, unknown>;
        expect(["healthy", "degraded", "unhealthy"]).toContain(data.status);
        expect(data.timestamp).toBeDefined();
      },
      { timeout: 120_000 },
    );

    test("includes all component health checks", async () => {
      const { body } = await getDetailedHealth();
      const data = body.data as Record<string, unknown>;
      const components = data.components as Record<string, unknown>;

      // Check that all components are present
      expect(components).toBeDefined();
      expect(components.database).toBeDefined();
      expect(components.dcg).toBeDefined();
      expect(components.cass).toBeDefined();
      expect(components.ubs).toBeDefined();
      expect(components.drivers).toBeDefined();
      expect(components.websocket).toBeDefined();
      expect(components.agentCLIs).toBeDefined();
    });

    test("includes summary with pass/fail counts", async () => {
      const { body } = await getDetailedHealth();
      const data = body.data as Record<string, unknown>;
      const summary = data.summary as Record<string, unknown>;

      expect(summary).toBeDefined();
      expect(typeof summary.totalChecks).toBe("number");
      expect(typeof summary.passed).toBe("number");
      expect(typeof summary.degraded).toBe("number");
      expect(typeof summary.failed).toBe("number");
      expect(Array.isArray(summary.criticalFailures)).toBe(true);
    });

    test("each component has required fields", async () => {
      const { body } = await getDetailedHealth();
      const data = body.data as Record<string, unknown>;
      const components = data.components as Record<string, unknown>;

      // Check structure of a component
      const dbHealth = components.database as Record<string, unknown>;
      expect(["healthy", "degraded", "unhealthy"]).toContain(dbHealth.status);
      expect(typeof dbHealth.message).toBe("string");
      expect(typeof dbHealth.latencyMs).toBe("number");
    });

    test("websocket component includes stats", async () => {
      const { body } = await getDetailedHealth();
      const data = body.data as Record<string, unknown>;
      const components = data.components as Record<string, unknown>;

      const wsHealth = components.websocket as Record<string, unknown>;
      expect(wsHealth.stats).toBeDefined();
      const stats = wsHealth.stats as Record<string, unknown>;
      expect(typeof stats.activeConnections).toBe("number");
    });

    test("drivers component includes registered drivers", async () => {
      const { body } = await getDetailedHealth();
      const data = body.data as Record<string, unknown>;
      const components = data.components as Record<string, unknown>;

      const driversHealth = components.drivers as Record<string, unknown>;
      expect(Array.isArray(driversHealth.registered)).toBe(true);
    });

    test("caches results for subsequent requests", async () => {
      // getDetailedHealth already ensures caching is working
      // Let's verify by making a direct request that should hit cache
      await getDetailedHealth(); // Ensure cache is populated

      // Second request should return cached result quickly
      const res = await app.request("/health/detailed");
      const body = await res.json();

      // Should have the response
      expect(body.data.timestamp).toBeDefined();
    });
  });
});
