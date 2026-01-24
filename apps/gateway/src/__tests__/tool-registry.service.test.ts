/**
 * Tool Registry Service Tests
 */

import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";
import { createHash } from "node:crypto";
import { isGatewayError } from "@flywheel/shared/errors";
import { restoreCorrelation } from "./test-utils/db-mock-restore";

const realFs = require("node:fs");
const realFsPromises = require("node:fs/promises");
const realYaml = require("yaml");

type LogEvent = { level: "info" | "warn" | "debug" | "error"; args: unknown[] };

let parseMode: "normal" | "throw" = "normal";
let defaultContent = "";
let manifestContents = new Map<string, string>();
let existsOverrides = new Map<string, boolean>();
let defaultExists = true;
let readFileCalls: Array<{ path: string; encoding?: string }> = [];
let existsCalls: string[] = [];
let logEvents: LogEvent[] = [];

const mockLogger = {
  info: (...args: unknown[]) => logEvents.push({ level: "info", args }),
  warn: (...args: unknown[]) => logEvents.push({ level: "warn", args }),
  debug: (...args: unknown[]) => logEvents.push({ level: "debug", args }),
  error: (...args: unknown[]) => logEvents.push({ level: "error", args }),
  child: () => mockLogger,
};

mock.module("node:fs", () => ({
  ...realFs,
  existsSync: (path: string) => {
    existsCalls.push(path);
    if (existsOverrides.has(path)) {
      return existsOverrides.get(path) ?? false;
    }
    return defaultExists;
  },
}));

mock.module("node:fs/promises", () => ({
  ...realFsPromises,
  readFile: async (path: string, encoding?: string) => {
    const call: { path: string; encoding?: string } = { path };
    if (typeof encoding === "string") {
      call.encoding = encoding;
    }
    readFileCalls.push(call);
    if (manifestContents.has(path)) {
      return manifestContents.get(path) as string;
    }
    if (defaultContent) {
      return defaultContent;
    }
    throw new Error(`ENOENT: ${path}`);
  },
}));

mock.module("yaml", () => ({
  parse: (content: string) => {
    if (parseMode === "throw") {
      throw new Error("bad yaml");
    }
    return realYaml.parse(content);
  },
}));

mock.module("../middleware/correlation", () => ({
  getLogger: () => mockLogger,
  getCorrelationId: () => "test-corr",
}));

// Import after mocks are defined
import {
  clearToolRegistryCache,
  getToolRegistryMetadata,
  loadToolRegistry,
} from "../services/tool-registry.service";

const validManifest = `schemaVersion: "1.0.0"
source: "acfs"
generatedAt: "2026-01-22T00:00:00Z"
tools:
  - id: "tools.dcg"
    name: "dcg"
    category: "tool"
`;

const invalidSchemaManifest = `schemaVersion: "2.1.0"
tools:
  - id: 123
    name: "dcg"
    category: "tool"
`;

const originalEnv = { ...process.env };

function resetState() {
  parseMode = "normal";
  defaultContent = "";
  manifestContents = new Map();
  existsOverrides = new Map();
  defaultExists = true;
  readFileCalls = [];
  existsCalls = [];
  logEvents = [];
  clearToolRegistryCache();
}

beforeEach(() => {
  resetState();
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(originalEnv)) {
    process.env[key] = value;
  }
  clearToolRegistryCache();
});

afterAll(() => {
  mock.restore();
  mock.module("node:fs", () => realFs);
  mock.module("node:fs/promises", () => realFsPromises);
  mock.module("yaml", () => realYaml);
  restoreCorrelation();
});

describe("ToolRegistry cache behavior", () => {
  it("caches registry within TTL", async () => {
    const manifestPath = "/tmp/tool-registry.yaml";
    process.env["ACFS_MANIFEST_PATH"] = manifestPath;
    process.env["ACFS_MANIFEST_TTL_MS"] = "60000";
    defaultExists = false;
    existsOverrides.set(manifestPath, true);
    manifestContents.set(manifestPath, validManifest);

    const first = await loadToolRegistry();
    const second = await loadToolRegistry();

    expect(readFileCalls.length).toBe(1);
    expect(first).toBe(second);

    const meta = getToolRegistryMetadata();
    expect(meta?.manifestPath).toBe(manifestPath);
    expect(meta?.schemaVersion).toBe("1.0.0");
    expect(meta?.manifestHash).toBe(
      createHash("sha256").update(validManifest).digest("hex"),
    );
  });

  it("re-reads registry when TTL is zero", async () => {
    const manifestPath = "/tmp/tool-registry.yaml";
    process.env["ACFS_MANIFEST_PATH"] = manifestPath;
    process.env["ACFS_MANIFEST_TTL_MS"] = "0";
    defaultExists = false;
    existsOverrides.set(manifestPath, true);
    manifestContents.set(manifestPath, validManifest);

    await loadToolRegistry();
    await loadToolRegistry();

    expect(readFileCalls.length).toBe(2);
  });
});

