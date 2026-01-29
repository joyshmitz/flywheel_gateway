/**
 * Unit tests for WebSocket event loss telemetry (bd-2gkx.2).
 *
 * Tests ring buffer drop stats (capacity evictions, TTL expirations)
 * and verifies the telemetry is exposed through the buffer API.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { RingBuffer } from "../ws/ring-buffer";

describe("RingBuffer Drop Stats", () => {
  describe("capacity evictions", () => {
    test("tracks evictions when buffer overflows", () => {
      const buf = new RingBuffer<string>({ capacity: 3, ttlMs: 0 });

      buf.push("a");
      buf.push("b");
      buf.push("c");
      expect(buf.dropStats.capacityEvictions).toBe(0);

      buf.push("d"); // evicts "a"
      expect(buf.dropStats.capacityEvictions).toBe(1);
      expect(buf.dropStats.lastEvictionAt).not.toBeNull();

      buf.push("e"); // evicts "b"
      buf.push("f"); // evicts "c"
      expect(buf.dropStats.capacityEvictions).toBe(3);
    });

    test("no evictions when under capacity", () => {
      const buf = new RingBuffer<string>({ capacity: 100, ttlMs: 0 });

      buf.push("a");
      buf.push("b");
      buf.push("c");

      expect(buf.dropStats.capacityEvictions).toBe(0);
      expect(buf.dropStats.lastEvictionAt).toBeNull();
    });
  });

  describe("TTL expirations", () => {
    test("tracks expirations during prune", async () => {
      const buf = new RingBuffer<string>({ capacity: 100, ttlMs: 5 });

      buf.push("a");
      buf.push("b");

      // Wait for TTL to expire
      await Bun.sleep(10);

      const pruned = buf.prune();
      expect(pruned).toBe(2);
      expect(buf.dropStats.ttlExpirations).toBe(2);
      expect(buf.dropStats.lastExpirationAt).not.toBeNull();
    });

    test("no expirations when items are fresh", () => {
      const buf = new RingBuffer<string>({ capacity: 100, ttlMs: 60000 });

      buf.push("a");
      buf.push("b");

      const pruned = buf.prune();
      expect(pruned).toBe(0);
      expect(buf.dropStats.ttlExpirations).toBe(0);
    });

    test("no expirations when ttlMs is 0", () => {
      const buf = new RingBuffer<string>({ capacity: 100, ttlMs: 0 });

      buf.push("a");
      const pruned = buf.prune();
      expect(pruned).toBe(0);
      expect(buf.dropStats.ttlExpirations).toBe(0);
    });
  });

  describe("combined tracking", () => {
    test("tracks both evictions and expirations independently", async () => {
      const buf = new RingBuffer<string>({ capacity: 2, ttlMs: 5 });

      buf.push("a");
      buf.push("b");
      buf.push("c"); // evicts "a"
      expect(buf.dropStats.capacityEvictions).toBe(1);

      await Bun.sleep(10);
      buf.prune(); // expires "b" and "c"

      expect(buf.dropStats.capacityEvictions).toBe(1);
      expect(buf.dropStats.ttlExpirations).toBe(2);
    });
  });

  describe("drop stats are readonly", () => {
    test("dropStats returns consistent snapshot", () => {
      const buf = new RingBuffer<string>({ capacity: 1, ttlMs: 0 });

      buf.push("a");
      buf.push("b"); // evicts "a"

      const stats = buf.dropStats;
      expect(stats.capacityEvictions).toBe(1);
      expect(stats.ttlExpirations).toBe(0);
      expect(stats.lastEvictionAt).not.toBeNull();
      expect(stats.lastExpirationAt).toBeNull();
    });
  });
});
