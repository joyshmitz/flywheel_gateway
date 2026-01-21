/**
 * NTM WebSocket Bridge Service
 *
 * Bridges NTM ingest events to WebSocket channels.
 * Publishes agent state changes and output from NTM sessions
 * to the appropriate agent:state and agent:output channels.
 *
 * Part of bead bd-28om: Bridge NTM output/state to WebSocket events.
 */

import type { NtmClient, NtmTailOutput } from "@flywheel/flywheel-clients";
import type { WebSocketHub } from "../ws/hub";
import type { MessageMetadata } from "../ws/messages";
import type {
  NtmIngestService,
  NtmStateChangeEvent,
  TrackedNtmAgent,
} from "./ntm-ingest.service";
import { getLogger } from "../middleware/correlation";
import type { AgentOutputPayload, AgentStatePayload } from "./agent-events";

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for the NTM WebSocket bridge.
 */
export interface NtmWsBridgeConfig {
  /** Interval between tail polling in milliseconds (default: 2000) */
  tailPollIntervalMs?: number;
  /** Number of lines to fetch from tail (default: 50) */
  tailLines?: number;
  /** Whether to enable output streaming (default: true) */
  enableOutputStreaming?: boolean;
}

/**
 * Tracks output state for an agent to avoid duplicate streaming.
 */
interface OutputState {
  /** Last line count seen */
  lastLineCount: number;
  /** Hash of last content to detect changes */
  lastContentHash: string;
}

/**
 * Pane output structure from NTM tail.
 */
interface PaneOutput {
  type: string;
  state: string;
  lines: string[];
  truncated: boolean;
}

// =============================================================================
// Service Implementation
// =============================================================================

/**
 * NTM WebSocket Bridge Service
 *
 * Subscribes to NTM ingest events and publishes them to WebSocket channels:
 * - State changes → agent:state:{agentId}
 * - Tail output → agent:output:{agentId}
 */
export class NtmWsBridgeService {
  private config: Required<NtmWsBridgeConfig>;
  private unsubscribeIngest: (() => void) | null = null;
  private tailPollInterval: ReturnType<typeof setInterval> | null = null;
  private outputStates = new Map<string, OutputState>();
  private running = false;

  constructor(
    private hub: WebSocketHub,
    private ingestService: NtmIngestService,
    private ntmClient: NtmClient,
    config: NtmWsBridgeConfig = {},
  ) {
    this.config = {
      tailPollIntervalMs: config.tailPollIntervalMs ?? 2000,
      tailLines: config.tailLines ?? 50,
      enableOutputStreaming: config.enableOutputStreaming ?? true,
    };
  }

  /**
   * Start the bridge service.
   */
  start(): void {
    if (this.running) return;

    const log = getLogger();
    this.running = true;

    // Subscribe to NTM ingest state change events
    this.unsubscribeIngest = this.ingestService.onStateChange((event) => {
      this.handleStateChangeEvent(event);
    });

    // Start polling for tail output if enabled
    if (this.config.enableOutputStreaming) {
      this.startTailPolling();
    }

    log.info(
      {
        tailPollIntervalMs: this.config.tailPollIntervalMs,
        tailLines: this.config.tailLines,
        outputStreamingEnabled: this.config.enableOutputStreaming,
      },
      "[NTM-WS-BRIDGE] Started NTM WebSocket bridge service",
    );
  }

  /**
   * Stop the bridge service.
   */
  stop(): void {
    const log = getLogger();
    this.running = false;

    if (this.unsubscribeIngest) {
      this.unsubscribeIngest();
      this.unsubscribeIngest = null;
    }

    if (this.tailPollInterval) {
      clearInterval(this.tailPollInterval);
      this.tailPollInterval = null;
    }

    this.outputStates.clear();
    log.info("[NTM-WS-BRIDGE] Stopped NTM WebSocket bridge service");
  }

  /**
   * Get service status.
   */
  getStatus(): {
    running: boolean;
    trackedOutputStates: number;
    config: NtmWsBridgeConfig;
  } {
    return {
      running: this.running,
      trackedOutputStates: this.outputStates.size,
      config: this.config,
    };
  }

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  /**
   * Handle state change events from NTM ingest service.
   */
  private handleStateChangeEvent(event: NtmStateChangeEvent): void {
    const log = getLogger();

    // Find the tracked agent to get the gateway agent ID
    const trackedAgents = this.ingestService.getTrackedAgents();
    const tracked = trackedAgents.get(event.pane);

    if (!tracked?.gatewayAgentId) {
      // No gateway agent registered for this pane - skip
      log.debug(
        { pane: event.pane, eventType: event.type },
        "[NTM-WS-BRIDGE] Skipping event for unregistered agent",
      );
      return;
    }

    const agentId = tracked.gatewayAgentId;

    if (event.type === "ntm.agent.state_changed") {
      this.publishStateChange(agentId, event, tracked);
    } else if (event.type === "ntm.agent.health_changed") {
      this.publishHealthChange(agentId, event, tracked);
    }
  }

