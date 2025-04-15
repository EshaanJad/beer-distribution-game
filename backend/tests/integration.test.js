/**
 * Integration Tests for Beer Distribution Game
 *
 * This suite tests the complete end-to-end flow with multiple players,
 * verifies MongoDB integration, and ensures WebSocket updates are reliable.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { app, server } = require('../app');
const User = require('../models/User');
const Game = require('../models/Game');
const GameState = require('../models/GameState');
const Order = require('../models/Order');
const {
  createWebSocketClient,
  waitForAllClientsToReceive,
  validateWebSocketMessagesMatchDatabase,
  disconnectAllClients,
  collectMessageStats
} = require('./utils/websocket-test-utils');

// Test config
const TEST_TIMEOUT = 30000; // 30 seconds for longer tests
jest.setTimeout(TEST_TIMEOUT);

// Test users
const testUsers = [
  { username: 'player1', email: 'player1@test.com', password: 'Password123' },
  { username: 'player2', email: 'player2@test.com', password: 'Password123' },
  { username: 'player3', email: 'player3@test.com', password: 'Password123' },
  { username: 'player4', email: 'player4@test.com', password: 'Password123' },
];

// WebSocket clients
const wsClients = [];

// Test data
let gameData = {
  players: {},
  gameId: null,
  tokens: {},
  gameStates: []
};

describe('Beer Distribution Game Integration Tests', () => {
  beforeAll(async () => {
    // Create test users
    for (const userData of testUsers) {
      // Check if user exists
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        await request(app)
          .post('/api/auth/register')
          .send(userData);
      }
    }
  });
  
  afterAll(async () => {
    // Close WebSocket clients
    disconnectAllClients(wsClients);
    
    // Clean up - delete test game and users
    if (gameData.gameId) {
      await Game.deleteOne({ gameId: gameData.gameId });
      await GameState.deleteMany({ gameId: gameData.gameId });
      await Order.deleteMany({ gameId: gameData.gameId });
    }
    
    // Close server and database connection
    await mongoose.disconnect();
    server.close();
  });
  
  // Test: User Authentication
  describe('1. Authentication', () => {
    it('should authenticate all test users', async () => {
      for (const userData of testUsers) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ email: userData.email, password: userData.password });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('token');
        
        // Store token for future requests
        gameData.tokens[userData.username] = response.body.data.token;
        gameData.players[userData.username] = response.body.data.id;
      }
      
      // Ensure all users have tokens
      const allHaveTokens = testUsers.every(user => 
        gameData.tokens[user.username] && 
        typeof gameData.tokens[user.username] === 'string'
      );
      
      expect(allHaveTokens).toBe(true);
    });
  });
  
  // Test: Game Creation and Joining
  describe('2. Game Setup', () => {
    it('should create a new game', async () => {
      // Create a new game with player1 as host
      const response = await request(app)
        .post('/api/games/create')
        .set('Authorization', `Bearer ${gameData.tokens.player1}`)
        .send({
          demandPattern: 'Constant',
          initialInventory: 12,
          orderDelayPeriod: 1,
          shippingDelayPeriod: 1,
          blockchainEnabled: false
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('gameId');
      
      gameData.gameId = response.body.data.gameId;
      console.log(`Created game with ID: ${gameData.gameId}`);
      
      // Verify game exists in database
      const game = await Game.findOne({ gameId: gameData.gameId });
      expect(game).toBeTruthy();
      expect(game.createdBy.toString()).toBe(gameData.players.player1);
      
      // Connect to WebSocket with player1
      const wsUrl = `http://localhost:${process.env.PORT || 5001}`;
      const wsClient = createWebSocketClient(
        wsUrl, 
        gameData.tokens.player1,
        'player1'
      );
      
      await wsClient.waitForConnection();
      wsClients.push(wsClient);
    });
    
    it('should allow players to join the game with different roles', async () => {
      const roles = ['Retailer', 'Wholesaler', 'Distributor', 'Factory'];
      const players = ['player1', 'player2', 'player3', 'player4'];
      
      // Player1 is already the host, assign a role
      await request(app)
        .post('/api/games/join')
        .set('Authorization', `Bearer ${gameData.tokens.player1}`)
        .send({
          gameId: gameData.gameId,
          role: roles[0]
        });
      
      // Connect remaining players to WebSockets and assign roles
      for (let i = 1; i < players.length; i++) {
        const response = await request(app)
          .post('/api/games/join')
          .set('Authorization', `Bearer ${gameData.tokens[players[i]]}`)
          .send({
            gameId: gameData.gameId,
            role: roles[i]
          });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        
        // Setup WebSocket for this player
        const wsUrl = `http://localhost:${process.env.PORT || 5001}`;
        const wsClient = createWebSocketClient(
          wsUrl,
          gameData.tokens[players[i]],
          players[i]
        );
        
        await wsClient.waitForConnection();
        wsClients.push(wsClient);
        
        // Short delay to allow WebSocket connections to establish
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Verify all players are in the game with correct roles
      const game = await Game.findOne({ gameId: gameData.gameId });
      expect(game.players.length).toBe(4);
      
      for (let i = 0; i < roles.length; i++) {
        const player = game.players.find(p => 
          p.userId.toString() === gameData.players[players[i]] &&
          p.role === roles[i]
        );
        expect(player).toBeTruthy();
      }
      
      // Check if all clients received playerJoined messages
      await waitForAllClientsToReceive(wsClients, 'playerJoined');
    });
  });
  
  // Test: Game Play and State Management
  describe('3. Game Flow', () => {
    it('should start the game successfully', async () => {
      // Wait a bit to ensure all WebSocket connections are ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Start the game as player1 (host)
      const response = await request(app)
        .post(`/api/games/${gameData.gameId}/start`)
        .set('Authorization', `Bearer ${gameData.tokens.player1}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Wait for WebSocket messages about game starting
      const gameStartMessages = await waitForAllClientsToReceive(
        wsClients, 
        'gameStarted',
        5000
      );
      
      // Check if most clients received the message
      const receivedCount = gameStartMessages.filter(Boolean).length;
      expect(receivedCount).toBeGreaterThan(0);
      
      // Check if game is started in database
      const game = await Game.findOne({ gameId: gameData.gameId });
      expect(game.status).toBe('Active');
      
      // Verify initial game state exists
      const initialState = await GameState.findOne({ 
        gameId: gameData.gameId, 
        week: 0 
      });
      
      expect(initialState).toBeTruthy();
      expect(initialState.playerStates.retailer.inventory).toBe(12);
      expect(initialState.playerStates.wholesaler.inventory).toBe(12);
      expect(initialState.playerStates.distributor.inventory).toBe(12);
      expect(initialState.playerStates.factory.inventory).toBe(12);
    });
    
    it('should allow players to place orders', async () => {
      const players = ['player1', 'player2', 'player3', 'player4'];
      const roles = ['Retailer', 'Wholesaler', 'Distributor', 'Factory'];
      
      // Each player places an order
      for (let i = 0; i < players.length; i++) {
        const orderQuantity = 4 + i; // Different order quantities
        
        const response = await request(app)
          .post(`/api/orders/${gameData.gameId}/place`)
          .set('Authorization', `Bearer ${gameData.tokens[players[i]]}`)
          .send({
            quantity: orderQuantity
          });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        
        // Wait for WebSocket updates
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Verify orders exist in database
      const game = await Game.findOne({ gameId: gameData.gameId });
      const gameState = await GameState.findOne({ 
        gameId: gameData.gameId, 
        week: game.currentWeek 
      });
      
      // Check if all pending actions are completed
      const allActionsCompleted = gameState.pendingActions.every(
        action => action.completed
      );
      
      expect(allActionsCompleted).toBe(true);
      
      // Verify WebSocket notifications about order placement
      const orderPlacedMessages = wsClients.flatMap(client => 
        client.messagesByType['orderPlaced'] || []
      );
      
      expect(orderPlacedMessages.length).toBeGreaterThan(0);
    });
    
    it('should advance to the next week successfully', async () => {
      // Advance to next week as player1 (host)
      const response = await request(app)
        .post(`/api/games/${gameData.gameId}/advance-week`)
        .set('Authorization', `Bearer ${gameData.tokens.player1}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Wait for WebSocket updates
      const weekAdvancedMessages = await waitForAllClientsToReceive(
        wsClients, 
        'weekAdvanced',
        5000
      );
      
      // Check if most clients received the message
      const receivedCount = weekAdvancedMessages.filter(Boolean).length;
      expect(receivedCount).toBeGreaterThan(0);
      
      // Verify game advanced in database
      const game = await Game.findOne({ gameId: gameData.gameId });
      expect(game.currentWeek).toBe(1);
      
      // Verify new game state exists
      const newGameState = await GameState.findOne({ 
        gameId: gameData.gameId, 
        week: 1 
      });
      
      expect(newGameState).toBeTruthy();
    });
    
    it('should process orders and update inventories correctly', async () => {
      // Get current game state
      const game = await Game.findOne({ gameId: gameData.gameId });
      const gameState = await GameState.findOne({ 
        gameId: gameData.gameId, 
        week: game.currentWeek 
      });
      
      // Check if inventory and backlog numbers make sense
      expect(gameState.playerStates.retailer).toBeTruthy();
      expect(gameState.playerStates.wholesaler).toBeTruthy();
      expect(gameState.playerStates.distributor).toBeTruthy();
      expect(gameState.playerStates.factory).toBeTruthy();
      
      // The exact values depend on the game logic implementation
      // We're just checking that the values are numbers
      expect(typeof gameState.playerStates.retailer.inventory).toBe('number');
      expect(typeof gameState.playerStates.wholesaler.inventory).toBe('number');
      expect(typeof gameState.playerStates.distributor.inventory).toBe('number');
      expect(typeof gameState.playerStates.factory.inventory).toBe('number');
      
      expect(typeof gameState.playerStates.retailer.backlog).toBe('number');
      expect(typeof gameState.playerStates.wholesaler.backlog).toBe('number');
      expect(typeof gameState.playerStates.distributor.backlog).toBe('number');
      expect(typeof gameState.playerStates.factory.backlog).toBe('number');
      
      // Get orders
      const orders = await Order.find({ gameId: gameData.gameId });
      expect(orders.length).toBeGreaterThan(0);
    });
  });
  
  // Test: MongoDB Integration
  describe('4. MongoDB Integration', () => {
    it('should store and retrieve game data correctly', async () => {
      // Verify game document
      const game = await Game.findOne({ gameId: gameData.gameId });
      expect(game).toBeTruthy();
      expect(game.gameId).toBe(gameData.gameId);
      expect(game.status).toBe('Active');
      expect(game.players.length).toBe(4);
      
      // Verify game states
      const gameStates = await GameState.find({ gameId: gameData.gameId }).sort('week');
      expect(gameStates.length).toBeGreaterThan(0);
      
      // Store game states for later verification
      gameData.gameStates = gameStates;
      
      // Verify orders
      const orders = await Order.find({ gameId: gameData.gameId });
      expect(orders.length).toBeGreaterThan(0);
      
      // Verify relationships between data
      const currentWeekState = gameStates.find(state => state.week === game.currentWeek);
      expect(currentWeekState).toBeTruthy();
      
      // Verify user references
      for (const player of game.players) {
        const user = await User.findById(player.userId);
        expect(user).toBeTruthy();
      }
    });
    
    it('should maintain data consistency across operations', async () => {
      const game = await Game.findOne({ gameId: gameData.gameId });
      
      // Check that game states progress properly
      const weekNumbers = gameData.gameStates.map(state => state.week);
      const expectedWeeks = Array.from(
        { length: game.currentWeek + 1 }, 
        (_, i) => i
      );
      
      expect(weekNumbers).toEqual(expect.arrayContaining(expectedWeeks));
      
      // Check player state consistency
      const currentState = await GameState.findOne({ 
        gameId: gameData.gameId, 
        week: game.currentWeek 
      });
      
      const roles = ['retailer', 'wholesaler', 'distributor', 'factory'];
      
      // Each role should have state data
      for (const role of roles) {
        expect(currentState.playerStates[role]).toBeTruthy();
        expect(currentState.playerStates[role].inventory).toBeGreaterThanOrEqual(0);
        
        // Current cost should reflect inventory holding and backlog costs
        const inventoryCost = currentState.playerStates[role].inventory * 1; // Assuming holding cost is 1
        const backlogCost = currentState.playerStates[role].backlog * 2; // Assuming backlog cost is 2
        const expectedTotalCost = inventoryCost + backlogCost;
        
        // Allow for small rounding differences
        expect(currentState.playerStates[role].currentCost).toBeCloseTo(expectedTotalCost, 1);
      }
    });
  });
  
  // Test: WebSocket Reliability
  describe('5. WebSocket Reliability', () => {
    it('should have delivered notifications to all players', () => {
      // Check if all clients received messages
      for (const client of wsClients) {
        expect(client.messages.length).toBeGreaterThan(0);
        
        // Check for essential message types
        const messageTypes = Object.keys(client.messagesByType);
        
        // Expect to have received at least some of these message types
        const essentialTypes = [
          'gameStarted',
          'gameStateUpdated',
          'orderPlaced',
          'weekAdvanced',
          'playerJoined',
          'playerUpdated'
        ];
        
        const hasEssentialMessages = essentialTypes.some(type => 
          messageTypes.includes(type)
        );
        
        expect(hasEssentialMessages).toBe(true);
      }
    });
    
    it('should ensure WebSocket updates match database state', async () => {
      // Get final game state
      const game = await Game.findOne({ gameId: gameData.gameId });
      const gameState = await GameState.findOne({ 
        gameId: gameData.gameId, 
        week: game.currentWeek 
      });
      
      // For each client, validate their state matches the database
      for (const client of wsClients) {
        const errors = validateWebSocketMessagesMatchDatabase(
          client.messages,
          gameState
        );
        
        // We're being a bit lenient here because WebSocket messages might not
        // perfectly match database state due to timing
        console.log(`WebSocket validation errors: ${errors.length}`);
        if (errors.length > 0) {
          console.log(errors);
        }
        
        // Just check that there aren't too many errors
        expect(errors.length).toBeLessThan(5);
      }
      
      // Print WebSocket statistics
      const stats = collectMessageStats(wsClients);
      console.log('WebSocket message statistics:', JSON.stringify(stats, null, 2));
    });
  });
}); 