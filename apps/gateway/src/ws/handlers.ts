import type { ServerWebSocket } from "bun";
import { logger } from "../services/logger";
import {
  canSubscribe,
} from "./authorization";
import {
  parseChannel,
  type Channel,
} from "./channels";
import {
  getHub,
  type AuthContext,
  type ConnectionData,
} from "./hub";
import { parseClientMessage } from "./messages";

/**
 * Handle WebSocket connection open event.
 * Adds the connection to the hub and registers initial subscriptions.
 */
export function handleWSOpen(ws: ServerWebSocket<ConnectionData>): void {
  const hub = getHub();
  const connectionId = ws.data.connectionId;
  
  hub.addConnection(ws, ws.data.auth);
  
  // Register pre-existing subscriptions (e.g. from upgrade)
  // These are considered "system-assigned" so we skip auth checks here
  if (ws.data.subscriptions.size > 0) {
    for (const [channelStr, cursor] of ws.data.subscriptions) {
      const channel = parseChannel(channelStr);
      if (channel) {
        const result = hub.subscribe(connectionId, channel, cursor);
        
        // Send missed messages immediately
        if (result.missedMessages && result.missedMessages.length > 0) {
           for (const msg of result.missedMessages) {
              ws.send(JSON.stringify({ type: 'message', message: msg }));
           }
        }
      }
    }
  }
  
  // Send welcome message
  ws.send(JSON.stringify({
     type: 'connected',
     connectionId: connectionId,
     timestamp: new Date().toISOString()
  }));
}

/**
 * Handle WebSocket message event.
 * Parses the message and delegates to the hub.
 */
export function handleWSMessage(
  ws: ServerWebSocket<ConnectionData>,
  message: string | Buffer,
): void {
  const hub = getHub();
  const connectionId = ws.data.connectionId;

  try {
    const text = typeof message === "string" ? message : message.toString();
    const clientMsg = parseClientMessage(text);

    if (!clientMsg) {
      logger.warn({ connectionId, text }, "Invalid WebSocket message format");
      ws.send(JSON.stringify({
         type: 'error',
         message: 'Invalid message format',
         timestamp: new Date().toISOString()
      }));
      return;
    }

    switch (clientMsg.type) {
      case "subscribe": {
        const channelStr = clientMsg.channel;
        const channel = parseChannel(channelStr);
        if (channel) {
          // Check authorization
          const authResult = canSubscribe(ws.data.auth, channel);
          if (!authResult.allowed) {
              ws.send(JSON.stringify({
                type: 'error',
                message: `Subscription denied: ${authResult.reason}`,
                channel: channelStr,
                timestamp: new Date().toISOString()
              }));
              break;
          }

          const cursor = clientMsg.cursor;
          
          // Subscribe and get missed messages
          const result = hub.subscribe(connectionId, channel, cursor);

          // Replay missed messages FIRST (so client state is consistent)
          if (result.missedMessages && result.missedMessages.length > 0) {
              for (const msg of result.missedMessages) {
                ws.send(JSON.stringify({ type: 'message', message: msg }));
              }
          }
          
          // THEN send acknowledgement with the latest cursor
          ws.send(JSON.stringify({
              type: 'subscribed',
              channel: channelStr,
              cursor: result.cursor,
              timestamp: new Date().toISOString()
          }));
        }
        break;
      }

      case "unsubscribe": {
        const channelStr = clientMsg.channel;
        const channel = parseChannel(channelStr);
        if (channel) {
          hub.unsubscribe(connectionId, channel);
          ws.send(JSON.stringify({
              type: 'unsubscribed',
              channel: channelStr,
              timestamp: new Date().toISOString()
          }));
        }
        break;
      }

      case "ping": {
        ws.send(
          JSON.stringify({
            type: "pong",
            timestamp: new Date().toISOString(),
          }),
        );
        hub.updateHeartbeat(connectionId);
        break;
      }
      
      case "reconnect": {
         // Handle reconnection logic
         const result = hub.handleReconnect(connectionId, clientMsg.cursors);
         ws.send(JSON.stringify(result));
         break;
      }

      default:
        logger.warn({ connectionId, type: clientMsg.type }, "Unknown message type");
    }
  } catch (err) {
    logger.error({ err, connectionId }, "Error handling WebSocket message");
    ws.send(JSON.stringify({
       type: 'error',
       message: 'Internal server error',
       timestamp: new Date().toISOString()
    }));
  }
}

/**
 * Handle WebSocket close event.
 * Removes the connection from the hub.
 */
export function handleWSClose(ws: ServerWebSocket<ConnectionData>): void {
  const hub = getHub();
  hub.removeConnection(ws.data.connectionId);
}

/**
 * Handle WebSocket error event.
 */
export function handleWSError(
  ws: ServerWebSocket<ConnectionData>,
  error: Error,
): void {
  logger.error(
    { connectionId: ws.data.connectionId, error },
    "WebSocket error",
  );
  // Connection removal is handled by close event usually, 
  // but we can ensure cleanup here if needed.
  // Bun emits close after error typically.
}
