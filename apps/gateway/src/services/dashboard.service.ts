/**
 * Dashboard Service - Manages custom dashboards and widgets.
 *
 * Provides:
 * - CRUD operations for dashboards
 * - Widget data fetching
 * - Permission management
 * - Favorites management
 */

import { ulid } from "ulid";
import type {
  CreateDashboardInput,
  Dashboard,
  DashboardLayout,
  DashboardPermission,
  DashboardPermissionEntry,
  DashboardSharing,
  DashboardSummary,
  DEFAULT_LAYOUT,
  DEFAULT_SHARING,
  UpdateDashboardInput,
  Widget,
  WidgetData,
} from "@flywheel/shared";
import { getLogger } from "../middleware/correlation";

// ============================================================================
// In-Memory Storage (for MVP - migrate to DB later)
// ============================================================================

const dashboardsStore = new Map<string, Dashboard>();
const permissionsStore = new Map<string, DashboardPermissionEntry[]>();
const favoritesStore = new Map<string, Set<string>>(); // userId -> Set<dashboardId>

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_LAYOUT_CONFIG: DashboardLayout = {
  columns: 12,
  rowHeight: 80,
  margin: [16, 16],
  containerPadding: [16, 16],
};

const DEFAULT_SHARING_CONFIG: DashboardSharing = {
  visibility: "private",
  viewers: [],
  editors: [],
  requireAuth: true,
  embedEnabled: false,
};

// ============================================================================
// ID Generation
// ============================================================================

function generateDashboardId(): string {
  return `dash_${ulid()}`;
}

function generatePermissionId(): string {
  return `perm_${ulid()}`;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

function generateEmbedToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ============================================================================
// Dashboard CRUD
// ============================================================================

/**
 * Create a new dashboard.
 */
export function createDashboard(
  input: CreateDashboardInput,
  ownerId: string,
): Dashboard {
  const log = getLogger();
  const id = generateDashboardId();
  const now = new Date().toISOString();

  const dashboard: Dashboard = {
    id,
    name: input.name,
    description: input.description,
    ownerId,
    workspaceId: input.workspaceId ?? "default",
    layout: {
      ...DEFAULT_LAYOUT_CONFIG,
      ...input.layout,
    },
    widgets: input.widgets ?? [],
    sharing: {
      ...DEFAULT_SHARING_CONFIG,
      ...input.sharing,
    },
    refreshInterval: input.refreshInterval ?? 60,
    createdAt: now,
    updatedAt: now,
  };

  dashboardsStore.set(id, dashboard);
  log.info({ dashboardId: id, name: dashboard.name }, "Dashboard created");

  return dashboard;
}

/**
 * Get a dashboard by ID.
 */
export function getDashboard(id: string): Dashboard | undefined {
  return dashboardsStore.get(id);
}

/**
 * Get a dashboard by public slug.
 */
export function getDashboardBySlug(slug: string): Dashboard | undefined {
  for (const dashboard of dashboardsStore.values()) {
    if (dashboard.sharing.publicSlug === slug) {
      return dashboard;
    }
  }
  return undefined;
}

/**
 * Update an existing dashboard.
 */
export function updateDashboard(
  id: string,
  input: UpdateDashboardInput,
): Dashboard | undefined {
  const log = getLogger();
  const dashboard = dashboardsStore.get(id);

  if (!dashboard) {
    return undefined;
  }

  const updated: Dashboard = {
    ...dashboard,
    name: input.name ?? dashboard.name,
    description: input.description ?? dashboard.description,
    layout: input.layout ? { ...dashboard.layout, ...input.layout } : dashboard.layout,
    widgets: input.widgets ?? dashboard.widgets,
    sharing: input.sharing
      ? { ...dashboard.sharing, ...input.sharing }
      : dashboard.sharing,
    refreshInterval: input.refreshInterval ?? dashboard.refreshInterval,
    updatedAt: new Date().toISOString(),
  };

  dashboardsStore.set(id, updated);
  log.info({ dashboardId: id }, "Dashboard updated");

  return updated;
}

/**
 * Delete a dashboard.
 */
export function deleteDashboard(id: string): boolean {
  const log = getLogger();
  const deleted = dashboardsStore.delete(id);

  if (deleted) {
    // Clean up permissions
    permissionsStore.delete(id);

    // Clean up favorites
    for (const userFavorites of favoritesStore.values()) {
      userFavorites.delete(id);
    }

    log.info({ dashboardId: id }, "Dashboard deleted");
  }

  return deleted;
}

/**
 * Duplicate a dashboard.
 */
export function duplicateDashboard(
  id: string,
  ownerId: string,
  newName?: string,
): Dashboard | undefined {
  const original = dashboardsStore.get(id);

  if (!original) {
    return undefined;
  }

  return createDashboard(
    {
      name: newName ?? `${original.name} (Copy)`,
      description: original.description,
      workspaceId: original.workspaceId,
      layout: original.layout,
      widgets: original.widgets.map((w) => ({
        ...w,
        id: `widget_${ulid()}`,
      })),
      sharing: {
        ...DEFAULT_SHARING_CONFIG,
      },
      refreshInterval: original.refreshInterval,
    },
    ownerId,
  );
}

// ============================================================================
// List and Search
// ============================================================================

interface ListDashboardsOptions {
  workspaceId?: string;
  ownerId?: string;
  visibility?: string;
  userId?: string; // For filtering accessible dashboards
  limit?: number;
  offset?: number;
}

/**
 * List dashboards with filtering.
 */
export function listDashboards(
  options: ListDashboardsOptions = {},
): DashboardSummary[] {
  const { workspaceId, ownerId, visibility, userId, limit = 50, offset = 0 } = options;

  let results = Array.from(dashboardsStore.values());

  // Filter by workspace
  if (workspaceId) {
    results = results.filter((d) => d.workspaceId === workspaceId);
  }

  // Filter by owner
  if (ownerId) {
    results = results.filter((d) => d.ownerId === ownerId);
  }

  // Filter by visibility
  if (visibility) {
    results = results.filter((d) => d.sharing.visibility === visibility);
  }

  // Filter by user access (owner, viewer, or editor)
  if (userId) {
    results = results.filter((d) => canUserAccess(d, userId));
  }

  // Sort by updated date descending
  results.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  // Get user favorites
  const userFavorites = userId ? favoritesStore.get(userId) ?? new Set() : new Set();

  // Apply pagination
  const paginated = results.slice(offset, offset + limit);

  // Map to summaries
  return paginated.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    ownerId: d.ownerId,
    visibility: d.sharing.visibility,
    widgetCount: d.widgets.length,
    isFavorite: userFavorites.has(d.id),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }));
}

