/**
 * E2E Logging Framework
 * Part of bd-1vr1.5: Playwright logging + diagnostics framework
 *
 * This module provides comprehensive logging, diagnostics, and structured
 * reporting for Playwright E2E tests. It captures:
 *
 * - Browser console events (log, warn, error, info, debug)
 * - Network request/response summaries with timing
 * - WebSocket message tracking (via CDP where available)
 * - Page errors (uncaught exceptions)
 * - Performance timing metrics (FCP, LCP, CLS, load time)
 *
 * Usage:
 * ```ts
 * // Use the extended test fixtures
 * import { test, expect } from "../lib/fixtures";
 *
 * test("my test", async ({ loggedPage }) => {
 *   await loggedPage.goto("/");
 *   await expect(loggedPage.locator("h1")).toBeVisible();
 *   // All logging is automatic!
 * });
 * ```
 *
 * Configuration (playwright.config.ts):
 * ```ts
 * reporter: [
 *   ["list"],
 *   ["./lib/reporter.ts", { verbose: true }],
 * ],
 * ```
 */

// Types
export type {
  ConsoleEntry,
  NetworkEntry,
  WebSocketEntry,
  PageErrorEntry,
  TimingMetrics,
  TestLogBundle,
  TestStep,
  TestError,
  RunSummary,
} from "./types";

// Core logging utilities
export { TestLogger, createTestLogger } from "./logging";

// Extended fixtures
export { test, expect, getTestPrefix, logMarker } from "./fixtures";
export type { LoggingFixtures } from "./fixtures";

// Reporter is imported directly in config, but export for reference
export { default as StructuredReporter } from "./reporter";
