# Flywheel Gateway Architecture

This document provides an overview of the Flywheel Gateway system architecture.

## High-Level Architecture

```
                                    ┌─────────────────┐
                                    │   Web Browser   │
                                    │   (Dashboard)   │
                                    └────────┬────────┘
                                             │
                                    HTTP/WS  │
                                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        FLYWHEEL GATEWAY                             │
│  ┌──────────────────┐    ┌───────────────┐    ┌─────────────────┐  │
│  │   Hono Router    │    │  WebSocket    │    │   Middleware    │  │
│  │   (REST API)     │    │     Hub       │    │  (Auth, Log,    │  │
│  │                  │    │               │    │   Rate Limit)   │  │
│  └────────┬─────────┘    └───────┬───────┘    └────────┬────────┘  │
│           │                      │                      │           │
│           ▼                      ▼                      ▼           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    SERVICE LAYER (60+ services)              │  │
│  │  ┌────────────┐ ┌──────────────┐ ┌───────────────────────┐   │  │
│  │  │   Agent    │ │    Cost      │ │      Reservation      │   │  │
│  │  │  Service   │ │  Analytics   │ │       Service         │   │  │
│  │  └────────────┘ └──────────────┘ └───────────────────────┘   │  │
│  │  ┌────────────┐ ┌──────────────┐ ┌───────────────────────┐   │  │
│  │  │   CAAM     │ │     DCG      │ │      Handoff          │   │  │
│  │  │  Service   │ │   Service    │ │      Service          │   │  │
│  │  └────────────┘ └──────────────┘ └───────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    DATA LAYER                                │  │
│  │  ┌────────────────┐    ┌──────────────────────────────────┐  │  │
│  │  │  Drizzle ORM   │    │       SQLite (bun:sqlite)        │  │  │
│  │  │  (40+ tables)  │───▶│     data/gateway.db              │  │  │
│  │  └────────────────┘    └──────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │       AGENT DRIVERS           │
              │  ┌─────┐ ┌─────┐ ┌───────┐   │
              │  │ SDK │ │ ACP │ │ Tmux  │   │
              │  └──┬──┘ └──┬──┘ └───┬───┘   │
              └─────┼───────┼───────┼────────┘
                    │       │       │
                    ▼       ▼       ▼
              ┌─────────────────────────────┐
              │    AI PROVIDERS             │
              │  Claude │ Codex │ Gemini    │
              └─────────────────────────────┘
```

## Component Overview

### Apps

| App | Description | Tech Stack |
|-----|-------------|------------|
| `gateway` | Backend API server | Hono 4.11+, Drizzle ORM, bun:sqlite |
| `web` | Frontend dashboard | React 19, Vite 7, TanStack, Tailwind |

### Packages

| Package | Description |
|---------|-------------|
| `shared` | Common types, Zod schemas, error utilities |
| `agent-drivers` | Agent execution abstractions (SDK, ACP, Tmux) |
| `flywheel-clients` | Client SDKs (AgentMail, CASS, BV) |
| `test-utils` | Testing utilities and fixtures |

## Backend Architecture (apps/gateway)

### Route Layer

The REST API is organized into 30+ route modules:

```
routes/
├── accounts.ts       # BYOA account management
├── agents.ts         # Agent lifecycle
├── alerts.ts         # Alert management
├── analytics.ts      # Agent analytics
├── audit.ts          # Audit logging
├── beads.ts          # Beads integration
├── checkpoints.ts    # Agent checkpoints
├── conflicts.ts      # File conflict resolution
├── cost-analytics.ts # Cost tracking & budgets
├── dcg.ts            # Destructive Command Guard
├── handoffs.ts       # Agent handoffs
├── health.ts         # Health checks
├── history.ts        # Command history
├── jobs.ts           # Background jobs
├── mail.ts           # AgentMail
├── metrics.ts        # Prometheus metrics
├── notifications.ts  # Notification system
├── openapi.ts        # OpenAPI docs
├── pipelines.ts      # Pipeline orchestration
├── reservations.ts   # File reservations
├── ru.ts             # Resource utilization
├── scanner.ts        # Code scanning
├── supervisor.ts     # Supervisor coordination
└── utilities.ts      # Utility endpoints
```

### Service Layer

Business logic is encapsulated in 60+ services:

**Core Agent Services:**
- `agent.ts` - Agent lifecycle management
- `agent-state-machine.ts` - State transitions
- `agent-events.ts` - Event stream handling
- `auto-checkpoint.service.ts` - Automatic checkpointing
- `checkpoint.ts` - Checkpoint creation/restore

