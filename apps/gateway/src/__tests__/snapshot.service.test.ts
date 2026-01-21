/**
 * Tests for snapshot service.
 */

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import type { SystemSnapshot } from "@flywheel/shared";
import {
  SnapshotService,
  createSnapshotService,
  getSnapshotService,
  clearSnapshotServiceInstance,
} from "../services/snapshot.service";

// ============================================================================
// Tests
// ============================================================================

describe("SnapshotService", () => {
  beforeEach(() => {
    clearSnapshotServiceInstance();
  });

  afterEach(() => {
    clearSnapshotServiceInstance();
  });

  describe("createSnapshotService", () => {
    test("creates service with default config", () => {
      const service = createSnapshotService();
      expect(service).toBeInstanceOf(SnapshotService);
    });

    test("creates service with custom config", () => {
      const service = createSnapshotService({
        cacheTtlMs: 5000,
        collectionTimeoutMs: 2000,
      });
      expect(service).toBeInstanceOf(SnapshotService);
      expect(service.getCacheStats().ttl).toBe(5000);
    });
  });

  describe("getSnapshotService", () => {
    test("returns singleton instance", () => {
      const first = getSnapshotService();
      const second = getSnapshotService();
      expect(first).toBe(second);
    });

    test("returns same instance after clearSnapshotServiceInstance", () => {
      const first = getSnapshotService();
      clearSnapshotServiceInstance();
      const second = getSnapshotService();
      expect(first).not.toBe(second);
    });
  });

  describe("getSnapshot", () => {
    test("returns valid system snapshot structure", async () => {
      const service = createSnapshotService({
        collectionTimeoutMs: 3000,
      });

      const snapshot = await service.getSnapshot();

      // Check meta structure
      expect(snapshot.meta).toBeDefined();
      expect(snapshot.meta.schemaVersion).toBe("1.0.0");
      expect(typeof snapshot.meta.generatedAt).toBe("string");
      expect(typeof snapshot.meta.generationDurationMs).toBe("number");

      // Check summary structure
      expect(snapshot.summary).toBeDefined();
      expect(["healthy", "degraded", "unhealthy", "unknown"]).toContain(
        snapshot.summary.status,
      );
      expect(typeof snapshot.summary.healthyCount).toBe("number");
      expect(typeof snapshot.summary.degradedCount).toBe("number");
      expect(typeof snapshot.summary.unhealthyCount).toBe("number");
      expect(typeof snapshot.summary.unknownCount).toBe("number");
      expect(Array.isArray(snapshot.summary.issues)).toBe(true);

      // Check NTM structure
      expect(snapshot.ntm).toBeDefined();
      expect(typeof snapshot.ntm.capturedAt).toBe("string");
      expect(typeof snapshot.ntm.available).toBe("boolean");
      expect(Array.isArray(snapshot.ntm.sessions)).toBe(true);
      expect(snapshot.ntm.summary).toBeDefined();
      expect(Array.isArray(snapshot.ntm.alerts)).toBe(true);

      // Check Agent Mail structure
      expect(snapshot.agentMail).toBeDefined();
      expect(typeof snapshot.agentMail.capturedAt).toBe("string");
      expect(typeof snapshot.agentMail.available).toBe("boolean");
      expect(Array.isArray(snapshot.agentMail.agents)).toBe(true);
      expect(Array.isArray(snapshot.agentMail.reservations)).toBe(true);
      expect(snapshot.agentMail.messages).toBeDefined();

      // Check Beads structure
      expect(snapshot.beads).toBeDefined();
      expect(typeof snapshot.beads.capturedAt).toBe("string");
      expect(typeof snapshot.beads.brAvailable).toBe("boolean");
      expect(typeof snapshot.beads.bvAvailable).toBe("boolean");
      expect(snapshot.beads.statusCounts).toBeDefined();
      expect(snapshot.beads.typeCounts).toBeDefined();
      expect(snapshot.beads.priorityCounts).toBeDefined();
      expect(typeof snapshot.beads.actionableCount).toBe("number");
      expect(Array.isArray(snapshot.beads.topRecommendations)).toBe(true);
      expect(Array.isArray(snapshot.beads.quickWins)).toBe(true);
      expect(Array.isArray(snapshot.beads.blockersToClean)).toBe(true);

      // Check Tools structure
      expect(snapshot.tools).toBeDefined();
      expect(typeof snapshot.tools.capturedAt).toBe("string");
      expect(snapshot.tools.dcg).toBeDefined();
      expect(snapshot.tools.slb).toBeDefined();
      expect(snapshot.tools.ubs).toBeDefined();
      expect(["healthy", "degraded", "unhealthy"]).toContain(
        snapshot.tools.status,
      );
    });

    test("returns partial data when some sources fail", async () => {
      const service = createSnapshotService({
        collectionTimeoutMs: 100, // Short timeout to trigger failures
      });

      const snapshot = await service.getSnapshot();

      // Should still return a valid snapshot even if sources fail
      expect(snapshot.meta).toBeDefined();
      expect(snapshot.summary).toBeDefined();
      expect(snapshot.ntm).toBeDefined();
      expect(snapshot.beads).toBeDefined();
      expect(snapshot.tools).toBeDefined();
    });

    test("NTM snapshot has correct summary structure", async () => {
      const service = createSnapshotService();
      const snapshot = await service.getSnapshot();

      expect(typeof snapshot.ntm.summary.totalSessions).toBe("number");
      expect(typeof snapshot.ntm.summary.totalAgents).toBe("number");
      expect(typeof snapshot.ntm.summary.attachedCount).toBe("number");
      expect(snapshot.ntm.summary.byAgentType).toBeDefined();
      expect(typeof snapshot.ntm.summary.byAgentType.claude).toBe("number");
      expect(typeof snapshot.ntm.summary.byAgentType.codex).toBe("number");
      expect(typeof snapshot.ntm.summary.byAgentType.gemini).toBe("number");
    });

    test("Beads snapshot has correct count structures", async () => {
      const service = createSnapshotService();
      const snapshot = await service.getSnapshot();

      // Status counts
      expect(typeof snapshot.beads.statusCounts.open).toBe("number");
      expect(typeof snapshot.beads.statusCounts.inProgress).toBe("number");
      expect(typeof snapshot.beads.statusCounts.blocked).toBe("number");
      expect(typeof snapshot.beads.statusCounts.closed).toBe("number");
      expect(typeof snapshot.beads.statusCounts.total).toBe("number");

      // Type counts
      expect(typeof snapshot.beads.typeCounts.bug).toBe("number");
      expect(typeof snapshot.beads.typeCounts.feature).toBe("number");
      expect(typeof snapshot.beads.typeCounts.task).toBe("number");
      expect(typeof snapshot.beads.typeCounts.epic).toBe("number");
      expect(typeof snapshot.beads.typeCounts.chore).toBe("number");

      // Priority counts
      expect(typeof snapshot.beads.priorityCounts.p0).toBe("number");
      expect(typeof snapshot.beads.priorityCounts.p1).toBe("number");
      expect(typeof snapshot.beads.priorityCounts.p2).toBe("number");
      expect(typeof snapshot.beads.priorityCounts.p3).toBe("number");
      expect(typeof snapshot.beads.priorityCounts.p4).toBe("number");
    });

    test("Tools snapshot has correct tool status structure", async () => {
      const service = createSnapshotService();
      const snapshot = await service.getSnapshot();

      // Check each tool status
      for (const tool of [
        snapshot.tools.dcg,
        snapshot.tools.slb,
        snapshot.tools.ubs,
      ]) {
        expect(typeof tool.installed).toBe("boolean");
        expect(tool.version === null || typeof tool.version === "string").toBe(
          true,
        );
        expect(typeof tool.healthy).toBe("boolean");
      }

      // Check checksums
      expect(Array.isArray(snapshot.tools.checksumStatuses)).toBe(true);
      expect(Array.isArray(snapshot.tools.issues)).toBe(true);
      expect(Array.isArray(snapshot.tools.recommendations)).toBe(true);
    });
  });

  describe("caching", () => {
    test("returns cached snapshot within TTL", async () => {
      const service = createSnapshotService({
        cacheTtlMs: 10000, // 10 seconds
        collectionTimeoutMs: 3000,
      });

      const first = await service.getSnapshot();
      const second = await service.getSnapshot();

      // Should return same snapshot (cached)
      expect(first.meta.generatedAt).toBe(second.meta.generatedAt);
    });

    test("bypassCache returns fresh snapshot", async () => {
      const service = createSnapshotService({
        cacheTtlMs: 60000, // 60 seconds - long TTL
        collectionTimeoutMs: 3000,
      });

      const first = await service.getSnapshot();

      // Wait a tiny bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const second = await service.getSnapshot({ bypassCache: true });

      // Should have different timestamps
      expect(first.meta.generatedAt).not.toBe(second.meta.generatedAt);
    });

    test("getCacheStats returns correct info", async () => {
      const service = createSnapshotService({
        cacheTtlMs: 5000,
      });

      // Before any snapshot
      let stats = service.getCacheStats();
      expect(stats.cached).toBe(false);
      expect(stats.age).toBeNull();
      expect(stats.ttl).toBe(5000);

      // After snapshot
      await service.getSnapshot();
      stats = service.getCacheStats();
      expect(stats.cached).toBe(true);
      expect(stats.age).toBeGreaterThanOrEqual(0);
      expect(stats.ttl).toBe(5000);
    });

    test("clearCache removes cached snapshot", async () => {
      const service = createSnapshotService({
        cacheTtlMs: 60000,
      });

      await service.getSnapshot();
      expect(service.getCacheStats().cached).toBe(true);

      service.clearCache();
      expect(service.getCacheStats().cached).toBe(false);
    });
  });

  describe("health summary computation", () => {
    test("summary counts are consistent", async () => {
      const service = createSnapshotService();
      const snapshot = await service.getSnapshot();

      const { healthyCount, degradedCount, unhealthyCount, unknownCount } =
        snapshot.summary;

      // Total of all counts should equal 4 (ntm, agentMail, beads, tools)
      const total = healthyCount + degradedCount + unhealthyCount + unknownCount;
      expect(total).toBe(4);
    });

    test("summary status reflects unhealthy components", async () => {
      const service = createSnapshotService();
      const snapshot = await service.getSnapshot();

      // If there are unhealthy components, overall should be unhealthy
      if (snapshot.summary.unhealthyCount > 0) {
        expect(snapshot.summary.status).toBe("unhealthy");
      }
    });

    test("summary status reflects degraded when no unhealthy", async () => {
      const service = createSnapshotService();
      const snapshot = await service.getSnapshot();

      // If no unhealthy but some degraded/unknown, should be degraded
      if (
        snapshot.summary.unhealthyCount === 0 &&
        (snapshot.summary.degradedCount > 0 ||
          snapshot.summary.unknownCount > 0)
      ) {
        expect(snapshot.summary.status).toBe("degraded");
      }
    });
  });
});
