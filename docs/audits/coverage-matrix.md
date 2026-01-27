# Coverage Matrix: Tools × Integration Planes

> **Bead**: bd-2bfy
> **Parent Epic**: bd-3oop (Integration completeness audit + gap closure)
> **Generated**: 2026-01-27
> **Status**: Complete

This matrix documents the integration coverage of tools across Flywheel Gateway's nine integration planes. Each cell indicates coverage status with links to relevant beads where applicable.

## Legend

- ✅ Full coverage (complete implementation)
- 🔶 Partial coverage (some functionality)
- ❌ No coverage (not implemented)
- N/A Not applicable for this tool type

## Coverage Matrix

| Tool | Registry | Detection | Install | Client Adapter | Gateway Service | API Route | UI Surface | Metrics/Alerts | Snapshot |
|------|----------|-----------|---------|----------------|-----------------|-----------|------------|----------------|----------|
| **br** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔶 | ✅ |
| **bv** | ✅ | ✅ | ✅ | ✅ | ✅ | 🔶 | N/A | 🔶 | ✅ |
| **dcg** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **slb** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | 🔶 | 🔶 | ✅ |
| **ubs** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | N/A | 🔶 | ✅ |
| **cass** | 🔶 | ✅ | N/A | ✅ | ✅ | 🔶 | N/A | N/A | N/A |
| **cm** | 🔶 | ✅ | N/A | ✅ | ✅ | 🔶 | N/A | N/A | N/A |
| **ntm** | ❌ | ❌ | N/A | ✅ | ✅ | 🔶 | ✅ | ✅ | ✅ |
| **ru** | ❌ | ❌ | N/A | ❌ | ✅ | ✅ | ✅ | 🔶 | ❌ |
| **gh** | ❌ | 🔶 | N/A | ❌ | ❌ | ❌ | N/A | N/A | N/A |
| **wezterm** | ❌ | ❌ | N/A | ❌ | ❌ | ❌ | N/A | N/A | N/A |
| **ghostty** | ❌ | ❌ | N/A | ❌ | ❌ | ❌ | N/A | N/A | N/A |
| **cursor** | ❌ | ❌ | N/A | ❌ | ❌ | ❌ | N/A | N/A | N/A |
| **sc** | ❌ | ❌ | N/A | ❌ | ❌ | ❌ | N/A | N/A | N/A |
| **sw** | ❌ | ❌ | N/A | ❌ | ❌ | ❌ | N/A | N/A | N/A |

## Integration Plane Definitions

### 1. Registry (manifest)
Tool defined in ACFS manifest or fallback tool registry with version check, install commands, and metadata.

**Location**: `apps/gateway/src/services/tool-registry.service.ts`

### 2. Detection
Tool detection logic for availability checking (e.g., `isDcgAvailable()`, `isSlbAvailable()`).

**Location**: `apps/gateway/src/services/agent-detection.service.ts`

### 3. Install
Install commands documented and runnable from registry or manifest.

**Source**: `acfs.manifest.yaml` or fallback registry

### 4. Client Adapter
Typed client wrapper in `@flywheel/flywheel-clients` package with full type safety.

**Location**: `packages/flywheel-clients/src/`

### 5. Gateway Service
Service layer in gateway app providing business logic and CLI orchestration.

**Location**: `apps/gateway/src/services/`

### 6. API Route
REST API endpoints exposed by Hono router.

**Location**: `apps/gateway/src/routes/`

### 7. UI Surface
React components or pages in web app that visualize or interact with the tool.

**Location**: `apps/web/src/`

### 8. Metrics/Alerts
Observability instrumentation including metrics, alerts, and health checks.

**Location**: `apps/gateway/src/services/alerts.ts`, `snapshot.service.ts`

### 9. Snapshot
Inclusion in unified system snapshot for state tracking.

**Location**: `apps/gateway/src/services/snapshot.service.ts`

## Detailed Tool Coverage

### br (Beads Issue Tracker) - 9/9 Planes

