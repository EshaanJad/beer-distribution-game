import { useState, useEffect, useCallback, useRef } from 'react';

// Define the WebSocket URL - fallback to localhost for development
const WS_URL = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_WEBSOCKET_URL 
  ? process.env.NEXT_PUBLIC_WEBSOCKET_URL
  : 'ws://localhost:5001';

// Event types from the server
export type WebSocketEvent = 
  | { type: 'gameUpdate'; data: any }
  | { type: 'notification'; data: any }
  | { type: 'blockchainTransaction'; data: any }
  | { type: 'gameStateUpdated'; data: any }
  | { type: 'weekAdvanced'; data: any }
  | { type: 'playerJoined'; data: any }
  | { type: 'playerLeft'; data: any }
  | { type: 'playerDisconnected'; data: any }
  | { type: 'orderPlaced'; data: any };

interface UseWebSocketOptions {
  onMessage?: (event: WebSocketEvent) => void;
  reconnectInterval?: number;
  reconnectAttempts?: number;
}

type QueuedMessage = {
  type: string;
  payload: any;
};

export function useWebSocket(gameId: string | null, options: UseWebSocketOptions = {}) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const attemptRef = useRef<number>(0);
  const messageQueueRef = useRef<QueuedMessage[]>([]);
  const { onMessage, reconnectInterval = 5000, reconnectAttempts = 5 } = options;

  // Function to get auth token
  const getToken = useCallback(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('bdg_token') : null;
  }, []);

  // Process any queued messages
  const processQueue = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN && messageQueueRef.current.length > 0) {
      console.log(`Processing ${messageQueueRef.current.length} queued messages`);
      
      // Process all queued messages
      messageQueueRef.current.forEach(({ type, payload }) => {
        socketRef.current?.send(JSON.stringify({ type, ...payload }));
      });
      
      // Clear the queue
      messageQueueRef.current = [];
    }
  }, []);

  // Function to send messages through the WebSocket
  const sendMessage = useCallback((type: string, payload: any = {}) => {
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        // Connection is open, send immediately
        socketRef.current.send(JSON.stringify({ type, ...payload }));
        return true;
      } else if (socketRef.current.readyState === WebSocket.CONNECTING) {
        // Connection is still establishing, queue the message
        console.log(`WebSocket still connecting, queueing message: ${type}`);
        messageQueueRef.current.push({ type, payload });
        return true;
      }
    }
    return false;
  }, []);

  // Connect to the WebSocket server
  const connect = useCallback(() => {
    // If we don't have a game ID or we're at max reconnect attempts, don't try to connect
    if (!gameId || (attemptRef.current >= reconnectAttempts && reconnectAttempts !== 0)) {
      return;
    }

    // Clean up any existing socket
    if (socketRef.current) {
      socketRef.current.close();
    }

    // Construct URL with token 
    const token = getToken();
    const wsUrl = `${WS_URL}${WS_URL.endsWith('/') ? '' : '/'}${token ? `?token=${token}` : ''}`;
    console.log(`Connecting to WebSocket: ${wsUrl}`);
    
    // Create a new WebSocket connection
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connection established');
      setConnected(true);
      setError(null);
      attemptRef.current = 0;
      
      // Join the game room once connected
      if (gameId) {
        socket.send(JSON.stringify({ type: 'joinGame', gameId }));
      }
      
      // Process any queued messages
      processQueue();
    };

    socket.onclose = (event) => {
      console.log('WebSocket connection closed', event.wasClean ? 'cleanly' : 'with error');
      setConnected(false);
      
      // If closed abnormally and we haven't reached max attempts, try to reconnect
      if (
        !event.wasClean && 
        (attemptRef.current < reconnectAttempts || reconnectAttempts === 0)
      ) {
        attemptRef.current += 1;
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        console.log(`Attempting to reconnect (${attemptRef.current}/${reconnectAttempts || 'unlimited'})`);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    };

    socket.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError(new Error('WebSocket connection error'));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) {
          onMessage(data);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };
  }, [gameId, getToken, onMessage, reconnectAttempts, reconnectInterval, processQueue]);

  // Connect when gameId changes or component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log(`Initializing WebSocket connection for game ID: ${gameId}`);
      connect();
      
      // Clean up on unmount
      return () => {
        if (socketRef.current) {
          // Send a leave game message if we have a game ID and connection is open
          if (gameId && socketRef.current.readyState === WebSocket.OPEN) {
            try {
              socketRef.current.send(JSON.stringify({ type: 'leaveGame', gameId }));
            } catch (err) {
              console.error('Error sending leaveGame message:', err);
            }
          }
          
          socketRef.current.close();
        }
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };
    }
  }, [gameId, connect]);

  return {
    connected,
    error,
    sendMessage,
    // Helper methods for common actions
    joinGame: (gameId: string) => sendMessage('joinGame', { gameId }),
    leaveGame: (gameId: string) => sendMessage('leaveGame', { gameId }),
    placeOrder: (orderId: string) => sendMessage('placeOrder', { orderId }),
  };
} 