/**
 * WebSocket Testing Utilities
 * 
 * Helper functions for testing WebSocket connections and messages
 * in the Beer Distribution Game integration tests.
 */

const { io } = require('socket.io-client');

/**
 * Creates a WebSocket client connection
 * 
 * @param {string} url - WebSocket server URL
 * @param {string} token - Authentication token
 * @param {string} playerName - Name for logging purposes
 * @returns {Object} WebSocket client and message collector
 */
function createWebSocketClient(url, token, playerName) {
  const messages = [];
  const messagesByType = {};

  // Create Socket.IO client
  const wsClient = io(url, {
    path: '/ws',
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000
  });

  // Set up event handlers
  wsClient.on('connect', () => {
    console.log(`[${playerName}] Connected to WebSocket server`);
  });

  wsClient.on('disconnect', (reason) => {
    console.log(`[${playerName}] Disconnected from WebSocket server: ${reason}`);
  });

  wsClient.on('error', (error) => {
    console.error(`[${playerName}] WebSocket error:`, error);
  });

  // Process and categorize incoming messages
  wsClient.on('message', (data) => {
    console.log(`[${playerName}] Received:`, data);
    
    messages.push({
      ...data,
      receivedAt: new Date()
    });

    // Organize messages by type for easier testing
    if (data.type) {
      if (!messagesByType[data.type]) {
        messagesByType[data.type] = [];
      }
      messagesByType[data.type].push(data);
    }
  });

  return {
    client: wsClient,
    messages,
    messagesByType,
    waitForMessage: async (type, timeout = 5000) => {
      // If we already have this message type, return immediately
      if (messagesByType[type] && messagesByType[type].length > 0) {
        return messagesByType[type][0];
      }

      // Otherwise, wait for the message to arrive
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Timeout waiting for message type: ${type}`));
        }, timeout);

        // Set up a temporary listener
        const messageHandler = (data) => {
          if (data.type === type) {
            clearTimeout(timeoutId);
            wsClient.off('message', messageHandler);
            resolve(data);
          }
        };

        wsClient.on('message', messageHandler);
      });
    },
    waitForConnection: async (timeout = 5000) => {
      if (wsClient.connected) {
        return true;
      }

      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Timeout waiting for connection'));
        }, timeout);

        wsClient.once('connect', () => {
          clearTimeout(timeoutId);
          resolve(true);
        });
      });
    }
  };
}

/**
 * Waits for all clients to receive a specific message type
 * 
 * @param {Array} clients - Array of WebSocket client objects
 * @param {string} messageType - Type of message to wait for
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Array>} Array of received messages
 */
async function waitForAllClientsToReceive(clients, messageType, timeout = 10000) {
  const promises = clients.map(client => 
    client.waitForMessage(messageType, timeout)
      .catch(err => {
        console.warn(`Client failed to receive ${messageType}: ${err.message}`);
        return null;
      })
  );

  return Promise.all(promises);
}

/**
 * Validates that WebSocket messages match database state
 * 
 * @param {Array} messages - WebSocket messages
 * @param {Object} gameState - Database game state
 * @returns {Array} Array of validation errors, empty if all match
 */
function validateWebSocketMessagesMatchDatabase(messages, gameState) {
  const errors = [];

  // Filter for game state update messages
  const gameStateMessages = messages.filter(msg => 
    msg.type === 'gameStateUpdated' || 
    msg.type === 'weekAdvanced'
  );

  if (gameStateMessages.length === 0) {
    errors.push('No game state update messages found');
    return errors;
  }

  // Check the most recent message
  const latestMessage = gameStateMessages.sort((a, b) => 
    new Date(b.receivedAt) - new Date(a.receivedAt)
  )[0];

  // Validate week number
  if (latestMessage.currentWeek !== undefined && 
      latestMessage.currentWeek !== gameState.week) {
    errors.push(`Week mismatch: message=${latestMessage.currentWeek}, db=${gameState.week}`);
  }

  // Validate player states if available
  if (latestMessage.playerStates) {
    const roles = ['retailer', 'wholesaler', 'distributor', 'factory'];
    
    for (const role of roles) {
      if (latestMessage.playerStates[role] && gameState.playerStates[role]) {
        // Inventory check
        if (latestMessage.playerStates[role].inventory !== 
            gameState.playerStates[role].inventory) {
          errors.push(
            `Inventory mismatch for ${role}: message=${latestMessage.playerStates[role].inventory}, ` +
            `db=${gameState.playerStates[role].inventory}`
          );
        }
        
        // Backlog check
        if (latestMessage.playerStates[role].backlog !== 
            gameState.playerStates[role].backlog) {
          errors.push(
            `Backlog mismatch for ${role}: message=${latestMessage.playerStates[role].backlog}, ` +
            `db=${gameState.playerStates[role].backlog}`
          );
        }
      }
    }
  }

  return errors;
}

/**
 * Disconnects all WebSocket clients
 * 
 * @param {Array} clients - Array of WebSocket client objects
 */
function disconnectAllClients(clients) {
  clients.forEach(client => {
    if (client.client && typeof client.client.disconnect === 'function') {
      client.client.disconnect();
    }
  });
}

/**
 * Collects WebSocket message statistics
 * 
 * @param {Array} clients - Array of WebSocket client objects
 * @returns {Object} Statistics object
 */
function collectMessageStats(clients) {
  const stats = {
    totalMessages: 0,
    messagesByType: {},
    messagesByClient: {},
    latency: {
      min: Number.MAX_SAFE_INTEGER,
      max: 0,
      avg: 0,
      total: 0,
      count: 0
    }
  };

  // Collect stats from all clients
  clients.forEach((client, index) => {
    const clientName = `client${index}`;
    stats.messagesByClient[clientName] = client.messages.length;
    stats.totalMessages += client.messages.length;

    // Aggregate by message type
    Object.entries(client.messagesByType).forEach(([type, messages]) => {
      if (!stats.messagesByType[type]) {
        stats.messagesByType[type] = 0;
      }
      stats.messagesByType[type] += messages.length;
    });

    // Calculate latency if timestamps are available
    client.messages.forEach(msg => {
      if (msg.timestamp && msg.receivedAt) {
        const latency = new Date(msg.receivedAt) - new Date(msg.timestamp);
        stats.latency.min = Math.min(stats.latency.min, latency);
        stats.latency.max = Math.max(stats.latency.max, latency);
        stats.latency.total += latency;
        stats.latency.count++;
      }
    });
  });

  // Calculate average latency
  if (stats.latency.count > 0) {
    stats.latency.avg = stats.latency.total / stats.latency.count;
  }

  return stats;
}

module.exports = {
  createWebSocketClient,
  waitForAllClientsToReceive,
  validateWebSocketMessagesMatchDatabase,
  disconnectAllClients,
  collectMessageStats
}; 