**Cost Analytics Services:**
- `cost-tracker.service.ts` - Token usage tracking
- `cost-forecast.service.ts` - Cost prediction
- `cost-optimization.service.ts` - Recommendations
- `budget.service.ts` - Budget enforcement

**Safety Services:**
- `dcg.service.ts` - Destructive Command Guard
- `safety.service.ts` - Safety rule enforcement
- `safety-rules.engine.ts` - Rule engine

**Coordination Services:**
- `reservation.service.ts` - File lock management
- `conflict.service.ts` - Conflict detection
- `handoff.service.ts` - Agent handoffs

### Database Schema

The gateway uses Drizzle ORM with SQLite. Key tables include:

```sql
-- Core tables
agents          -- Agent instances
accounts        -- User accounts with BYOA
checkpoints     -- Agent state snapshots
history         -- Command execution history

-- Safety tables
dcgBlocks       -- Blocked command patterns
dcgAllowlist    -- Allowed command overrides
dcgPendingExceptions -- Exception requests

-- Cost tables
costRecords     -- Token usage records
budgets         -- Budget configurations
costForecasts   -- Forecast data
optimizationRecommendations

-- Coordination tables
reservations    -- File locks
conflicts       -- Detected conflicts
handoffs        -- Agent handoff records

-- Observability tables
alerts          -- System alerts
auditLogs       -- Audit trail
metrics         -- Performance metrics
```

### WebSocket Architecture

Real-time communication uses a hub-and-spoke pattern:

```
┌──────────────────────────────────────────────────────────────┐
│                     WebSocket Hub                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 Ring Buffers                         │    │
│  │  agent:output:abc123  [msg1, msg2, msg3, ...]       │    │
│  │  agent:state:abc123   [state1, state2, ...]         │    │
│  │  agent:tools:abc123   [tool1, tool2, ...]           │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Subscriber Registry                     │    │
│  │  Connection A → [agent:output:*, agent:state:*]     │    │
│  │  Connection B → [agent:output:abc123]               │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Cursor-based replay for reconnection
- Channel pattern matching (wildcards)
- TTL-based message expiry
- Backpressure handling
- Acknowledgment tracking

### Middleware Pipeline

Request processing follows this order:

```
Request → Correlation ID → Logging → Rate Limit → Auth → Route Handler
                                                              ↓
Response ← Security Headers ← Logging ← Response Transformation
```

## Frontend Architecture (apps/web)

### Component Structure

```
src/
├── components/
│   ├── analytics/    # Cost dashboard components
│   ├── layout/       # Shell, Sidebar, Topbar
│   ├── mobile/       # Mobile-specific components
│   ├── notifications/# Notification UI
│   └── ui/           # Reusable primitives
├── pages/            # Route pages
├── hooks/            # Custom React hooks
├── stores/           # Zustand state stores
├── lib/
│   └── websocket/    # WebSocket utilities
└── styles/           # Global styles
```

### State Management

- **Server State**: TanStack Query for API data
- **Client State**: Zustand stores for UI state
- **URL State**: TanStack Router for routing

### Key Pages

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/` | System overview |
| Agents | `/agents` | Agent management |
| Beads | `/beads` | Beads/issues tracking |
| Accounts | `/accounts` | BYOA management |
| Costs | `/cost-analytics` | Cost dashboard |
| DCG | `/dcg` | Safety controls |
| Fleet | `/fleet` | Fleet management |
| Velocity | `/velocity` | Development metrics |

## Agent Driver Architecture

The driver abstraction enables multiple agent execution backends:

```typescript
interface AgentDriver {
  // Lifecycle
  spawn(config: AgentConfig): Promise<SpawnResult>;
  getState(agentId: string): Promise<AgentState>;
  terminate(agentId: string): Promise<void>;

  // Communication
  send(agentId: string, message: string): Promise<SendResult>;
  interrupt(agentId: string): Promise<void>;

  // Streaming
  getOutput(agentId: string): Promise<OutputLine[]>;
  subscribe(agentId: string): AsyncIterable<AgentEvent>;

  // Checkpointing (optional)
  createCheckpoint?(agentId: string): Promise<CheckpointMetadata>;
  restoreCheckpoint?(agentId: string, checkpointId: string): Promise<AgentState>;
}
```

### Driver Types

| Driver | Use Case | Capabilities |
|--------|----------|--------------|
| SDK | Production | Full streaming, checkpointing |
| ACP | IDE Integration | Agent Client Protocol |
| Tmux | Debugging | Visual terminal access |

## Stack Contract (Public Integration Boundaries)

The Flywheel stack is a collection of public, composable tools with clear
ownership boundaries. The Gateway integrates them without re-implementing or
duplicating their core responsibilities.