| Plane | Evidence |
|-------|----------|
| Registry | `tool-registry.service.ts:156-185` - Full definition with install commands |
| Detection | `agent-detection.service.ts:207-218` - FALLBACK_TOOL_CLIS |
| Install | Registry: curl-based bash install script |
| Client Adapter | `packages/flywheel-clients/src/br/index.ts` - Full `BrClient` |
| Gateway Service | `br.service.ts` (9.4 KB) - CRUD + sync operations |
| API Route | `routes/beads.ts` (27 KB) - Comprehensive REST endpoints |
| UI Surface | `pages/Beads.tsx` (18 KB) - Full dashboard |
| Metrics/Alerts | Snapshot collection via `getBrList`, `getBrSyncStatus` |
| Snapshot | `BeadsSnapshot` type with status counts |

**Related Beads**: bd-27xr (standardization), bd-1c08 (enhanced filtering)

### bv (Graph-Aware Issue Triage) - 6/9 Planes

| Plane | Evidence |
|-------|----------|
| Registry | `tool-registry.service.ts:188-216` - Optional tool |
| Detection | `agent-detection.service.ts:220-230` - Fallback CLI |
| Install | Registry: curl-based bash install |
| Client Adapter | `packages/flywheel-clients/src/bv/index.ts` (286 lines) |
| Gateway Service | `bv.service.ts` (5.7 KB) |
| API Route | Integrated into beads routes (partial) |
| Metrics/Alerts | Partial - via snapshot |
| Snapshot | `BeadsTriageRecommendation` in snapshot |

**Note**: UI surface N/A - BV is a CLI-only tool for agent consumption

### dcg (Destructive Command Guard) - 8/9 Planes

| Plane | Evidence |
|-------|----------|
| Registry | `tool-registry.service.ts:73-100` - Phase 0 (critical), required |
| Detection | `agent-detection.service.ts:160-170` - Fallback tools |
| Install | Registry: cargo install dcg |
| Client Adapter | ❌ Missing - direct CLI invocation in service |
| Gateway Service | Multiple: `dcg.service.ts`, `dcg-cli.service.ts`, `dcg-config.service.ts` |
| API Route | `routes/dcg.ts` (24 KB) - blocks, allowlist, exceptions |
| UI Surface | `pages/DCG.tsx` (33 KB) - Full dashboard |
| Metrics/Alerts | `alerts.ts` - DCG-specific alerting |
| Snapshot | `ToolHealthSnapshot` includes DCG |

**Gap**: Missing client adapter in flywheel-clients (bd-3vj0 may address)

### slb (Simultaneous Launch Button) - 7/9 Planes

| Plane | Evidence |
|-------|----------|
| Registry | `tool-registry.service.ts:104-128` - Phase 0, required |
| Detection | Registry-based detection |
| Install | Go install command |
| Client Adapter | ❌ Missing |
| Gateway Service | `slb.service.ts` (20 KB) |
| API Route | `routes/slb.ts` (19 KB) |
| UI Surface | Partial - integrated in safety posture |
| Metrics/Alerts | Partial - snapshot includes status |
| Snapshot | `ToolHealthSnapshot` includes SLB |

### ubs (Ultimate Bug Scanner) - 7/9 Planes

| Plane | Evidence |
|-------|----------|
| Registry | `tool-registry.service.ts:131-154` - Required, phase 0 |
| Detection | `agent-detection.service.ts:172-182` |
| Install | `cargo install ubs` |
| Client Adapter | ❌ Missing |
| Gateway Service | `ubs.service.ts` (16 KB) |
| API Route | `routes/ubs.ts` - scans, findings |
| Metrics/Alerts | Partial - snapshot status |
| Snapshot | `ToolHealthSnapshot` includes UBS |

### cass (Cross-Agent Session Search) - 4/9 Planes

