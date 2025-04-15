/**
 * WebSocket service for real-time communication
 */

// Store connected clients by game ID and user ID
const gameClients = new Map();
const userClients = new Map();

/**
 * Initialize the WebSocket service
 * @param {SocketIO.Server} io - Socket.IO server instance
 */
const initializeWebSocketService = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Handle user authentication and joining rooms
    socket.on('authenticate', (data) => {
      const { userId, token } = data;
      if (!userId) return;
      
      // Store the socket by user ID
      if (!userClients.has(userId)) {
        userClients.set(userId, new Set());
      }
      userClients.get(userId).add(socket);
      
      console.log(`User ${userId} authenticated with socket ${socket.id}`);
    });
    
    // Join a specific game room
    socket.on('joinGame', (data) => {
      const { gameId, userId, role } = data;
      if (!gameId) return;
      
      // Join the game room
      socket.join(`game:${gameId}`);
      
      // Store the socket by game ID
      if (!gameClients.has(gameId)) {
        gameClients.set(gameId, new Map());
      }
      if (!gameClients.get(gameId).has(userId)) {
        gameClients.get(gameId).set(userId, { role, sockets: new Set() });
      }
      gameClients.get(gameId).get(userId).sockets.add(socket);
      
      console.log(`User ${userId} joined game ${gameId} as ${role}`);
      
      // Notify other players in the game
      socket.to(`game:${gameId}`).emit('playerJoined', { userId, role });
    });
    
    // Leave a game room
    socket.on('leaveGame', (data) => {
      const { gameId, userId } = data;
      if (!gameId) return;
      
      socket.leave(`game:${gameId}`);
      console.log(`User ${userId} left game ${gameId}`);
      
      // Remove from game clients
      if (gameClients.has(gameId) && gameClients.get(gameId).has(userId)) {
        const userGameData = gameClients.get(gameId).get(userId);
        userGameData.sockets.delete(socket);
        
        if (userGameData.sockets.size === 0) {
          gameClients.get(gameId).delete(userId);
        }
        
        // Notify other players in the game
        socket.to(`game:${gameId}`).emit('playerLeft', { userId });
      }
    });
    
    // Handle order placement
    socket.on('placeOrder', (data) => {
      const { gameId, fromRole, toRole, quantity } = data;
      
      // Broadcast to all players in the game
      socket.to(`game:${gameId}`).emit('orderPlaced', {
        fromRole,
        toRole,
        quantity,
        timestamp: new Date()
      });
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      // Remove from user clients
      for (const [userId, sockets] of userClients.entries()) {
        if (sockets.has(socket)) {
          sockets.delete(socket);
          if (sockets.size === 0) {
            userClients.delete(userId);
          }
          break;
        }
      }
      
      // Remove from game clients
      for (const [gameId, users] of gameClients.entries()) {
        for (const [userId, userData] of users.entries()) {
          if (userData.sockets.has(socket)) {
            userData.sockets.delete(socket);
            if (userData.sockets.size === 0) {
              users.delete(userId);
              
              // Notify other players in the game
              socket.to(`game:${gameId}`).emit('playerDisconnected', { userId });
            }
            break;
          }
        }
        
        // Remove game if no users left
        if (users.size === 0) {
          gameClients.delete(gameId);
        }
      }
    });
  });
  
  console.log('WebSocket service initialized');
};

/**
 * Broadcast an update to all players in a game
 * @param {SocketIO.Server} io - Socket.IO server instance
 * @param {string} gameId - ID of the game
 * @param {object} updateData - Data to broadcast
 */
const broadcastUpdate = (io, gameId, updateData) => {
  io.to(`game:${gameId}`).emit('gameUpdate', updateData);
};

/**
 * Send notification to a specific player
 * @param {SocketIO.Server} io - Socket.IO server instance
 * @param {string} userId - ID of the user
 * @param {object} notificationData - Data to send
 */
const notifyPlayer = (io, userId, notificationData) => {
  if (userClients.has(userId)) {
    userClients.get(userId).forEach(socket => {
      socket.emit('notification', notificationData);
    });
  }
};

/**
 * Broadcast a blockchain transaction result to all players in a game
 * @param {SocketIO.Server} io - Socket.IO server instance
 * @param {string} gameId - ID of the game
 * @param {object} transactionData - Transaction data
 */
const broadcastTransaction = (io, gameId, transactionData) => {
  io.to(`game:${gameId}`).emit('blockchainTransaction', transactionData);
};

/**
 * Notify players that the game state has been updated
 * @param {SocketIO.Server} io - Socket.IO server instance
 * @param {string} gameId - ID of the game
 * @param {object} gameState - Updated game state
 */
const broadcastGameState = (io, gameId, gameState) => {
  io.to(`game:${gameId}`).emit('gameStateUpdated', gameState);
};

/**
 * Notify players that the week has been advanced
 * @param {SocketIO.Server} io - Socket.IO server instance
 * @param {string} gameId - ID of the game
 * @param {number} newWeek - New week number
 * @param {object} weekData - Week-specific data
 */
const broadcastWeekAdvanced = (io, gameId, newWeek, weekData) => {
  io.to(`game:${gameId}`).emit('weekAdvanced', {
    week: newWeek,
    ...weekData
  });
};

module.exports = function(io) {
  initializeWebSocketService(io);
  
  return {
    broadcastUpdate: (gameId, updateData) => broadcastUpdate(io, gameId, updateData),
    notifyPlayer: (userId, notificationData) => notifyPlayer(io, userId, notificationData),
    broadcastTransaction: (gameId, transactionData) => broadcastTransaction(io, gameId, transactionData),
    broadcastGameState: (gameId, gameState) => broadcastGameState(io, gameId, gameState),
    broadcastWeekAdvanced: (gameId, newWeek, weekData) => broadcastWeekAdvanced(io, gameId, newWeek, weekData)
  };
}; 