  /**
   * Publish a state change to the WebSocket hub.
   */
  private publishStateChange(
    agentId: string,
    event: NtmStateChangeEvent,
    tracked: TrackedNtmAgent,
  ): void {
    const payload: AgentStatePayload = {
      agentId,
      previousState: this.mapNtmStateToDisplayState(event.previousValue),
      currentState: this.mapNtmStateToDisplayState(event.newValue),
      reason: `ntm_${event.newValue}`,
      timestamp: event.timestamp.toISOString(),
      correlationId: `ntm-${event.pane}-${Date.now()}`,
    };

    const metadata: MessageMetadata = {
      correlationId: payload.correlationId,
      agentId,
    };

    this.hub.publish(
      { type: "agent:state", agentId },
      "state.change",
      payload,
      metadata,
    );

    getLogger().debug(
      { agentId, previousState: event.previousValue, newState: event.newValue },
      "[NTM-WS-BRIDGE] Published state change to WebSocket",
    );
  }

  /**
   * Publish a health change to the WebSocket hub.
   */
  private publishHealthChange(
    agentId: string,
    event: NtmStateChangeEvent,
    _tracked: TrackedNtmAgent,
  ): void {
    // Publish health changes as state changes with a special reason
    const payload: AgentStatePayload = {
      agentId,
      previousState: event.previousValue,
      currentState: event.newValue,
      reason: `ntm_health_${event.newValue}`,
      timestamp: event.timestamp.toISOString(),
      correlationId: `ntm-health-${event.pane}-${Date.now()}`,
    };

    const metadata: MessageMetadata = {
      correlationId: payload.correlationId,
      agentId,
    };

    this.hub.publish(
      { type: "agent:state", agentId },
      "state.change",
      payload,
      metadata,
    );

    getLogger().debug(
      { agentId, previousHealth: event.previousValue, newHealth: event.newValue },
      "[NTM-WS-BRIDGE] Published health change to WebSocket",
    );
  }

  // ===========================================================================
  // Output Streaming
  // ===========================================================================

  /**
   * Start polling NTM tail for output streaming.
   */
  private startTailPolling(): void {
    this.tailPollInterval = setInterval(() => {
      if (this.running) {
        this.pollTailOutput().catch((err) => {
          getLogger().warn(
            { error: String(err) },
            "[NTM-WS-BRIDGE] Tail poll error",
          );
        });
      }
    }, this.config.tailPollIntervalMs);

    // Don't prevent process exit
    if (this.tailPollInterval.unref) {
      this.tailPollInterval.unref();
    }
  }

  /**
   * Poll NTM tail and publish new output to WebSocket.
   */
  private async pollTailOutput(): Promise<void> {
    const log = getLogger();
    const trackedAgents = this.ingestService.getTrackedAgents();

    // Group agents by session for efficient tail calls
    const sessionAgents = new Map<string, TrackedNtmAgent[]>();
    for (const agent of trackedAgents.values()) {
      if (!agent.gatewayAgentId) continue;
      const agents = sessionAgents.get(agent.sessionName) ?? [];
      agents.push(agent);
      sessionAgents.set(agent.sessionName, agents);
    }

    // Poll tail for each session
    for (const [sessionName, agents] of sessionAgents) {
      try {
        const tailOutput = await this.ntmClient.tail(sessionName, {
          lines: this.config.tailLines,
        });
        this.processSessionTail(sessionName, agents, tailOutput);
      } catch (err) {
        log.debug(
          { sessionName, error: String(err) },
          "[NTM-WS-BRIDGE] Failed to get tail for session",
        );
      }
    }
  }