| Plane | Evidence |
|-------|----------|
| Registry | 🔶 Referenced but may not be in full manifest |
| Detection | `agent-detection.service.ts:184-194` |
| Client Adapter | `packages/flywheel-clients/src/cass/index.ts` (13 KB) |
| Gateway Service | `cass.service.ts` (6.9 KB) |
| API Route | Partial - integrated into context routes |

### cm (Cass-Memory) - 4/9 Planes

| Plane | Evidence |
|-------|----------|
| Detection | `agent-detection.service.ts:196-206` |
| Client Adapter | `packages/flywheel-clients/src/cm/index.ts` (14 KB) |
| Gateway Service | `cm.service.ts` (8.5 KB) |
| API Route | Partial - context/memory routes |

### ntm (Named Tmux Manager) - 6/9 Planes

| Plane | Evidence |
|-------|----------|
| Registry | ❌ External tool, not in registry |
| Detection | ❌ Not detected |
| Client Adapter | `packages/flywheel-clients/src/ntm/index.ts` (23 KB) |
| Gateway Service | `ntm-ingest.service.ts`, `ntm-ws-bridge.service.ts` |
| API Route | WebSocket bridge (non-REST) |
| UI Surface | Agent state visualization |
| Metrics/Alerts | `alerts.ts` - NTM-specific rules |
| Snapshot | `NtmSnapshot` with session summaries |

**Related Beads**: bd-284u (NTM execution plane integration)

### ru (Repo Updater) - 4/9 Planes

| Plane | Evidence |
|-------|----------|
| Gateway Service | `ru-fleet.service.ts`, `ru-sweep.service.ts`, `ru-sync.service.ts` |
| API Route | `routes/ru.ts` (28 KB) - Fleet management |
| UI Surface | `pages/Fleet.tsx` (35 KB) |
| Metrics/Alerts | Partial - fleet status in snapshot |

**Gap**: Missing client adapter, registry entry, snapshot integration

### External Tools (N/A for Integration)

The following tools are external environment tools that don't require integration:
- **gh** - GitHub CLI (used via shell commands)
- **wezterm** - Terminal emulator
- **ghostty** - Terminal emulator
- **cursor** - IDE
- **sc** - Skill creator (user-invoked)
- **sw** - Skill workshop (user-invoked)

## Coverage Summary

### Fully Integrated (8-9 planes)
- **br** - 9/9 (exemplar integration)
- **dcg** - 8/9 (missing client adapter)
- **ntm** - 6/9 (WebSocket-based, external tool)

### Substantially Integrated (5-7 planes)
- **slb** - 7/9 (safety tool)
- **ubs** - 7/9 (safety tool)
- **bv** - 6/9 (optional tool)

### Partially Integrated (3-4 planes)
- **cass** - 4/9 (context search)
- **cm** - 4/9 (procedural memory)
- **ru** - 4/9 (fleet management)

### Minimal/No Integration (0-2 planes)
- **gh** - 1/9 (external CLI)
- **wezterm/ghostty/cursor/sc/sw** - 0/9 (external tools)

## Identified Gaps

### Client Adapter Gaps
The following tools have services but lack typed client adapters in `flywheel-clients`:
- DCG (bd-3vj0 may address)
- SLB
- UBS
- RU

### Snapshot Coverage Gaps
- RU fleet status not in system snapshot
- CASS/CM not separately tracked in snapshot

### Registry Gaps
- NTM not in registry (external tool)
- RU not in registry (external tool)
- CASS/CM may need full registry entries

## Related Beads

| Bead ID | Title | Relevance |
|---------|-------|-----------|
| bd-3oop | Integration completeness audit + gap closure | Parent epic |
| bd-12cw | Gap closure pass (convert uncovered cells to beads) | Next step |
| bd-27xr | Beads (br) standardization + API | BR integration |
| bd-284u | NTM execution plane integration | NTM integration |
| bd-2p50 | Tool adapter layer in flywheel-clients | Client adapters |
| bd-1hac | ACFS tool registry integration | Registry |
| bd-2p3h | Safety + updates integration | DCG/SLB/UBS |
| bd-3vj0 | Additional tool client adapters | Gap closure |
