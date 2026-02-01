import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { maintenanceMiddleware } from "../middleware/maintenance";
import {
  _resetMaintenanceStateForTests,
  enterMaintenance,
  startDraining,
} from "../services/maintenance.service";
import { sendResource } from "../utils/response";

interface ErrorEnvelope {
  object: "error";
  error: { code: string; message: string; details?: Record<string, unknown> };
}

describe("maintenanceMiddleware", () => {
  const app = new Hono();
  app.use("*", maintenanceMiddleware());

  app.get("/read", (c) => sendResource(c, "ok", { ok: true }));
  app.post("/mutate", async (c) => {
    // Ensure we exercise JSON parsing in route handlers.
    await c.req.json().catch(() => undefined);
    return sendResource(c, "ok", { ok: true });
  });
  app.post("/system/maintenance", (c) => sendResource(c, "ok", { ok: true }));

  beforeEach(() => {
    _resetMaintenanceStateForTests();
  });

  afterEach(() => {
    _resetMaintenanceStateForTests();
  });

  test("allows mutating requests when running", async () => {
    const res = await app.request("/mutate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
    });
    expect(res.status).toBe(200);
  });

  test("blocks mutating requests during maintenance but allows reads", async () => {
    enterMaintenance({ reason: "deploy" });

    const blocked = await app.request("/mutate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
    });
    expect(blocked.status).toBe(503);
    expect(blocked.headers.get("Retry-After")).toBeNull();

    const body = (await blocked.json()) as ErrorEnvelope;
    expect(body.object).toBe("error");
    expect(body.error.code).toBe("MAINTENANCE_MODE");

    const read = await app.request("/read");
    expect(read.status).toBe(200);

    // Allowlist: operators must be able to disable maintenance.
    const allowed = await app.request("/system/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    });
    expect(allowed.status).toBe(200);
  });

  test("blocks mutating requests during draining and includes Retry-After", async () => {
    startDraining({ deadlineSeconds: 60, reason: "shutdown" });

    const blocked = await app.request("/mutate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
    });
    expect(blocked.status).toBe(503);

    const retryAfterHeader = blocked.headers.get("Retry-After");
    expect(retryAfterHeader).not.toBeNull();
    expect(parseInt(retryAfterHeader ?? "0", 10)).toBeGreaterThan(0);

    const body = (await blocked.json()) as ErrorEnvelope;
    expect(body.object).toBe("error");
    expect(body.error.code).toBe("DRAINING");
  });
});
