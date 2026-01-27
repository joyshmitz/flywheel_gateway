/**
 * E2E Logging Framework - Type Definitions
 * Part of bd-1vr1.5: Playwright logging + diagnostics framework
 */

export interface ConsoleEntry {
  timestamp: number;
  type: "log" | "error" | "warn" | "info" | "debug";
  text: string;
  location?: { url: string; lineNumber: number; columnNumber: number };
}

export interface NetworkEntry {
  timestamp: number;
  method: string;
  url: string;
  status?: number;
  statusText?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  timing?: {
    startTime: number;
    responseEnd?: number;
    duration?: number;
  };
  size?: {
    requestBodySize?: number;
    responseBodySize?: number;
  };
  resourceType?: string;
  failed?: boolean;
  failureReason?: string;
}

export interface WebSocketEntry {
  timestamp: number;
  url: string;
  type: "open" | "close" | "message" | "error";
  direction?: "send" | "receive";
  payload?: string;
  opcode?: number;
}

export interface PageErrorEntry {
  timestamp: number;
  message: string;
  stack?: string;
  name?: string;
}

export interface TimingMetrics {
  testStartTime: number;
  testEndTime?: number;
  pageLoadTime?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  timeToInteractive?: number;
}

export interface TestLogBundle {
  testId: string;
  testTitle: string;
  testFile: string;
  suiteName?: string;
  status: "passed" | "failed" | "skipped" | "timedOut";
  duration: number;
  startTime: number;
  endTime: number;
  retryCount: number;
  browser: string;
  viewport?: { width: number; height: number };
  baseURL?: string;

  console: ConsoleEntry[];
  network: NetworkEntry[];
  webSocket: WebSocketEntry[];
  pageErrors: PageErrorEntry[];
  timing: TimingMetrics;

  artifacts?: {
    trace?: string;
    video?: string;
    screenshots?: string[];
  };

  annotations?: Array<{ type: string; description?: string }>;
  steps?: TestStep[];
  error?: TestError;
}

export interface TestStep {
  title: string;
  startTime: number;
  duration: number;
  status: "passed" | "failed";
  error?: string;
}

export interface TestError {
  message: string;
  stack?: string;
  snippet?: string;
  location?: { file: string; line: number; column: number };
}

export interface RunSummary {
  runId: string;
  startTime: number;
  endTime: number;
  duration: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
  flaky: number;
  projects: string[];
  workers: number;
  tests: TestLogBundle[];
}
