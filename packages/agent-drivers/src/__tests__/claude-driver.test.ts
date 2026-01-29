/**
 * Tests for Claude SDK Driver.
 */

import { describe, expect, it, beforeEach } from "bun:test";
import { createDriverOptions } from "../base-driver";
import { ClaudeSDKDriver } from "../sdk/claude-driver";
import type { AgentConfig } from "../types";

describe("ClaudeSDKDriver", () => {
  it("should accumulate token usage correctly", async () => {
    const config = createDriverOptions("sdk", { driverId: "test-claude" });
    const driver = new ClaudeSDKDriver(config, { apiKey: "" });

    // Spawn agent
    const agentConfig: AgentConfig = {
      id: "agent-1",
      provider: "claude",
      model: "claude-3-sonnet",
      workingDirectory: "/tmp",
    };
    await driver.spawn(agentConfig);

    // Initial state
    let state = await driver.getState("agent-1");
    expect(state.tokenUsage.totalTokens).toBe(0);

    // Send message 1
    await driver.send("agent-1", "Hello");

    // Wait for processing to complete (state back to idle)
    // processRequest has a 100ms delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    state = await driver.getState("agent-1");
    // ClaudeSDKDriver simulates usage: 100 prompt, 50 completion, 150 total
    expect(state.tokenUsage.promptTokens).toBe(100);
    expect(state.tokenUsage.completionTokens).toBe(50);
    expect(state.tokenUsage.totalTokens).toBe(150);

    // Send message 2
    await driver.send("agent-1", "Another message");

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 200));

    state = await driver.getState("agent-1");
    // Should be accumulated: 100+100=200 prompt, 50+50=100 completion, 150+150=300 total
    expect(state.tokenUsage.promptTokens).toBe(200);
    expect(state.tokenUsage.completionTokens).toBe(100);
    expect(state.tokenUsage.totalTokens).toBe(300);
  });

  it("should prune conversation history when it exceeds maxHistoryMessages", async () => {
    // Create driver with small history limit for testing
    const config = createDriverOptions("sdk", { driverId: "test-claude-prune" });
    const driver = new ClaudeSDKDriver(config, {
      apiKey: "",
      maxHistoryMessages: 5,
    });

    const agentConfig: AgentConfig = {
      id: "agent-prune",
      provider: "claude",
      model: "claude-3-sonnet",
      workingDirectory: "/tmp",
    };
    await driver.spawn(agentConfig);

    // Send multiple messages to exceed the limit
    // Each send adds 1 user message + 1 assistant response = 2 messages
    // With maxHistoryMessages=5, we expect pruning after 3 sends (6 messages)
    for (let i = 0; i < 4; i++) {
      await driver.send("agent-prune", `Message ${i}`);
      // Wait for processing (simulation mode has 100ms delay)
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // After 4 sends: 8 messages total, but should be pruned to 5
    // We can verify by checking that checkpointing captures the right length
    const checkpoint = await driver.createCheckpoint("agent-prune", "test");
    expect(checkpoint).toBeDefined();

    // Verify the checkpoint was created (indicates history is working)
    const checkpoints = await driver.listCheckpoints("agent-prune");
    expect(checkpoints.length).toBe(1);

    // Get the full checkpoint to verify history length
    const fullCheckpoint = await driver.getCheckpoint("agent-prune", checkpoint.id);
    // Should be exactly maxHistoryMessages (5) due to pruning
    expect(fullCheckpoint.conversationHistory).toBeDefined();
    expect((fullCheckpoint.conversationHistory as unknown[]).length).toBe(5);
  });

  it("should preserve the first message when pruning", async () => {
    const config = createDriverOptions("sdk", { driverId: "test-claude-first-msg" });
    const driver = new ClaudeSDKDriver(config, {
      apiKey: "",
      maxHistoryMessages: 3,
    });

    const agentConfig: AgentConfig = {
      id: "agent-first-msg",
      provider: "claude",
      model: "claude-3-sonnet",
      workingDirectory: "/tmp",
    };
    await driver.spawn(agentConfig);

    // Send enough messages to trigger pruning multiple times
    for (let i = 0; i < 5; i++) {
      await driver.send("agent-first-msg", `Message ${i}`);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Create checkpoint to inspect history
    const checkpoint = await driver.createCheckpoint("agent-first-msg", "test");
    const fullCheckpoint = await driver.getCheckpoint("agent-first-msg", checkpoint.id);

    const history = fullCheckpoint.conversationHistory as Array<{ content: string; role: string }>;
    expect(history.length).toBe(3);

    // First message should be the original "Message 0" (user message preserved)
    const firstMsg = history[0];
    expect(firstMsg).toBeDefined();
    expect(firstMsg!.content).toBe("Message 0");
    expect(firstMsg!.role).toBe("user");
  });

  it("should not prune when history is under the limit", async () => {
    const config = createDriverOptions("sdk", { driverId: "test-claude-no-prune" });
    const driver = new ClaudeSDKDriver(config, {
      apiKey: "",
      maxHistoryMessages: 100, // Default, high limit
    });

    const agentConfig: AgentConfig = {
      id: "agent-no-prune",
      provider: "claude",
      model: "claude-3-sonnet",
      workingDirectory: "/tmp",
    };
    await driver.spawn(agentConfig);

    // Send just a few messages
    for (let i = 0; i < 3; i++) {
      await driver.send("agent-no-prune", `Message ${i}`);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Create checkpoint to inspect history
    const checkpoint = await driver.createCheckpoint("agent-no-prune", "test");
    const fullCheckpoint = await driver.getCheckpoint("agent-no-prune", checkpoint.id);

    const history = fullCheckpoint.conversationHistory as unknown[];
    // 3 sends = 6 messages (3 user + 3 assistant), no pruning
    expect(history.length).toBe(6);
  });
});
