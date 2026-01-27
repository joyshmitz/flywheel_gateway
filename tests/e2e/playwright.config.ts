import { defineConfig, devices } from "@playwright/test";

process.env["PLAYWRIGHT_TEST"] = "1";

/**
 * Playwright configuration with enhanced logging and diagnostics.
 * Part of bd-1vr1.5: Playwright logging + diagnostics framework
 *
 * Features:
 * - Structured JSON logs per test (in tests/e2e/logs/)
 * - Browser console, network, WebSocket capture
 * - Trace/video/screenshot artifacts on failure
 * - Run summaries with pass/fail statistics
 *
 * Environment variables:
 * - E2E_BASE_URL: Override base URL (default: http://localhost:5173)
 * - E2E_VERBOSE: Set to "1" for verbose logging output
 * - CI: Set by CI systems, enables retries
 */
export default defineConfig({
  testDir: "./",
  timeout: 30_000,
  retries: process.env["CI"] ? 2 : 0,

  // Enhanced reporting with structured JSON logs
  reporter: [
    ["list", { printSteps: true }],
    ["html", { open: "never", outputFolder: "tests/e2e/report" }],
    [
      "./lib/reporter.ts",
      {
        outputDir: "tests/e2e/logs",
        includeConsole: true,
        includeNetwork: true,
        includeWebSocket: true,
        verbose: process.env["E2E_VERBOSE"] === "1",
      },
    ],
  ],

  // Global settings
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? "http://localhost:5173",

    // Artifact collection for debugging
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",

    // Additional capture options
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  // Output directories
  outputDir: "tests/e2e/results",

  // Parallel execution
  fullyParallel: true,
  workers: process.env["CI"] ? 2 : undefined,

  // Browser projects
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Chromium gets full CDP-based logging
        launchOptions: {
          args: ["--enable-logging"],
        },
      },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  // Web server configuration (uncomment to auto-start dev servers)
  // webServer: [
  //   {
  //     command: "bun run dev:gateway",
  //     url: "http://localhost:3000/health",
  //     reuseExistingServer: !process.env["CI"],
  //     timeout: 60_000,
  //   },
  //   {
  //     command: "bun run dev:web",
  //     url: "http://localhost:5173",
  //     reuseExistingServer: !process.env["CI"],
  //     timeout: 60_000,
  //   },
  // ],
});
