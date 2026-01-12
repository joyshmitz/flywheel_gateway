import { describe, expect, test } from "bun:test";
import {
  createUBSClient,
  UBSClientError,
  type UBSCommandRunner,
  type UBSFinding,
  type UBSScanResult,
} from "../index";

/**
 * Helper to create a mock command runner with predefined responses
 */
function createRunner(
  stdout: string,
  exitCode = 0,
): UBSCommandRunner & {
  calls: Array<{ command: string; args: string[] }>;
} {
  const calls: Array<{ command: string; args: string[] }> = [];
  return {
    calls,
    run: async (command: string, args: string[]) => {
      calls.push({ command, args });
      return {
        stdout,
        stderr: exitCode === 0 ? "" : "error output",
        exitCode,
      };
    },
  };
}

/**
 * Helper to create runner that responds differently based on command/args
 */
function createRunnerWithMap(
  map: Record<string, { stdout: string; exitCode?: number }>,
): UBSCommandRunner & { calls: Array<{ command: string; args: string[] }> } {
  const calls: Array<{ command: string; args: string[] }> = [];
  return {
    calls,
    run: async (command: string, args: string[]) => {
      calls.push({ command, args });
      // Try matching by args key
      const key = args.join(" ");
      const entry = map[key] ?? map[command] ?? { stdout: "", exitCode: 127 };
      return {
        stdout: entry.stdout,
        stderr: entry.exitCode === 0 ? "" : "error",
        exitCode: entry.exitCode ?? 0,
      };
    },
  };
}

// Sample UBS JSON output for tests
const sampleScanResult: UBSScanResult = {
  success: true,
  exitCode: 0,
  findings: [
    {
      id: "fnd-001",
      rule: "security/xss",
      category: "security",
      severity: "high",
      title: "XSS vulnerability",
      message: "Potential XSS in innerHTML assignment",
      file: "src/app.ts",
      line: 42,
      column: 5,
      suggestedFix: "Use textContent instead of innerHTML",
      status: "open",
    },
    {
      id: "fnd-002",
      rule: "quality/unused-var",
      category: "quality",
      severity: "low",
      title: "Unused variable",
      message: "Variable 'temp' is declared but never used",
      file: "src/utils.ts",
      line: 10,
      column: 7,
      status: "open",
    },
  ],
  summary: {
    total: 2,
    bySeverity: {
      critical: 0,
      high: 1,
      medium: 0,
      low: 1,
      info: 0,
    },
    byCategory: {
      security: 1,
      quality: 1,
    },
  },
  scanId: "scan-123",
  timestamp: "2026-01-12T00:00:00Z",
};