// ============================================================================
// Permission Management
// ============================================================================

/**
 * Check if a user can access a dashboard.
 */
export function canUserAccess(dashboard: Dashboard, userId: string): boolean {
  // Owner always has access
  if (dashboard.ownerId === userId) {
    return true;
  }

  // Public dashboards
  if (dashboard.sharing.visibility === "public") {
    return true;
  }

  // Check viewer/editor lists
  if (
    dashboard.sharing.viewers.includes(userId) ||
    dashboard.sharing.editors.includes(userId)
  ) {
    return true;
  }

  // Check permissions store
  const permissions = permissionsStore.get(dashboard.id) ?? [];
  return permissions.some((p) => p.userId === userId);
}

/**
 * Check if a user can edit a dashboard.
 */
export function canUserEdit(dashboard: Dashboard, userId: string): boolean {
  // Owner always has edit access
  if (dashboard.ownerId === userId) {
    return true;
  }

  // Check editor list
  if (dashboard.sharing.editors.includes(userId)) {
    return true;
  }

  // Check permissions store
  const permissions = permissionsStore.get(dashboard.id) ?? [];
  return permissions.some((p) => p.userId === userId && p.permission === "edit");
}

/**
 * Grant permission to a user.
 */
export function grantPermission(
  dashboardId: string,
  userId: string,
  permission: DashboardPermission,
  grantedBy?: string,
): DashboardPermissionEntry | undefined {
  const dashboard = dashboardsStore.get(dashboardId);

  if (!dashboard) {
    return undefined;
  }

  const permissions = permissionsStore.get(dashboardId) ?? [];

  // Remove existing permission for this user
  const filtered = permissions.filter((p) => p.userId !== userId);

  const entry: DashboardPermissionEntry = {
    dashboardId,
    userId,
    permission,
    grantedAt: new Date().toISOString(),
  };

  filtered.push(entry);
  permissionsStore.set(dashboardId, filtered);

  return entry;
}

/**
 * Revoke permission from a user.
 */
export function revokePermission(dashboardId: string, userId: string): boolean {
  const permissions = permissionsStore.get(dashboardId);

  if (!permissions) {
    return false;
  }

  const filtered = permissions.filter((p) => p.userId !== userId);

  if (filtered.length === permissions.length) {
    return false;
  }

  permissionsStore.set(dashboardId, filtered);
  return true;
}

/**
 * List permissions for a dashboard.
 */
