import { describe, expect, test } from "bun:test";

import {
  createGatewayError,
  deserializeGatewayError,
  serializeGatewayError,
  toGatewayError,
} from "../index";

describe("GatewayError serialization", () => {
  test("serialize/deserialize preserves core fields", () => {
    const err = createGatewayError("AGENT_TERMINATED", "Agent terminated", {
      context: { correlationId: "corr-789" },
      details: { agentId: "agent-1" },
    });

    const payload = serializeGatewayError(err);
    expect(payload.code).toBe("AGENT_TERMINATED");
    expect(payload.message).toBe("Agent terminated");
    expect(payload.httpStatus).toBe(410);
    expect(payload.context?.correlationId).toBe("corr-789");
    expect(payload.details?.["agentId"]).toBe("agent-1");

    const restored = deserializeGatewayError(payload);
    expect(restored.code).toBe(err.code);
    expect(restored.message).toBe(err.message);
    expect(restored.httpStatus).toBe(err.httpStatus);
  });

  test("toGatewayError wraps unknown errors", () => {
    const err = toGatewayError(new Error("boom"));
    expect(err.code).toBe("SYSTEM_INTERNAL_ERROR");
    expect(err.message).toBe("boom");
  });
});
