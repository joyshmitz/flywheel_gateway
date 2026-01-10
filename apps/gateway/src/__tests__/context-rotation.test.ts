/**
 * Unit tests for the Context Rotation Service.
 */

import { describe, test, expect, beforeEach } from "bun:test";
import type { Agent, TokenUsage } from "@flywheel/agent-drivers";
import {
  calculateHealthLevel,
  getContextHealth,
  needsRotation,
  setRotationConfig,
  getRotationConfig,
  executeRotation,
  type RotationConfig,
  type RotationStrategy,
  type RotationHandlers,
} from "../services/context-rotation";

// Helper to create a mock agent
function createMockAgent(
  id: string,
  tokenUsage: TokenUsage,
  maxTokens = 100000
): Agent {
  return {
    id,
    config: {
      id,
      name: `Test Agent ${id}`,
      provider: "claude",
      model: "sonnet-4",
      workingDirectory: "/tmp",
      maxTokens,
    },
    driverType: "sdk",
    activityState: "idle",
    startedAt: new Date(),
    lastActivityAt: new Date(),
    tokenUsage,
    contextHealth: {
      usagePercent: (tokenUsage.totalTokens / maxTokens) * 100,
      warningLevel: "none",
    },
  };
}

describe("Context Rotation Service", () => {
  describe("calculateHealthLevel", () => {
    const maxTokens = 100000;

    test("returns 'healthy' below warning threshold", () => {
      const tokenUsage: TokenUsage = {
        promptTokens: 30000,
        completionTokens: 10000,
        totalTokens: 40000, // 40%
      };
      expect(calculateHealthLevel(tokenUsage, maxTokens)).toBe("healthy");
    });

    test("returns 'warning' at 75% threshold", () => {
      const tokenUsage: TokenUsage = {
        promptTokens: 50000,
        completionTokens: 25000,
        totalTokens: 75000, // 75%
      };
      expect(calculateHealthLevel(tokenUsage, maxTokens)).toBe("warning");
    });

    test("returns 'critical' at 85% threshold", () => {
      const tokenUsage: TokenUsage = {
        promptTokens: 60000,
        completionTokens: 25000,
        totalTokens: 85000, // 85%
      };
      expect(calculateHealthLevel(tokenUsage, maxTokens)).toBe("critical");
    });

    test("returns 'emergency' at 95% threshold", () => {
      const tokenUsage: TokenUsage = {
        promptTokens: 70000,
        completionTokens: 25000,
        totalTokens: 95000, // 95%
      };
      expect(calculateHealthLevel(tokenUsage, maxTokens)).toBe("emergency");
    });

    test("respects custom thresholds", () => {
      const tokenUsage: TokenUsage = {
        promptTokens: 40000,
        completionTokens: 10000,
        totalTokens: 50000, // 50%
      };
      const customThresholds = {
        warning: 40, // Lower threshold
        critical: 60,
        emergency: 80,
      };
      expect(
        calculateHealthLevel(tokenUsage, maxTokens, customThresholds)
      ).toBe("warning");
    });

    test("returns 'emergency' at 100%", () => {
      const tokenUsage: TokenUsage = {
        promptTokens: 70000,
        completionTokens: 30000,
        totalTokens: 100000, // 100%
      };
      expect(calculateHealthLevel(tokenUsage, maxTokens)).toBe("emergency");
    });
  });

  describe("getContextHealth", () => {
    test("returns correct health status for healthy agent", () => {
      const agent = createMockAgent("test-1", {
        promptTokens: 20000,
        completionTokens: 10000,
        totalTokens: 30000,
      });

      const health = getContextHealth(agent);
      expect(health.agentId).toBe("test-1");
      expect(health.level).toBe("healthy");
      expect(health.usagePercent).toBe(30);
      expect(health.maxTokens).toBe(100000);
      expect(health.suggestion).toBe("Context usage healthy.");
    });

    test("returns warning suggestion for elevated usage", () => {
      const agent = createMockAgent("test-2", {
        promptTokens: 50000,
        completionTokens: 28000,
        totalTokens: 78000,
      });

      const health = getContextHealth(agent);
      expect(health.level).toBe("warning");
      expect(health.suggestion).toBe("Context usage elevated. Monitor closely.");
    });

    test("returns critical suggestion near limit", () => {
      const agent = createMockAgent("test-3", {
        promptTokens: 60000,
        completionTokens: 30000,
        totalTokens: 90000,
      });

      const health = getContextHealth(agent);
      expect(health.level).toBe("critical");
      expect(health.suggestion).toBe(
        "Consider rotating soon. Context nearing limit."
      );
    });

    test("returns emergency suggestion at capacity", () => {
      const agent = createMockAgent("test-4", {
        promptTokens: 70000,
        completionTokens: 26000,
        totalTokens: 96000,
      });

      const health = getContextHealth(agent);
      expect(health.level).toBe("emergency");
      expect(health.suggestion).toBe(
        "Immediate rotation required. Context at capacity."
      );
    });
  });

  describe("needsRotation", () => {
    test("returns true when autoRotate enabled and emergency level", () => {
      const agent = createMockAgent("test-rotate", {
        promptTokens: 70000,
        completionTokens: 26000,
        totalTokens: 96000,
      });

      expect(needsRotation(agent)).toBe(true);
    });

    test("returns false when below emergency threshold", () => {
      const agent = createMockAgent("test-no-rotate", {
        promptTokens: 50000,
        completionTokens: 30000,
        totalTokens: 80000, // 80% - critical but not emergency
      });

      expect(needsRotation(agent)).toBe(false);
    });

    test("returns false when autoRotate disabled", () => {
      const agentId = `test-manual-${Date.now()}`;
      const agent = createMockAgent(agentId, {
        promptTokens: 70000,
        completionTokens: 26000,
        totalTokens: 96000,
      });

      setRotationConfig(agentId, { autoRotate: false });
      expect(needsRotation(agent)).toBe(false);
    });
  });

  describe("Rotation Configuration", () => {
    test("getRotationConfig returns defaults for unknown agent", () => {
      const config = getRotationConfig("unknown-agent");
      expect(config.strategy).toBe("checkpoint_and_restart");
      expect(config.autoRotate).toBe(true);
      expect(config.thresholds.warning).toBe(75);
      expect(config.thresholds.critical).toBe(85);
      expect(config.thresholds.emergency).toBe(95);
    });

    test("setRotationConfig overrides specific fields", () => {
      const agentId = `config-test-${Date.now()}`;

      setRotationConfig(agentId, {
        strategy: "graceful_handoff",
        autoRotate: false,
      });

      const config = getRotationConfig(agentId);
      expect(config.strategy).toBe("graceful_handoff");
      expect(config.autoRotate).toBe(false);
      // Defaults should still apply for unspecified fields
      expect(config.thresholds.warning).toBe(75);
    });

    test("setRotationConfig merges threshold overrides", () => {
      const agentId = `threshold-test-${Date.now()}`;

      setRotationConfig(agentId, {
        thresholds: { warning: 60 },
      });

      const config = getRotationConfig(agentId);
      expect(config.thresholds.warning).toBe(60);
      expect(config.thresholds.critical).toBe(85); // Default preserved
      expect(config.thresholds.emergency).toBe(95); // Default preserved
    });
  });

  describe("executeRotation", () => {
    const testAgent = createMockAgent("rotation-agent", {
      promptTokens: 60000,
      completionTokens: 30000,
      totalTokens: 90000,
    });

    test("executes summarize_and_continue strategy", async () => {
      let messageSent = false;
      const handlers: RotationHandlers = {
        sendMessage: async (_agentId, message) => {
          messageSent = true;
          expect(message).toContain("summary");
        },
        getConversationHistory: async () => [{ role: "user", content: "test" }],
        getToolState: async () => ({ files: [] }),
      };

      const result = await executeRotation(
        testAgent,
        "summarize_and_continue",
        handlers
      );

      expect(result.success).toBe(true);
      expect(result.strategy).toBe("summarize_and_continue");
      expect(result.checkpointId).toBeDefined();
      expect(messageSent).toBe(true);
    });

    test("executes fresh_start strategy", async () => {
      let agentSpawned = false;
      let agentTerminated = false;

      const handlers: RotationHandlers = {
        spawnAgent: async (config) => {
          agentSpawned = true;
          return { agentId: "new-agent-123" };
        },
        terminateAgent: async (agentId) => {
          agentTerminated = true;
          expect(agentId).toBe(testAgent.id);
        },
        getConversationHistory: async () => [],
        getToolState: async () => ({}),
      };

      const result = await executeRotation(testAgent, "fresh_start", handlers);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe("fresh_start");
      expect(result.newAgentId).toBe("new-agent-123");
      expect(agentSpawned).toBe(true);
      expect(agentTerminated).toBe(true);
    });

    test("executes checkpoint_and_restart strategy", async () => {
      let checkpointRestored = false;

      const handlers: RotationHandlers = {
        spawnAgent: async () => ({ agentId: "restarted-agent" }),
        terminateAgent: async () => {},
        getConversationHistory: async () => [
          { role: "user", content: "important context" },
        ],
        getToolState: async () => ({ session: "active" }),
      };

      const result = await executeRotation(
        testAgent,
        "checkpoint_and_restart",
        handlers
      );

      expect(result.success).toBe(true);
      expect(result.strategy).toBe("checkpoint_and_restart");
      expect(result.newAgentId).toBe("restarted-agent");
      expect(result.checkpointId).toBeDefined();
    });

    test("executes graceful_handoff strategy", async () => {
      let handoffMessageSent = false;

      const handlers: RotationHandlers = {
        spawnAgent: async (config) => {
          // Verify handoff context is included
          const configObj = config as { systemPrompt?: string };
          expect(configObj.systemPrompt).toContain("HANDOFF CONTEXT");
          return { agentId: "handoff-agent" };
        },
        terminateAgent: async () => {},
        sendMessage: async (_agentId, message) => {
          handoffMessageSent = true;
          expect(message).toContain("handoff summary");
        },
        getConversationHistory: async () => [],
        getToolState: async () => ({}),
      };

      const result = await executeRotation(
        testAgent,
        "graceful_handoff",
        handlers
      );

      expect(result.success).toBe(true);
      expect(result.strategy).toBe("graceful_handoff");
      expect(result.newAgentId).toBe("handoff-agent");
      expect(handoffMessageSent).toBe(true);
    });

    test("uses agent's configured strategy when not specified", async () => {
      const agentId = `default-strategy-${Date.now()}`;
      const agent = createMockAgent(agentId, testAgent.tokenUsage);

      setRotationConfig(agentId, { strategy: "fresh_start" });

      const handlers: RotationHandlers = {
        spawnAgent: async () => ({ agentId: "spawned" }),
        terminateAgent: async () => {},
        getConversationHistory: async () => [],
        getToolState: async () => ({}),
      };

      const result = await executeRotation(agent, undefined, handlers);
      expect(result.strategy).toBe("fresh_start");
    });

    test("handles rotation failure gracefully", async () => {
      const handlers: RotationHandlers = {
        spawnAgent: async () => {
          throw new Error("Failed to spawn agent");
        },
        getConversationHistory: async () => [],
        getToolState: async () => ({}),
      };

      const result = await executeRotation(testAgent, "fresh_start", handlers);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to spawn agent");
    });

    test("works without handlers (minimal rotation)", async () => {
      const result = await executeRotation(testAgent, "summarize_and_continue");

      expect(result.success).toBe(true);
      expect(result.strategy).toBe("summarize_and_continue");
    });
  });

  describe("Integration: Health-based auto-rotation", () => {
    test("full cycle: detect emergency and trigger rotation", async () => {
      const agentId = `full-cycle-${Date.now()}`;
      const agent = createMockAgent(agentId, {
        promptTokens: 70000,
        completionTokens: 27000,
        totalTokens: 97000, // 97% - emergency
      });

      // Configure agent
      setRotationConfig(agentId, {
        autoRotate: true,
        strategy: "checkpoint_and_restart",
      });

      // Check health
      const health = getContextHealth(agent);
      expect(health.level).toBe("emergency");

      // Check if rotation needed
      expect(needsRotation(agent)).toBe(true);

      // Execute rotation
      const handlers: RotationHandlers = {
        spawnAgent: async () => ({ agentId: "new-agent" }),
        terminateAgent: async () => {},
        getConversationHistory: async () => [
          { role: "user", content: "Context preserved" },
        ],
        getToolState: async () => ({ state: "preserved" }),
      };

      const result = await executeRotation(agent, undefined, handlers);

      expect(result.success).toBe(true);
      expect(result.newAgentId).toBe("new-agent");
      expect(result.checkpointId).toBeDefined();
    });
  });
});