export function listPermissions(
  dashboardId: string,
): DashboardPermissionEntry[] {
  return permissionsStore.get(dashboardId) ?? [];
}

// ============================================================================
// Favorites
// ============================================================================

/**
 * Add a dashboard to user's favorites.
 */
export function addFavorite(userId: string, dashboardId: string): boolean {
  const dashboard = dashboardsStore.get(dashboardId);

  if (!dashboard) {
    return false;
  }

  let favorites = favoritesStore.get(userId);

  if (!favorites) {
    favorites = new Set();
    favoritesStore.set(userId, favorites);
  }

  favorites.add(dashboardId);
  return true;
}

/**
 * Remove a dashboard from user's favorites.
 */
export function removeFavorite(userId: string, dashboardId: string): boolean {
  const favorites = favoritesStore.get(userId);

  if (!favorites) {
    return false;
  }

  return favorites.delete(dashboardId);
}

/**
 * List user's favorite dashboards.
 */
export function listFavorites(userId: string): DashboardSummary[] {
  const favoriteIds = favoritesStore.get(userId) ?? new Set();

  return Array.from(favoriteIds)
    .map((id) => dashboardsStore.get(id))
    .filter((d): d is Dashboard => d !== undefined)
    .map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      ownerId: d.ownerId,
      visibility: d.sharing.visibility,
      widgetCount: d.widgets.length,
      isFavorite: true,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
}

// ============================================================================
// Widget Management
// ============================================================================

/**
 * Add a widget to a dashboard.
 */
export function addWidget(dashboardId: string, widget: Widget): Dashboard | undefined {
  const dashboard = dashboardsStore.get(dashboardId);

  if (!dashboard) {
    return undefined;
  }

  const widgetWithId: Widget = {
    ...widget,
    id: widget.id || `widget_${ulid()}`,
  };

  const updated: Dashboard = {
    ...dashboard,
    widgets: [...dashboard.widgets, widgetWithId],
    updatedAt: new Date().toISOString(),
  };

  dashboardsStore.set(dashboardId, updated);
  return updated;
}

/**
 * Update a widget in a dashboard.
 */
export function updateWidget(
  dashboardId: string,
  widgetId: string,
  widgetUpdate: Partial<Widget>,
): Dashboard | undefined {
  const dashboard = dashboardsStore.get(dashboardId);

  if (!dashboard) {
    return undefined;
  }

  const widgetIndex = dashboard.widgets.findIndex((w) => w.id === widgetId);

  if (widgetIndex === -1) {
    return undefined;
  }

  const widgets = [...dashboard.widgets];
  widgets[widgetIndex] = {
    ...widgets[widgetIndex],
    ...widgetUpdate,
  };

  const updated: Dashboard = {
    ...dashboard,
    widgets,
    updatedAt: new Date().toISOString(),
  };

  dashboardsStore.set(dashboardId, updated);
  return updated;
}

/**
 * Remove a widget from a dashboard.
 */
export function removeWidget(
  dashboardId: string,
  widgetId: string,
): Dashboard | undefined {
  const dashboard = dashboardsStore.get(dashboardId);

  if (!dashboard) {
    return undefined;
  }

  const updated: Dashboard = {
    ...dashboard,
    widgets: dashboard.widgets.filter((w) => w.id !== widgetId),
    updatedAt: new Date().toISOString(),
  };

  dashboardsStore.set(dashboardId, updated);
  return updated;
}

// ============================================================================
// Sharing
// ============================================================================

/**
 * Update sharing settings for a dashboard.
 */
export function updateSharing(
  dashboardId: string,
  sharing: Partial<DashboardSharing>,
): Dashboard | undefined {
  const dashboard = dashboardsStore.get(dashboardId);

  if (!dashboard) {
    return undefined;
  }

  const newSharing: DashboardSharing = {
    ...dashboard.sharing,
    ...sharing,
  };

  // Generate public slug if making public and no slug exists
  if (
    newSharing.visibility === "public" &&
    !newSharing.publicSlug
  ) {
    newSharing.publicSlug = `${generateSlug(dashboard.name)}-${ulid().slice(-6).toLowerCase()}`;
  }

  // Generate embed token if embedding enabled and no token exists
  if (newSharing.embedEnabled && !newSharing.embedToken) {
    newSharing.embedToken = generateEmbedToken();
  }

  const updated: Dashboard = {
    ...dashboard,
    sharing: newSharing,
    updatedAt: new Date().toISOString(),
  };

  dashboardsStore.set(dashboardId, updated);
  return updated;
}

// ============================================================================
// Widget Data Fetching
// ============================================================================

