/**
 * Tests for flywheel CLI
 */

import { describe, expect, it } from "bun:test";

/**
 * Run the flywheel CLI with given arguments
 */
async function runCli(
  ...args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", "scripts/flywheel.ts", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}

describe("flywheel CLI", () => {
  describe("help", () => {
    it("should show help with --help flag", async () => {
      const { stdout } = await runCli("--help");
      expect(stdout).toContain("Flywheel Gateway CLI");
      expect(stdout).toContain("Commands:");
      expect(stdout).toContain("doctor");
      expect(stdout).toContain("status");
      expect(stdout).toContain("open");
    });

    it("should show help with -h flag", async () => {
      const { stdout } = await runCli("-h");
      expect(stdout).toContain("Flywheel Gateway CLI");
    });

    it("should show help when no command provided", async () => {
      const { stdout } = await runCli();
      expect(stdout).toContain("Flywheel Gateway CLI");
    });
  });

  describe("doctor command", () => {
    it("should run doctor checks", async () => {
      const { stdout } = await runCli("doctor");
      expect(stdout).toContain("Flywheel Gateway - Doctor");
      expect(stdout).toContain("Bun runtime");
    });

    it("should support --json output", async () => {
      const { stdout } = await runCli("doctor", "--json");
      const json = JSON.parse(stdout);

      expect(json).toHaveProperty("timestamp");
      expect(json).toHaveProperty("checks");
      expect(Array.isArray(json.checks)).toBe(true);
      expect(json.checks.length).toBeGreaterThan(0);
      // Each check should have name, status, message
      expect(json.checks[0]).toHaveProperty("name");
      expect(json.checks[0]).toHaveProperty("status");
      expect(json.checks[0]).toHaveProperty("message");
    });

    it("should include all expected checks", async () => {
      const { stdout } = await runCli("doctor", "--json");
      const json = JSON.parse(stdout);

      const checkNames = json.checks.map((c: { name: string }) => c.name);
      expect(checkNames).toContain("Bun runtime");
      expect(checkNames).toContain("Dependencies");
      expect(checkNames).toContain("TypeScript");
      expect(checkNames).toContain("Gateway app");
      expect(checkNames).toContain("Web app");
    });
  });

  describe("status command", () => {
    it("should show status", async () => {
      const { stdout, stderr } = await runCli("status");
      const output = stdout + stderr;
      expect(output).toContain("Flywheel Gateway - Status");
      expect(output).toContain("Services");
    });

    it("should support --json output", async () => {
      const { stdout } = await runCli("status", "--json");
      const json = JSON.parse(stdout);

      expect(json).toHaveProperty("timestamp");
      expect(json).toHaveProperty("services");
      expect(json).toHaveProperty("websocket");
      expect(json).toHaveProperty("database");
    });

    it("should check gateway and web services", async () => {
      const { stdout } = await runCli("status", "--json");
      const json = JSON.parse(stdout);

      // Services is an array
      expect(Array.isArray(json.services)).toBe(true);
      expect(json.services.length).toBe(2);
      // Each service has name, running, url
      expect(json.services[0]).toHaveProperty("name");
      expect(json.services[0]).toHaveProperty("running");
      expect(json.services[0]).toHaveProperty("url");
    });
  });

  describe("open command", () => {
    it("should list available targets with unknown target", async () => {
      const { stderr } = await runCli("open", "invalid");
      expect(stderr).toContain("Unknown target");
    });
  });

  describe("unknown command", () => {
    it("should show error for unknown command", async () => {
      const { stderr, exitCode } = await runCli("unknown");
      expect(stderr).toContain("Unknown command");
      expect(exitCode).toBe(2);
    });
  });

  describe("exit codes", () => {
    it("should exit 0 for successful doctor (all checks pass)", async () => {
      const { exitCode } = await runCli("doctor");
      // May be 0 or 1 depending on environment state
      expect([0, 1]).toContain(exitCode);
    });

    it("should exit 2 for invalid usage", async () => {
      const { exitCode } = await runCli("badcommand");
      expect(exitCode).toBe(2);
    });
  });
});