describe("Manifest path resolution", () => {
  it("uses ACFS_MANIFEST_PATH override when set", async () => {
    const manifestPath = "/custom/override.yaml";
    process.env["ACFS_MANIFEST_PATH"] = manifestPath;
    defaultExists = false;
    existsOverrides.set(manifestPath, true);
    manifestContents.set(manifestPath, validManifest);

    await loadToolRegistry();

    expect(existsCalls[0]).toBe(manifestPath);
    const meta = getToolRegistryMetadata();
    expect(meta?.manifestPath).toBe(manifestPath);
  });

  it("falls back to default manifest path when overrides are unset", async () => {
    delete process.env["ACFS_MANIFEST_PATH"];
    delete process.env["TOOL_REGISTRY_PATH"];
    defaultExists = true;
    defaultContent = validManifest;

    await loadToolRegistry();

    expect(existsCalls[0]).toContain("acfs.manifest.yaml");
    const meta = getToolRegistryMetadata();
    expect(meta?.manifestPath).toContain("acfs.manifest.yaml");
  });
});

describe("Error mapping + logging", () => {
  it("logs manifest_parse_error with path/hash and throws GatewayError", async () => {
    const manifestPath = "/tmp/invalid.yaml";
    process.env["ACFS_MANIFEST_PATH"] = manifestPath;
    defaultExists = false;
    existsOverrides.set(manifestPath, true);
    manifestContents.set(manifestPath, "not: [valid");
    parseMode = "throw";

    let caught: unknown;
    try {
      await loadToolRegistry();
    } catch (error) {
      caught = error;
    }

    expect(isGatewayError(caught)).toBe(true);
    const details = (
      caught as { details?: Record<string, unknown>; code?: string }
    ).details;
    expect(details?.["errorCategory"]).toBe("manifest_parse_error");

    const warnEvent = logEvents.find((event) => event.level === "warn");
    expect(warnEvent).toBeDefined();
    const warnPayload = warnEvent?.args[0] as Record<string, unknown>;
    expect(warnPayload["manifestPath"]).toBe(manifestPath);
    expect(warnPayload["manifestHash"]).toBe(
      createHash("sha256").update("not: [valid").digest("hex"),
    );
    expect(warnPayload["errorCategory"]).toBe("manifest_parse_error");
    expect(warnPayload["schemaVersion"]).toBeNull();
  });

  it("logs manifest_validation_error with schema version", async () => {
    const manifestPath = "/tmp/invalid-schema.yaml";
    process.env["ACFS_MANIFEST_PATH"] = manifestPath;
    defaultExists = false;
    existsOverrides.set(manifestPath, true);
    manifestContents.set(manifestPath, invalidSchemaManifest);

    let caught: unknown;
    try {
      await loadToolRegistry();
    } catch (error) {
      caught = error;
    }

    expect(isGatewayError(caught)).toBe(true);
    const details = (caught as { details?: Record<string, unknown> }).details;
    expect(details?.["errorCategory"]).toBe("manifest_validation_error");
    expect(details?.["schemaVersion"]).toBe("2.1.0");

    const warnEvent = logEvents.find((event) => event.level === "warn");
    expect(warnEvent).toBeDefined();
    const warnPayload = warnEvent?.args[0] as Record<string, unknown>;
    expect(warnPayload["manifestPath"]).toBe(manifestPath);
    expect(warnPayload["manifestHash"]).toBe(
      createHash("sha256").update(invalidSchemaManifest).digest("hex"),
    );
    expect(warnPayload["errorCategory"]).toBe("manifest_validation_error");
    expect(warnPayload["schemaVersion"]).toBe("2.1.0");
  });
});
