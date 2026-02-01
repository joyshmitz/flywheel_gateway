/**
 * Alert Adapter Types
 *
 * Common types for all alert channel adapters.
 *
 * @see bd-3c0o3 Real-time Alert Channels bead
 */

/**
 * Base configuration for all channel types.
 */
export interface ChannelConfig {
  /** Channel-specific configuration (varies by type) */
  [key: string]: unknown;
}

/**
 * Alert payload sent to adapters.
 */
export interface AlertPayload {
  /** Unique alert ID */
  id: string;
  /** Alert type (e.g., "agent_stuck", "cost_threshold") */
  type: string;
  /** Alert title */
  title: string;
  /** Alert body/description */
  body: string;
  /** Severity level */
  severity: "critical" | "error" | "warning" | "info" | "low";
  /** Alert category */
  category?: string;
  /** Source of the alert */
  source?: {
    type: string;
    id?: string;
    name?: string;
  };
  /** Optional link to more details */
  link?: string;
  /** ISO 8601 timestamp */
  timestamp?: string;
  /** Correlation ID for tracing */
  correlationId?: string;
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of a delivery attempt.
 */
export interface DeliveryResult {
  /** Whether the delivery succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Error code for categorization */
  errorCode?: string;
  /** HTTP response status if applicable */
  responseStatus?: number;
  /** Response body snippet (for debugging) */
  responseBody?: string;
  /** Time taken in milliseconds */
  durationMs: number;
}

/**
 * Channel adapter interface.
 *
 * Each adapter type (webhook, slack, discord) implements this interface.
 */
export interface ChannelAdapter<TConfig extends ChannelConfig = ChannelConfig> {
  /** Adapter type identifier */
  type: string;

  /**
   * Send an alert to the channel.
   */
  send(alert: AlertPayload, config: TConfig): Promise<DeliveryResult>;

  /**
   * Validate channel configuration.
   */
  validateConfig(config: unknown): config is TConfig;

  /**
   * Test the channel connection with a test message.
   */
  testConnection(config: TConfig): Promise<DeliveryResult>;
}

/**
 * Adapter registry type.
 */
export type AdapterRegistry = Record<string, ChannelAdapter>;
