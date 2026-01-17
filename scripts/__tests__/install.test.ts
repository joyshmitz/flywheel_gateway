/**
 * Tests for install.sh installer script
 *
 * Tests argument parsing, help output, and basic validation.
 * Does NOT actually install anything - tests are isolated.
 */

import { describe, expect, it } from "bun:test";

/**
 * Run the installer script with given arguments
 */
async function runInstaller(
  ...args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bash", "scripts/install.sh", ...args], {
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      // Prevent actual installation by simulating non-interactive
      FLYWHEEL_INSTALLER_REFRESHED: "1",
    },
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}

describe("install.sh", () => {
  describe("help", () => {
    it("should show help with --help flag", async () => {
      const { stdout } = await runInstaller("--help");
      expect(stdout).toContain("Flywheel Gateway Installer");
      expect(stdout).toContain("Usage:");
      expect(stdout).toContain("--easy-mode");
      expect(stdout).toContain("--verify");
      expect(stdout).toContain("--system");
    });

    it("should show help with -h flag", async () => {
      const { stdout } = await runInstaller("-h");
      expect(stdout).toContain("Flywheel Gateway Installer");
    });
  });

  describe("argument parsing", () => {
    it("should reject unknown flags", async () => {
      const { stderr, exitCode } = await runInstaller("--unknown-flag");
      expect(stderr).toContain("Unknown option");
      expect(exitCode).not.toBe(0);
    });
  });

  describe("--dev mode", () => {
    it("should show dev mode message when in wrong directory", async () => {
      // Create temp script copy and run from /tmp
      const installerPath = `${process.cwd()}/scripts/install.sh`;
      const proc = Bun.spawn(["bash", installerPath, "--dev"], {
        stdout: "pipe",
        stderr: "pipe",
        cwd: "/tmp",
        env: {
          ...process.env,
          FLYWHEEL_INSTALLER_REFRESHED: "1",
        },
      });
      const stderr = await new Response(proc.stderr).text();
      await proc.exited;

      expect(stderr).toContain("Not in flywheel_gateway");
    });
  });

  describe("script structure", () => {
    it("should have executable permissions logic", async () => {
      const file = Bun.file("scripts/install.sh");
      const content = await file.text();

      // Verify key functions exist
      expect(content).toContain("detect_platform()");
      expect(content).toContain("verify_checksum()");
      expect(content).toContain("install_binary()");
      expect(content).toContain("self_refresh()");
    });

    it("should support all documented flags", async () => {
      const file = Bun.file("scripts/install.sh");
      const content = await file.text();

      expect(content).toContain("--easy-mode");
      expect(content).toContain("--verify");
      expect(content).toContain("--system");
      expect(content).toContain("--no-path-modify");
      expect(content).toContain("--version");
      expect(content).toContain("--dev");
    });

    it("should have SHA256 verification", async () => {
      const file = Bun.file("scripts/install.sh");
      const content = await file.text();

      expect(content).toContain("sha256sum");
      expect(content).toContain("shasum -a 256");
      expect(content).toContain("Checksum verification failed");
    });
  });
});