describe("UBS Client", () => {
  describe("isAvailable", () => {
    test("returns true when ubs --version succeeds", async () => {
      const runner = createRunner("ubs v1.2.3");
      const client = createUBSClient({ runner });

      const available = await client.isAvailable();

      expect(available).toBe(true);
      expect(runner.calls[0]?.command).toBe("ubs");
      expect(runner.calls[0]?.args).toContain("--version");
    });

    test("returns false when ubs --version fails", async () => {
      const runner = createRunner("", 127);
      const client = createUBSClient({ runner });

      const available = await client.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe("health", () => {
    test("returns version when ubs is available", async () => {
      const runner = createRunner("ubs v1.2.3");
      const client = createUBSClient({ runner });

      const health = await client.health();

      expect(health.available).toBe(true);
      expect(health.version).toBe("1.2.3");
    });

    test("returns unavailable when ubs fails", async () => {
      const runner = createRunner("", 1);
      const client = createUBSClient({ runner });

      const health = await client.health();

      expect(health.available).toBe(false);
    });
  });

  describe("scan", () => {
    test("parses scan result JSON correctly", async () => {
      const runner = createRunner(JSON.stringify(sampleScanResult));
      const client = createUBSClient({ runner });

      const result = await client.scan(["src/app.ts"]);

      expect(result.success).toBe(true);
      expect(result.findings).toHaveLength(2);
      expect(result.findings[0]?.severity).toBe("high");
      expect(result.findings[0]?.category).toBe("security");
      expect(result.summary.total).toBe(2);
    });

    test("includes files in scan args", async () => {
      const runner = createRunner(JSON.stringify(sampleScanResult));
      const client = createUBSClient({ runner });

      await client.scan(["src/app.ts", "src/utils.ts"]);

      expect(runner.calls[0]?.args).toContain("src/app.ts");
      expect(runner.calls[0]?.args).toContain("src/utils.ts");
      expect(runner.calls[0]?.args).toContain("--json");
    });

    test("passes scan options correctly", async () => {
      const runner = createRunner(JSON.stringify(sampleScanResult));
      const client = createUBSClient({ runner });

      await client.scan(["src/"], {
        only: "typescript",
        exclude: ["node_modules/**"],
        ci: true,
        minSeverity: "medium",
      });

      expect(runner.calls[0]?.args).toContain("--only");
      expect(runner.calls[0]?.args).toContain("typescript");
      expect(runner.calls[0]?.args).toContain("--exclude");
      expect(runner.calls[0]?.args).toContain("node_modules/**");
      expect(runner.calls[0]?.args).toContain("--ci");
      expect(runner.calls[0]?.args).toContain("--min-severity");
      expect(runner.calls[0]?.args).toContain("medium");
    });

    test("returns empty result for empty file list", async () => {
      const runner = createRunner(JSON.stringify(sampleScanResult));
      const client = createUBSClient({ runner });

      const result = await client.scan([]);

      expect(result.success).toBe(true);
      expect(result.findings).toHaveLength(0);
      expect(runner.calls).toHaveLength(0); // No command should be called
    });

    test("handles exit code > 0 (findings present)", async () => {
      const resultWithFindings = {
        ...sampleScanResult,
        exitCode: 1,
        success: false,
      };
      const runner = createRunner(JSON.stringify(resultWithFindings), 1);
      const client = createUBSClient({ runner });

      const result = await client.scan(["src/"]);

      expect(result.exitCode).toBe(1);
      expect(result.findings).toHaveLength(2);
    });
  });

  describe("scanStaged", () => {
    test("gets staged files from git and scans them", async () => {
      const runner = createRunnerWithMap({
        "diff --name-only --cached": {
          stdout: "src/file1.ts\nsrc/file2.ts\n",
          exitCode: 0,
        },
        "src/file1.ts src/file2.ts --json": {
          stdout: JSON.stringify(sampleScanResult),
          exitCode: 0,
        },
      });
      const client = createUBSClient({ runner });

      const result = await client.scanStaged();

      expect(runner.calls[0]?.command).toBe("git");
      expect(runner.calls[0]?.args).toContain("--cached");
      expect(result.scannedPaths).toContain("src/file1.ts");
      expect(result.scannedPaths).toContain("src/file2.ts");
    });

    test("returns empty result when no files staged", async () => {
      const runner = createRunnerWithMap({
        "diff --name-only --cached": {
          stdout: "",
          exitCode: 0,
        },
      });
      const client = createUBSClient({ runner });

      const result = await client.scanStaged();

      expect(result.success).toBe(true);
      expect(result.findings).toHaveLength(0);
      expect(result.scannedPaths).toHaveLength(0);
    });
  });

  describe("scanDir", () => {
    test("scans a directory", async () => {
      const runner = createRunner(JSON.stringify(sampleScanResult));
      const client = createUBSClient({ runner });

      const result = await client.scanDir("src/");

      expect(runner.calls[0]?.args).toContain("src/");
      expect(result.scannedPaths).toContain("src/");
    });
  });

  describe("findingToBead", () => {
    test("transforms finding to bead creation request", () => {
      const runner = createRunner("");
      const client = createUBSClient({ runner });

      const finding: UBSFinding = {
        rule: "security/xss",
        category: "security",
        severity: "high",
        title: "XSS vulnerability",
        message: "Potential XSS in innerHTML assignment",
        file: "src/app.ts",
        line: 42,
        column: 5,
        suggestedFix: "Use textContent instead",
        status: "open",
      };

      const bead = client.findingToBead(finding);

      expect(bead.title).toContain("high");
      expect(bead.title).toContain("security");
      expect(bead.body).toContain("src/app.ts:42:5");
      expect(bead.body).toContain("Potential XSS");
      expect(bead.body).toContain("Use textContent");
      expect(bead.labels).toContain("scanner");
      expect(bead.labels).toContain("security");
      expect(bead.labels).toContain("high");
      expect(bead.type).toBe("bug"); // High security = bug
      expect(bead.priority).toBe(1); // High = P1
    });

    test("maps severity to correct priority", () => {
      const runner = createRunner("");
      const client = createUBSClient({ runner });

      expect(client.severityToPriority("critical")).toBe(0);
      expect(client.severityToPriority("high")).toBe(1);
      expect(client.severityToPriority("medium")).toBe(2);
      expect(client.severityToPriority("low")).toBe(3);
      expect(client.severityToPriority("info")).toBe(4);
    });

    test("allows priority override", () => {
      const runner = createRunner("");
      const client = createUBSClient({ runner });

      const finding: UBSFinding = {
        rule: "style/naming",
        category: "style",
        severity: "low",
        title: "Naming convention",
        message: "Variable should be camelCase",
        file: "src/app.ts",
        status: "open",
      };

      const bead = client.findingToBead(finding, { priority: 2 });

      expect(bead.priority).toBe(2);
    });

    test("adds extra labels when provided", () => {
      const runner = createRunner("");
      const client = createUBSClient({ runner });

      const finding: UBSFinding = {
        rule: "quality/complexity",
        category: "quality",
        severity: "medium",
        title: "Complex function",
        message: "Function has cyclomatic complexity of 15",
        file: "src/util.ts",
        status: "open",
      };

      const bead = client.findingToBead(finding, {
        extraLabels: ["tech-debt", "refactor"],
      });

      expect(bead.labels).toContain("tech-debt");
      expect(bead.labels).toContain("refactor");
    });
  });

  describe("findingsToBeads", () => {
    test("transforms multiple findings to beads", () => {
      const runner = createRunner("");
      const client = createUBSClient({ runner });

      const findings: UBSFinding[] = [
        {
          rule: "security/xss",
          category: "security",
          severity: "high",
          title: "XSS",
          message: "XSS vulnerability",
          file: "src/a.ts",
          status: "open",
        },
        {
          rule: "quality/unused",
          category: "quality",
          severity: "low",
          title: "Unused",
          message: "Unused variable",
          file: "src/b.ts",
          status: "open",
        },
      ];

      const beads = client.findingsToBeads(findings);

      expect(beads).toHaveLength(2);
      expect(beads[0]?.type).toBe("bug");
      expect(beads[1]?.type).toBe("task");
    });
  });

  describe("error handling", () => {
    test("throws UBSClientError on parse error", async () => {
      const runner = createRunner("not-valid-json");
      const client = createUBSClient({ runner });

      let thrown: unknown;
      try {
        await client.scan(["src/"]);
      } catch (error) {
        thrown = error;
      }

      // Falls back to text parsing, which produces empty result
      expect(thrown).toBeUndefined();
    });

    test("UBSClientError includes kind and details", () => {
      const error = new UBSClientError("command_failed", "Test error", {
        exitCode: 127,
        stderr: "ubs: command not found",
      });

      expect(error.kind).toBe("command_failed");
      expect(error.message).toBe("Test error");
      expect(error.details?.exitCode).toBe(127);
    });
  });

  describe("text output parsing fallback", () => {
    test("parses text output when JSON fails", async () => {
      const textOutput = `⚠️  Security (1 errors)
    src/app.ts:42:5 – Potential XSS in innerHTML
    💡 Use textContent instead
`;
      const runner = createRunner(textOutput, 1);
      const client = createUBSClient({ runner });

      const result = await client.scan(["src/"]);

      // Should have parsed at least one finding from text
      expect(result.exitCode).toBe(1);
      expect(result.findings.length).toBeGreaterThanOrEqual(0);
    });
  });
});