| Component | Role (Source of Truth) | Gateway Integration |
|-----------|-------------------------|---------------------|
| **ACFS** (agentic_coding_flywheel_setup) | Tool registry + manifest (metadata, checksums, install/verify commands) | `/setup` endpoints and detection read manifest-derived metadata only |
| **NTM** | Orchestration + telemetry plane | Driver backend + ingest service → agent state + WS events |
| **br** (beads_rust) | Task graph + status | Gateway exposes CRUD + ready/blocked views via API + UI |
| **Agent Mail** | Multi-agent coordination + file reservations | Mail endpoints + UI + MCP callers |
| **BV** | Graph-aware triage | Gateway surfaces BV robot outputs with caching + logging |
| **CASS / CM** | Searchable history + memory context | Gateway proxies health/search/context endpoints |
| **DCG / SLB / UBS** | Safety enforcement + approvals + scanning | Safety endpoints + audit logging + alerts |
| **RU** | Fleet maintenance orchestration | Fleet status + agent-sweep integrations |

### Contract Rules

1. **Single Source of Truth**: Gateway defers to the owning tool (e.g., ACFS
   manifest, br issues, NTM status) and only enriches/aggregates.
2. **Public-Safe Metadata Only**: No private infrastructure or business content
   is embedded in this repo or exposed via public endpoints.
3. **Auditable Provenance**: Responses include enough metadata (version/hash,
   tool id, timestamps) to verify which upstream source produced a result.
4. **No Shadow Implementations**: If a tool already owns a domain, Gateway
   integrates rather than re-creating the logic.

### Typical Integration Flow

```
ACFS manifest → Gateway /setup (tools + readiness)
NTM robot outputs → Gateway ingest → WebSocket hub
br tasks → Gateway /beads → Web UI
Agent Mail → Gateway /mail + reservations → Multi-agent coordination
```

## Data Flow

### Agent Lifecycle

```
1. POST /agents/spawn
   └─▶ Agent Service
       └─▶ Driver Registry (select driver)
           └─▶ SDK Driver (spawn agent)
               └─▶ Claude API

2. Agent Events
   └─▶ Driver.subscribe()
       └─▶ Agent Events Service
           └─▶ WebSocket Hub.publish()
               └─▶ Subscribers
```

### Cost Tracking

```
API Request
   │
   ├─▶ Token Usage
   │      └─▶ Cost Tracker Service
   │             └─▶ Rate Card Lookup
   │             └─▶ Cost Calculation
   │             └─▶ Insert costRecords
   │
   └─▶ Budget Check
          └─▶ Budget Service
                 └─▶ Threshold Evaluation
                 └─▶ Alert if exceeded
```

## Security Architecture

### Authentication Flow

```
Request + API Key
    │
    ▼
API Key Validation
    │
    ▼
Account Lookup (SHA-256 hash)
    │
    ▼
Permission Check
    │
    ▼
Authorized Request
```

### DCG (Destructive Command Guard)

```
Command Execution Request
    │
    ▼
Pattern Matching (regex blocks)
    │
    ├─▶ MATCH → Check Allowlist
    │             │
    │             ├─▶ Allowed → Execute
    │             └─▶ Blocked → Return Error + Short Code
    │
    └─▶ NO MATCH → Execute
```

## Deployment Architecture

### Development

```
localhost:3000 (Gateway)
localhost:5173 (Web UI)
data/gateway.db (SQLite)
```

### Production

```
┌─────────────────┐
│   Load Balancer │
│   (nginx/ALB)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Gateway Cluster │
│  (N instances)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    SQLite       │
│   (Litestream   │
│    replication) │
└─────────────────┘
```

## Design Decisions

### Why SQLite?

- **Single-file deployment** - No database server
- **Bun's native SQLite** - 10x faster than external databases
- **Litestream** - Continuous replication to S3
- **Sufficient for use case** - Read-heavy, single-node

### Why Hono?

- **Fast** - Minimal overhead, optimized for Bun
- **Type-safe** - Full TypeScript support
- **Middleware ecosystem** - Standard middleware patterns
- **WebSocket support** - Native Bun WebSocket

### Why Drizzle ORM?

- **Type-safe queries** - Compile-time validation
- **Migration generation** - Schema-first development
- **Lightweight** - Minimal runtime overhead
- **SQLite support** - First-class support

## Performance Considerations

- **WebSocket Backpressure**: Ring buffers prevent memory exhaustion
- **Output Virtualization**: Large outputs rendered efficiently
- **Database Indexes**: Optimized queries for common patterns
- **Caching**: Rate cards and frequently accessed data cached

## References

- [PLAN.md](PLAN.md) - Detailed project plan
- [AGENTS.md](../AGENTS.md) - Agent development guide
- [Runbooks](runbooks/) - Operational procedures