/**
 * Fetch data for a widget.
 * This is a placeholder that returns mock data - actual implementation
 * would call the appropriate data source.
 */
export async function fetchWidgetData(
  dashboardId: string,
  widgetId: string,
): Promise<WidgetData> {
  const dashboard = dashboardsStore.get(dashboardId);

  if (!dashboard) {
    return {
      widgetId,
      data: null,
      fetchedAt: new Date().toISOString(),
      error: "Dashboard not found",
    };
  }

  const widget = dashboard.widgets.find((w) => w.id === widgetId);

  if (!widget) {
    return {
      widgetId,
      data: null,
      fetchedAt: new Date().toISOString(),
      error: "Widget not found",
    };
  }

  // TODO: Implement actual data fetching based on widget.config.dataSource
  // For now, return mock data based on widget type
  const mockData = getMockDataForWidget(widget);

  return {
    widgetId,
    data: mockData,
    fetchedAt: new Date().toISOString(),
  };
}

function getMockDataForWidget(widget: Widget): unknown {
  switch (widget.type) {
    case "metric-card":
      return {
        value: Math.floor(Math.random() * 1000),
        previousValue: Math.floor(Math.random() * 1000),
        trend: Math.random() > 0.5 ? "up" : "down",
        trendPercent: Math.floor(Math.random() * 30),
      };

    case "line-chart":
      return {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
          {
            label: "Usage",
            data: Array.from({ length: 7 }, () => Math.floor(Math.random() * 100)),
          },
        ],
      };

    case "bar-chart":
      return {
        labels: ["Agent A", "Agent B", "Agent C", "Agent D"],
        datasets: [
          {
            label: "Requests",
            data: Array.from({ length: 4 }, () => Math.floor(Math.random() * 500)),
          },
        ],
      };

    case "pie-chart":
      return {
        labels: ["Claude", "Codex", "Gemini", "Other"],
        data: [45, 30, 20, 5],
      };

    case "table":
      return {
        columns: ["Name", "Status", "Requests", "Latency"],
        rows: [
          ["Agent Alpha", "Running", "1,234", "45ms"],
          ["Agent Beta", "Idle", "567", "32ms"],
          ["Agent Gamma", "Error", "89", "N/A"],
        ],
      };

    case "agent-list":
      return {
        agents: [
          { id: "1", name: "Agent Alpha", status: "running", sessions: 5 },
          { id: "2", name: "Agent Beta", status: "idle", sessions: 0 },
          { id: "3", name: "Agent Gamma", status: "error", sessions: 0 },
        ],
      };

    case "activity-feed":
      return {
        events: [
          { id: "1", type: "session_start", message: "Agent Alpha started session", timestamp: new Date().toISOString() },
          { id: "2", type: "task_complete", message: "Task completed successfully", timestamp: new Date().toISOString() },
          { id: "3", type: "error", message: "Rate limit exceeded", timestamp: new Date().toISOString() },
        ],
      };

    case "gauge":
      return {
        value: Math.floor(Math.random() * 100),
        min: 0,
        max: 100,
        thresholds: [
          { value: 70, color: "yellow" },
          { value: 90, color: "red" },
        ],
      };

    default:
      return null;
  }
}

// ============================================================================
// Stats
// ============================================================================

/**
 * Get dashboard statistics.
 */
export function getDashboardStats(): {
  totalDashboards: number;
  byVisibility: Record<string, number>;
  totalWidgets: number;
  averageWidgetsPerDashboard: number;
} {
  const dashboards = Array.from(dashboardsStore.values());

  const byVisibility: Record<string, number> = {
    private: 0,
    team: 0,
    public: 0,
  };

  let totalWidgets = 0;

  for (const dashboard of dashboards) {
    byVisibility[dashboard.sharing.visibility]++;
    totalWidgets += dashboard.widgets.length;
  }

  return {
    totalDashboards: dashboards.length,
    byVisibility,
    totalWidgets,
    averageWidgetsPerDashboard:
      dashboards.length > 0 ? totalWidgets / dashboards.length : 0,
  };
}

// ============================================================================
// Testing Utilities
// ============================================================================

/**
 * Toggle favorite status for a dashboard.
 */
export function toggleFavorite(dashboardId: string, userId: string): boolean {
  const favorites = favoritesStore.get(userId);
  if (favorites?.has(dashboardId)) {
    favorites.delete(dashboardId);
    return false;
  }
  return addFavorite(userId, dashboardId);
}

/**
 * Clear all in-memory stores (for testing only).
 */
export function clearDashboardStore(): void {
  dashboardsStore.clear();
  permissionsStore.clear();
  favoritesStore.clear();
}
