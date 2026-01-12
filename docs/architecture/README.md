# Architecture Overview

Flywheel Gateway is an SDK-first multi-agent orchestration platform built with TypeScript and Bun.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Clients                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Web Dashboard│  │   CLI      │  │   SDK      │  │  IDE Plugin │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
└─────────┼────────────────┼────────────────┼────────────────┼───────────┘
          │                │                │                │
          └────────────────┴────────┬───────┴────────────────┘
                                    │
                        ┌───────────▼───────────┐
                        │    Load Balancer      │
                        │    (nginx/Caddy)      │
                        └───────────┬───────────┘
                                    │
┌───────────────────────────────────┼───────────────────────────────────┐
│                           Gateway Server                               │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                         Hono HTTP Server                          │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │ │
│  │  │   REST     │  │ WebSocket  │  │   Auth     │  │ Rate Limit │ │ │
│  │  │   Routes   │  │   Hub      │  │ Middleware │  │ Middleware │ │ │
│  │  └─────┬──────┘  └─────┬──────┘  └────────────┘  └────────────┘ │ │
│  └────────┼───────────────┼─────────────────────────────────────────┘ │
│           │               │                                            │
│  ┌────────▼───────────────▼─────────────────────────────────────────┐ │
│  │                        Service Layer                              │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │ │
│  │  │  Agent   │  │ Session  │  │ Account  │  │   DCG    │        │ │
│  │  │ Service  │  │ Service  │  │ Service  │  │ Service  │        │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │ │
│  └───────┼─────────────┼─────────────┼─────────────┼────────────────┘ │
│          │             │             │             │                   │
│  ┌───────▼─────────────▼─────────────▼─────────────▼────────────────┐ │
│  │                      Data Access Layer                            │ │
│  │  ┌──────────────────────────────────────────────────────────┐   │ │
│  │  │                    Drizzle ORM                            │   │ │
│  │  └───────────────────────────┬──────────────────────────────┘   │ │
│  └──────────────────────────────┼───────────────────────────────────┘ │
└─────────────────────────────────┼─────────────────────────────────────┘
                                  │
                      ┌───────────▼───────────┐
                      │    SQLite/PostgreSQL   │
                      └───────────────────────┘
```

## Component Overview

### Gateway Server (`apps/gateway`)

The backend server built with Hono and Bun:

- **Routes**: HTTP endpoints for CRUD operations
- **WebSocket Hub**: Real-time bi-directional communication
- **Services**: Business logic layer
- **Middleware**: Auth, rate limiting, DCG

### Web Dashboard (`apps/web`)

React-based admin interface:

- **Pages**: Fleet, Sessions, Accounts, Settings
- **Components**: Reusable UI elements
- **Hooks**: Data fetching with TanStack Query
- **WebSocket**: Real-time updates via Zustand

### Shared Packages (`packages/`)

- **shared**: Common types, utilities, validation schemas
- **flywheel-clients**: SDK clients for CASS and CM
- **test-utils**: Testing helpers and fixtures

## Data Flow

### HTTP Request Flow

```
Client Request
      │
      ▼
┌─────────────────┐
│ Auth Middleware │ ──▶ 401 if invalid
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Rate Limiting   │ ──▶ 429 if exceeded
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Route Handler   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Service Layer   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Database Query  │
└────────┬────────┘
         │
         ▼
    Response
```

### WebSocket Event Flow

```
Client                    Server                     Agent
   │                         │                          │
   │──── connect ───────────▶│                          │
   │◀─── connected ──────────│                          │
   │                         │                          │
   │──── subscribe:session ─▶│                          │
   │◀─── subscribed ─────────│                          │
   │                         │                          │
   │                         │◀─── output ─────────────│
   │◀─── session:output ─────│                          │
   │                         │                          │
   │──── heartbeat ─────────▶│                          │
   │◀─── heartbeat ──────────│                          │
   │                         │                          │
   │──── disconnect ────────▶│                          │
