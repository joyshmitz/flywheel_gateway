/**
 * Health Routes - Health check and readiness probe endpoints.
 *
 * Provides comprehensive health information for operations and monitoring:
 * - /health - Basic liveness probe with version info
 * - /health/ready - Detailed readiness probe with dependency checks
 */

import { count } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { agents } from "../db/schema";
import {
  getBuildInfo,
  getCapabilities,
  getRuntimeInfo,
} from "../services/build-info";
import { sendResource } from "../utils/response";

const health = new Hono();

interface CheckResult {
  status: "pass" | "fail" | "warn";
  message?: string;
  latencyMs?: number;
}

/**
 * GET /health - Liveness probe
 *
 * Returns 200 if the server is running with version and uptime info.
 * This endpoint is used by load balancers and orchestrators.
 */
health.get("/", (c) => {
  const buildInfo = getBuildInfo();
  const runtimeInfo = getRuntimeInfo();

  return sendResource(c, "health_status", {
    status: "healthy",
    version: buildInfo.version,
    commit: buildInfo.commit,
    environment: buildInfo.environment,
    uptime: runtimeInfo.uptimeFormatted,
    uptimeSeconds: runtimeInfo.uptimeSeconds,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/ready - Readiness probe
 *
 * Checks all dependencies and returns detailed status including
 * build info, runtime stats, and feature capabilities.
 * Returns 200 if ready to accept traffic, 503 if not.
 */
health.get("/ready", async (c) => {
  const checks: Record<string, CheckResult> = {};

  // Check database
  const dbCheck = await checkDatabase();
  checks["database"] = dbCheck;

  // Check drivers (placeholder - would check actual driver health)
  checks["drivers"] = { status: "pass", message: "SDK driver available" };

  // Determine overall status
  const allPass = Object.values(checks).every(
    (check) => check.status === "pass",
  );
  const anyFail = Object.values(checks).some(
    (check) => check.status === "fail",
  );

  const status = anyFail ? "unhealthy" : allPass ? "ready" : "degraded";
  const httpStatus = anyFail ? 503 : 200;

  const buildInfo = getBuildInfo();
  const runtimeInfo = getRuntimeInfo();
  const capabilities = getCapabilities();

  return sendResource(
    c,
    "readiness_status",
    {
      status,
      build: {
        version: buildInfo.version,
        commit: buildInfo.commit,
        branch: buildInfo.branch,
        runtime: buildInfo.runtime,
        environment: buildInfo.environment,
        buildTime: buildInfo.buildTime,
      },
      runtime: {
        uptime: runtimeInfo.uptimeFormatted,
        uptimeSeconds: runtimeInfo.uptimeSeconds,
        memoryMB: runtimeInfo.memoryUsageMB,
        pid: runtimeInfo.pid,
      },
      capabilities,
      checks,
      timestamp: new Date().toISOString(),
    },
    httpStatus,
  );
});

/**
 * Check database connectivity and health.
 */
async function checkDatabase(): Promise<CheckResult> {
  const startTime = performance.now();

  try {
    // Simple query to verify database connectivity
    await db.select({ count: count() }).from(agents);

    return {
      status: "pass",
      message: "Database connected",
      latencyMs: Math.round(performance.now() - startTime),
    };
  } catch (error) {
    return {
      status: "fail",
      message: `Database error: ${error instanceof Error ? error.message : String(error)}`,
      latencyMs: Math.round(performance.now() - startTime),
    };
  }
}

export { health };
