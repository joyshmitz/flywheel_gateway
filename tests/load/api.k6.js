/**
 * k6 load test for Flywheel Gateway API endpoints.
 *
 * Run with: k6 run tests/load/api.k6.js
 * Or with environment: k6 run -e TARGET_URL=http://localhost:3000 tests/load/api.k6.js
 */

import { check, group, sleep } from "k6";
import http from "k6/http";
import { Rate, Trend } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
const agentsLatency = new Trend("agents_latency");
const healthLatency = new Trend("health_latency");
const sessionsLatency = new Trend("sessions_latency");

// Test configuration
export const options = {
  scenarios: {
    // Smoke test - quick sanity check
    smoke: {
      executor: "constant-vus",
      vus: 1,
      duration: "30s",
      tags: { scenario: "smoke" },
    },
    // Load test - normal expected load
    load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 50 }, // Ramp up to 50 users
        { duration: "3m", target: 50 }, // Stay at 50 users
        { duration: "1m", target: 100 }, // Ramp up to 100
        { duration: "3m", target: 100 }, // Stay at 100
        { duration: "1m", target: 0 }, // Ramp down
      ],
      tags: { scenario: "load" },
      startTime: "35s", // Start after smoke
    },
    // Stress test - beyond normal capacity
    stress: {
      executor: "ramping-arrival-rate",
      startRate: 50,
      timeUnit: "1s",
      preAllocatedVUs: 200,
      maxVUs: 500,
      stages: [
        { duration: "1m", target: 100 }, // Ramp to 100 rps
        { duration: "2m", target: 200 }, // Ramp to 200 rps
        { duration: "2m", target: 500 }, // Spike to 500 rps
        { duration: "2m", target: 100 }, // Scale back
        { duration: "1m", target: 0 }, // Ramp down
      ],
      tags: { scenario: "stress" },
      startTime: "10m", // Start after load test
    },
  },
  thresholds: {
    // Global thresholds
    http_req_duration: ["p(95)<200", "p(99)<500"], // 95th percentile < 200ms
    http_req_failed: ["rate<0.01"], // Error rate < 1%
    errors: ["rate<0.01"],

    // Per-endpoint thresholds
    health_latency: ["p(95)<50"], // Health check should be fast
    agents_latency: ["p(95)<150"],
    sessions_latency: ["p(95)<200"],
  },
};

const BASE_URL = __ENV.TARGET_URL || "http://localhost:3000";

export default function () {
  group("Health Check", () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/health`);
    healthLatency.add(Date.now() - start);

    const passed = check(res, {
      "health status 200": (r) => r.status === 200,
      "health response time < 100ms": (r) => r.timings.duration < 100,
    });

    if (!passed) {
      errorRate.add(1);
    }
  });

  group("Agents API", () => {
    // List agents
    const start = Date.now();
    const listRes = http.get(`${BASE_URL}/api/agents`);
    agentsLatency.add(Date.now() - start);

    const listPassed = check(listRes, {
      "agents list status 200": (r) => r.status === 200,
      "agents list has data": (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.agents !== undefined;
        } catch {
          return false;
        }
      },
    });

    if (!listPassed) {
      errorRate.add(1);
    }
  });

  group("Sessions API", () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/sessions`);
    sessionsLatency.add(Date.now() - start);

    const passed = check(res, {
      "sessions status 200": (r) => r.status === 200,
    });

    if (!passed) {
      errorRate.add(1);
    }
  });

  group("Metrics API", () => {
    const res = http.get(`${BASE_URL}/api/metrics`);

    check(res, {
      "metrics status 200": (r) => r.status === 200,
    });
  });

  // Small delay between iterations
  sleep(0.1);
}

// Lifecycle hooks
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);

  // Verify target is reachable
  const res = http.get(`${BASE_URL}/health`);
  if (res.status !== 200) {
    throw new Error(`Target ${BASE_URL} is not healthy: ${res.status}`);
  }

  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration.toFixed(2)}s`);
}
