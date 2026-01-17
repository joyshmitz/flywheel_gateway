/**
 * WebSocket utilities for performance-optimized real-time communication
 */

export {
  type BackpressureCallback,
  type BackpressureConfig,
  BackpressureManager,
  type BackpressureState,
  createBackpressureManager,
} from "./BackpressureManager";

export {
  createFlowControl,
  FlowControl,
  type FlowControlConfig,
  type FlowControlMessage,
  FlowControlSignal,
} from "./FlowControl";

export {
  createMessageQueue,
  MessageQueue,
  type QueueConfig,
  type QueueStats,
} from "./MessageQueue";

export {
  type BackoffConfig,
  type ConnectionState,
  type ConnectionStatus,
  calculateBackoff,
  createInitialStatus,
  DEFAULT_BACKOFF_CONFIG,
  getStatusHint,
  shouldRetry,
} from "./reconnect";

export {
  createWebSocketClient,
  WebSocketClient,
  type WebSocketClientConfig,
  type WebSocketClientEvent,
  type WebSocketClientListener,
} from "./WebSocketClient";
