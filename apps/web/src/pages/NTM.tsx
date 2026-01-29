/**
 * NTM Page - Notification & Telemetry Manager.
 *
 * Displays notifications with filtering, preferences management,
 * and read/action controls.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StatusPill } from "../components/ui/StatusPill";

// ============================================================================
// Types
// ============================================================================

interface Notification {
  id: string;
  category: string;
  priority: string;
  status: string;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string;
  actions?: Array<{ id: string; label: string }>;
}

interface NotificationList {
  data: Notification[];
  total: number;
}

interface NotificationPreferences {
  channels: string[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
  digestEnabled: boolean;
  digestInterval?: string;
}

// ============================================================================
// API
// ============================================================================

const API_BASE = "/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error?.message ?? body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ============================================================================
// Components
// ============================================================================

const priorityTone: Record<string, "positive" | "warning" | "danger" | "muted"> = {
  low: "muted",
  normal: "positive",
  high: "warning",
  urgent: "danger",
};

const categoryLabels: Record<string, string> = {
  agents: "Agents",
  coordination: "Coordination",
  tasks: "Tasks",
  costs: "Costs",
  security: "Security",
  system: "System",
};

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  return (
    <div className={`table__row ${notification.readAt ? "" : "table__row--unread"}`}>
      <span>
        <StatusPill tone={priorityTone[notification.priority] ?? "muted"}>
          {notification.priority}
        </StatusPill>
      </span>
      <span>{categoryLabels[notification.category] ?? notification.category}</span>
      <span>{notification.title}</span>
      <span className="muted">{new Date(notification.createdAt).toLocaleString()}</span>
      <span>
        {!notification.readAt && (
          <button
            className="ghost-button"
            type="button"
            onClick={() => onMarkRead(notification.id)}
          >
            Mark read
          </button>
        )}
      </span>
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================

type FilterCategory = "all" | "agents" | "coordination" | "tasks" | "costs" | "security" | "system";

export function NTMPage() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<FilterCategory>("all");
  const [status, setStatus] = useState<"all" | "unread" | "read">("all");

  const params = new URLSearchParams();
  if (category !== "all") params.set("category", category);
  if (status === "unread") params.set("status", "unread");
  if (status === "read") params.set("status", "read");

  const { data, isLoading, error } = useQuery({
    queryKey: ["notifications", category, status],
    queryFn: () =>
      fetchJson<NotificationList>(`/notifications?${params.toString()}`),
    staleTime: 10_000,
  });

  const { data: prefs } = useQuery({
    queryKey: ["notifications", "preferences"],
    queryFn: () =>
      fetchJson<{ data: NotificationPreferences }>("/notifications/preferences"),
    staleTime: 60_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () =>
      fetchJson("/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const testMutation = useMutation({
    mutationFn: () =>
      fetchJson("/notifications/test", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = data?.data ?? [];
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="page">
      <div className="page__header">
        <h2>Notifications</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {unreadCount > 0 && (
            <StatusPill tone="warning">{unreadCount} unread</StatusPill>
          )}
          <StatusPill tone="muted">{notifications.length} total</StatusPill>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card__header">
          <h3>Filters</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="ghost-button"
              type="button"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending || unreadCount === 0}
            >
              {markAllReadMutation.isPending ? "Marking..." : "Mark all read"}
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
            >
              {testMutation.isPending ? "Sending..." : "Send test"}
            </button>
          </div>
        </div>
        <div className="form-row">
          <select
            className="select-input"
            value={category}
            onChange={(e) => setCategory(e.target.value as FilterCategory)}
          >
            <option value="all">All categories</option>
            {Object.entries(categoryLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            className="select-input"
            value={status}
            onChange={(e) => setStatus(e.target.value as "all" | "unread" | "read")}
          >
            <option value="all">All status</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>
      </div>

      {/* Preferences summary */}
      {prefs?.data && (
        <div className="card card--compact" style={{ marginBottom: 16 }}>
          <div className="card__header">
            <h3>Preferences</h3>
          </div>
          <p className="muted">
            Channels: {prefs.data.channels.join(", ") || "none"} |{" "}
            Digest: {prefs.data.digestEnabled ? `enabled (${prefs.data.digestInterval ?? "daily"})` : "disabled"}
            {prefs.data.quietHoursStart && (
              <> | Quiet hours: {prefs.data.quietHoursStart}–{prefs.data.quietHoursEnd}</>
            )}
          </p>
        </div>
      )}

      {/* Notification list */}
      <div className="card">
        {isLoading && <p className="muted">Loading notifications...</p>}
        {error && <p className="error-text">{(error as Error).message}</p>}
        {!isLoading && notifications.length === 0 && (
          <p className="muted">No notifications found.</p>
        )}
        {notifications.length > 0 && (
          <div className="table">
            <div className="table__row table__row--header">
              <span>Priority</span>
              <span>Category</span>
              <span>Title</span>
              <span>Time</span>
              <span>Actions</span>
            </div>
            {notifications.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onMarkRead={(id) => markReadMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