```

## Key Abstractions

### Agent Drivers

Agents communicate via pluggable driver interfaces:

```typescript
interface AgentDriver {
  start(config: AgentConfig): Promise<void>;
  stop(): Promise<void>;
  execute(task: Task): AsyncIterable<AgentEvent>;
  getStatus(): AgentStatus;
}
```

Implementations:
- **SDKDriver**: Direct API calls
- **ACPDriver**: JSON-RPC over stdio
- **TmuxDriver**: Terminal-based

### Session State Machine

Sessions follow a state machine:

```
         create
           │
           ▼
       ┌───────┐
       │Created│
       └───┬───┘
           │ queue
           ▼
       ┌───────┐
       │Queued │
       └───┬───┘
           │ start
           ▼
       ┌───────┐◀──── pause
       │Running│       │
       └───┬───┴───────┤
           │           │
    ┌──────┼───────┐   │
    │      │       │   │
    ▼      ▼       ▼   ▼
┌────┐ ┌──────┐ ┌──────┐
│Done│ │Failed│ │Paused│
└────┘ └──────┘ └──────┘
```

### BYOA Account Pool

Account rotation for failover and load balancing:

```
┌─────────────────────────────────────────┐
│            Account Pool                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │Claude-1 │ │Claude-2 │ │Claude-3 │   │
│  │verified │ │cooldown │ │verified │   │
│  └────┬────┘ └─────────┘ └────┬────┘   │
│       │                       │         │
│       └───────────┬───────────┘         │
│                   │                     │
│           ┌───────▼───────┐             │
│           │   Selector    │             │
│           │ round-robin   │             │
│           └───────┬───────┘             │
└───────────────────┼─────────────────────┘
                    │
                    ▼
              Active Account
```

## Security Architecture

### Authentication Flow

```
┌──────────┐                          ┌──────────┐
│  Client  │                          │  Server  │
└────┬─────┘                          └────┬─────┘
     │                                     │
     │──── POST /auth/login ──────────────▶│
     │     {email, password}               │
     │                                     │
     │◀─── {token, refreshToken} ─────────│
     │                                     │
     │──── GET /api/agents ───────────────▶│
     │     Authorization: Bearer {token}   │
     │                                     │
     │◀─── {agents: [...]} ───────────────│
     │                                     │
     │──── POST /auth/refresh ────────────▶│
     │     {refreshToken}                  │
     │                                     │
     │◀─── {token, refreshToken} ─────────│
```

### DCG (Destructive Command Guard)

```
┌─────────────────────────────────────────────────────┐
│                  Agent Session                       │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐       │
│  │  Agent  │────▶│   DCG   │────▶│ Execute │       │
│  │ Command │     │  Check  │     │         │       │
│  └─────────┘     └────┬────┘     └─────────┘       │
│                       │                             │
│                 ┌─────▼─────┐                       │
│                 │  Blocked  │                       │
│                 │   Rules   │                       │
│                 └───────────┘                       │
└─────────────────────────────────────────────────────┘
```

## Database Schema

Key entities and relationships:

```
┌──────────────┐     ┌──────────────┐
│    agents    │     │   sessions   │
├──────────────┤     ├──────────────┤
│ id           │     │ id           │
│ name         │◀───┐│ agentId      │
│ type         │    ││ status       │
│ status       │    ││ task         │
│ config       │    │└──────────────┘
└──────────────┘    │
                    │ ┌──────────────┐
┌──────────────┐    │ │  checkpoints │
│   accounts   │    │ ├──────────────┤
├──────────────┤    │ │ id           │
│ id           │    │ │ sessionId    │────┘
│ provider     │    │ │ data         │
│ status       │    │ └──────────────┘
│ credentials  │    │
└──────────────┘    │ ┌──────────────┐
                    │ │    events    │
                    │ ├──────────────┤
                    │ │ id           │
                    └─│ sessionId    │
                      │ type         │
                      │ data         │
                      └──────────────┘
```

## Related Documentation

- [Components Detail](./components.md)
- [Data Flow Diagrams](./data-flow.md)
- [Architecture Decision Records](./decisions/)
