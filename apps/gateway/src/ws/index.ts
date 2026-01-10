/**
 * WebSocket Infrastructure Module.
 *
 * Provides real-time communication with:
 * - Durable ring buffers for message history
 * - Cursor-based replay for reconnection
 * - Channel-based pub/sub
 * - Heartbeat and connection management
 * - Authorization per channel
 */

// Cursor utilities
export {
  encodeCursor,
  decodeCursor,
  compareCursors,
  isCursorExpired,
  createCursor,
  type CursorData,
} from "./cursor";

// Ring buffer
export {
  RingBuffer,
  getBufferConfig,
  BUFFER_CONFIGS,
  type RingBufferConfig,
} from "./ring-buffer";

// Channel types
export {
  channelToString,
  parseChannel,
  getChannelTypePrefix,
  getChannelScope,
  getChannelResourceId,
  channelsEqual,
  channelMatchesPattern,
  type Channel,
  type AgentChannel,
  type WorkspaceChannel,
  type UserChannel,
  type SystemChannel,
  type ChannelTypePrefix,
} from "./channels";

// Message types
export {
  createHubMessage,
  parseClientMessage,
  serializeServerMessage,
  type MessageType,
  type MessageMetadata,
  type HubMessage,
  type ClientMessage,
  type ServerMessage,
  type SubscribeMessage,
  type UnsubscribeMessage,
  type BackfillMessage,
  type PingMessage,
  type ReconnectMessage,
  type ConnectedMessage,
  type SubscribedMessage,
  type UnsubscribedMessage,
  type ChannelMessage,
  type BackfillResponse,
  type PongMessage,
  type HeartbeatMessage,
  type ReconnectAckMessage,
  type ErrorMessage,
} from "./messages";

// WebSocket Hub
export {
  WebSocketHub,
  getHub,
  setHub,
  type AuthContext,
  type ConnectionData,
  type ConnectionHandle,
  type HubStats,
} from "./hub";

// Heartbeat management
export {
  HeartbeatManager,
  getHeartbeatManager,
  startHeartbeat,
  stopHeartbeat,
  HEARTBEAT_INTERVAL_MS,
  CONNECTION_TIMEOUT_MS,
} from "./heartbeat";

// Authorization
export {
  canSubscribe,
  canPublish,
  createInternalAuthContext,
  createGuestAuthContext,
  validateAuthContext,
  type AuthorizationResult,
} from "./authorization";
