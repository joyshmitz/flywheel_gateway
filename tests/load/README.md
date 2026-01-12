# Load Tests

Performance and load testing using k6.

## Prerequisites

Install k6: https://k6.io/docs/getting-started/installation/

```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Running Tests

```bash
# API load test
bun test:load

# WebSocket load test
bun test:load:ws

# Or directly with custom target
k6 run -e TARGET_URL=http://localhost:3000 tests/load/api.k6.js
k6 run -e TARGET_HOST=localhost:3000 tests/load/websocket.k6.js
```

## Test Files

- `api.k6.js` - HTTP API endpoint load tests
- `websocket.k6.js` - WebSocket connection load tests

## Test Scenarios

### API Tests (`api.k6.js`)

1. **Smoke** - 1 VU for 30s (sanity check)
2. **Load** - Ramp 0→50→100 VUs over 9 minutes
3. **Stress** - Ramp to 500 req/s to find breaking point

### WebSocket Tests (`websocket.k6.js`)

1. **Connections** - Ramp 0→50→100→200→500 concurrent connections

## Thresholds

Default thresholds:
- HTTP p95 latency < 200ms
- HTTP p99 latency < 500ms
- Error rate < 1%
- WebSocket message latency p95 < 200ms

## Custom Metrics

- `agents_latency` - Agents API response time
- `health_latency` - Health check response time
- `ws_message_latency` - WebSocket message round-trip
- `ws_connection_time` - WebSocket connection establishment

## Viewing Results

```bash
# Output summary to stdout (default)
k6 run tests/load/api.k6.js

# Export to JSON
k6 run --out json=results.json tests/load/api.k6.js

# Real-time web dashboard (k6 Cloud or InfluxDB + Grafana)
```

## CI Integration

Load tests can be added to CI with appropriate thresholds.
Consider running on dedicated infrastructure for accurate results.