  /**
   * Process tail output for a session and publish new content.
   */
  private processSessionTail(
    _sessionName: string,
    agents: TrackedNtmAgent[],
    tailOutput: NtmTailOutput,
  ): void {
    const log = getLogger();

    // Cast panes to proper type - NtmTailOutput.panes is Record<string, PaneOutput>
    const panes = tailOutput.panes as Record<string, PaneOutput>;

    for (const agent of agents) {
      const agentId = agent.gatewayAgentId;
      if (!agentId) continue;

      // Find the pane output for this agent
      // Pane format: "sessionName:window.pane" -> we need to match the pane part
      const paneKey = this.findPaneKey(agent.pane, panes);
      if (!paneKey) continue;

      const paneOutput = panes[paneKey];
      if (!paneOutput) continue;

      // Check if content has changed
      const content = paneOutput.lines.join("\n");
      const contentHash = this.hashContent(content);
      const outputState = this.outputStates.get(agent.pane);

      if (outputState?.lastContentHash === contentHash) {
        // No change in output
        continue;
      }

      // Calculate new content (delta if we have previous state)
      let newContent: string;
      if (outputState && paneOutput.lines.length > outputState.lastLineCount) {
        // Get only the new lines
        const newLines = paneOutput.lines.slice(outputState.lastLineCount);
        newContent = newLines.join("\n");
      } else {
        // First time seeing this agent or lines were truncated - send all
        newContent = content;
      }

      // Update state
      this.outputStates.set(agent.pane, {
        lastLineCount: paneOutput.lines.length,
        lastContentHash: contentHash,
      });

      // Publish output chunk
      if (newContent.trim()) {
        this.publishOutput(agentId, newContent, paneOutput.state);

        log.debug(
          {
            agentId,
            pane: agent.pane,
            newContentLength: newContent.length,
            state: paneOutput.state,
          },
          "[NTM-WS-BRIDGE] Published output chunk to WebSocket",
        );
      }
    }
  }

  /**
   * Find the pane key in tail output that matches the agent's pane.
   */
  private findPaneKey(
    agentPane: string,
    panes: Record<string, unknown>,
  ): string | undefined {
    // Direct match
    if (agentPane in panes) return agentPane;

    // Try to extract pane index and match
    const paneMatch = agentPane.match(/\.(\d+)$/);
    if (paneMatch) {
      const paneIdx = paneMatch[1];
      for (const key of Object.keys(panes)) {
        if (key.endsWith(`.${paneIdx}`) || key === paneIdx) {
          return key;
        }
      }
    }

    return undefined;
  }

  /**
   * Publish output to the WebSocket hub.
   */
  private publishOutput(
    agentId: string,
    content: string,
    ntmState: string,
  ): void {
    const payload: AgentOutputPayload = {
      agentId,
      type: "text",
      content,
      timestamp: new Date().toISOString(),
      metadata: {
        source: "ntm",
        ntmState,
      },
    };

    const metadata: MessageMetadata = {
      agentId,
    };

    this.hub.publish(
      { type: "agent:output", agentId },
      "output.chunk",
      payload,
      metadata,
    );
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Map NTM state to a display-friendly state string.
   */
  private mapNtmStateToDisplayState(ntmState: string): string {
    switch (ntmState) {
      case "idle":
        return "READY";
      case "waiting":
        return "READY";
      case "working":
        return "EXECUTING";
      case "thinking":
        return "EXECUTING";
      case "tool_calling":
        return "EXECUTING";
      case "error":
        return "FAILED";
      case "stalled":
        return "PAUSED";
      case "rate_limited":
        return "RATE_LIMITED";
      case "context_low":
        return "CONTEXT_WARNING";
      default:
        return ntmState.toUpperCase();
    }
  }

  /**
   * Simple hash function for content comparison.
   */
  private hashContent(content: string): string {
    // Use a simple hash for quick comparison
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultInstance: NtmWsBridgeService | null = null;

/**
 * Get the default NTM WebSocket bridge service instance.
 */
export function getNtmWsBridgeService(): NtmWsBridgeService | null {
  return defaultInstance;
}

/**
 * Set the default NTM WebSocket bridge service instance (for testing).
 */
export function setNtmWsBridgeService(service: NtmWsBridgeService | null): void {
  defaultInstance = service;
}

/**
 * Start the NTM WebSocket bridge service.
 */
export function startNtmWsBridge(
  hub: WebSocketHub,
  ingestService: NtmIngestService,
  ntmClient: NtmClient,
  config?: NtmWsBridgeConfig,
): NtmWsBridgeService {
  if (defaultInstance) {
    defaultInstance.stop();
  }
  defaultInstance = new NtmWsBridgeService(hub, ingestService, ntmClient, config);
  defaultInstance.start();
  return defaultInstance;
}

/**
 * Stop the NTM WebSocket bridge service.
 */
export function stopNtmWsBridge(): void {
  if (defaultInstance) {
    defaultInstance.stop();
    defaultInstance = null;
  }
}
