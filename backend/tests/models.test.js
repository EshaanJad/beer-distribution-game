const mongoose = require('mongoose');
const Game = require('../models/Game');
const GameState = require('../models/GameState');
const User = require('../models/User');
const Order = require('../models/Order');

describe('Models', () => {
  // Test data
  let testUser;
  let userId;

  beforeEach(async () => {
    // Create a test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    userId = testUser._id;
  });

  describe('Game Model', () => {
    it('should create a new game with default values', async () => {
      const game = await Game.create({
        gameId: `test-game-${Date.now()}`,
        createdBy: userId
      });

      expect(game).toBeTruthy();
      expect(game.createdBy.toString()).toBe(userId.toString());
      expect(game.gameId).toContain('test-game-');
      expect(game.status).toBe('Setup');
      expect(game.players).toHaveLength(0);
      expect(game.configuration).toBeDefined();
      
      // Default configuration values
      expect(game.configuration.orderDelay).toBe(2);
      expect(game.configuration.shippingDelay).toBe(2);
      expect(game.configuration.demandPattern).toBe('Constant');
      expect(game.configuration.initialInventory).toBe(12);
      expect(game.configuration.blockchainEnabled).toBe(true);
    });

    it('should create a game with custom configuration', async () => {
      const customConfig = {
        orderDelay: 3,
        shippingDelay: 1,
        demandPattern: 'Step',
        initialInventory: 20,
        blockchainEnabled: false
      };

      const game = await Game.create({
        gameId: `test-game-${Date.now()}-custom`,
        createdBy: userId,
        configuration: customConfig
      });

      expect(game).toBeTruthy();
      expect(game.configuration.orderDelay).toBe(customConfig.orderDelay);
      expect(game.configuration.shippingDelay).toBe(customConfig.shippingDelay);
      expect(game.configuration.demandPattern).toBe(customConfig.demandPattern);
      expect(game.configuration.initialInventory).toBe(customConfig.initialInventory);
      expect(game.configuration.blockchainEnabled).toBe(customConfig.blockchainEnabled);
    });

    it('should add players to a game', async () => {
      const game = await Game.create({
        gameId: `test-game-${Date.now()}-players`,
        createdBy: userId
      });

      game.players.push({
        userId,
        role: 'Retailer',
        joined: new Date(),
        isActive: true
      });

      const updatedGame = await game.save();
      expect(updatedGame.players).toHaveLength(1);
      expect(updatedGame.players[0].role).toBe('Retailer');
      expect(updatedGame.players[0].userId.toString()).toBe(userId.toString());
      expect(updatedGame.players[0].isActive).toBe(true);
    });
  });

  describe('GameState Model', () => {
    it('should create a game state for week 0', async () => {
      const gameId = `test-game-${Date.now()}-state`;
      
      const game = await Game.create({
        gameId,
        createdBy: userId
      });

      const gameState = await GameState.create({
        gameId: game.gameId,
        week: 0,
        playerStates: {
          retailer: { 
            inventory: 12,
            backlog: 0,
            incomingOrders: 0,
            outgoingOrders: 0,
            currentCost: 0
          },
          wholesaler: { 
            inventory: 12,
            backlog: 0,
            incomingOrders: 0,
            outgoingOrders: 0,
            currentCost: 0
          },
          distributor: { 
            inventory: 12,
            backlog: 0,
            incomingOrders: 0,
            outgoingOrders: 0,
            currentCost: 0
          },
          factory: { 
            inventory: 12,
            backlog: 0,
            incomingOrders: 0,
            outgoingOrders: 0,
            currentCost: 0
          }
        },
        pendingActions: []
      });

      expect(gameState).toBeTruthy();
      expect(gameState.gameId).toBe(game.gameId);
      expect(gameState.week).toBe(0);
      expect(gameState.playerStates).toBeDefined();
      expect(gameState.playerStates.retailer.inventory).toBe(12);
      expect(gameState.pendingActions).toHaveLength(0);
    });

    it('should add pending actions to game state', async () => {
      const gameId = `test-game-${Date.now()}-actions`;
      
      const game = await Game.create({
        gameId,
        createdBy: userId
      });

      const gameState = await GameState.create({
        gameId: game.gameId,
        week: 0,
        playerStates: {
          retailer: { 
            inventory: 12,
            backlog: 0,
            incomingOrders: 0,
            outgoingOrders: 0,
            currentCost: 0
          },
          wholesaler: { 
            inventory: 12,
            backlog: 0,
            incomingOrders: 0,
            outgoingOrders: 0,
            currentCost: 0
          },
          distributor: { 
            inventory: 12,
            backlog: 0,
            incomingOrders: 0,
            outgoingOrders: 0,
            currentCost: 0
          },
          factory: { 
            inventory: 12,
            backlog: 0,
            incomingOrders: 0,
            outgoingOrders: 0,
            currentCost: 0
          }
        },
        pendingActions: []
      });

      gameState.pendingActions.push({
        playerId: userId,
        actionType: 'PlaceOrder',
        completed: false
      });

      const updatedGameState = await gameState.save();
      expect(updatedGameState.pendingActions).toHaveLength(1);
      expect(updatedGameState.pendingActions[0].playerId.toString()).toBe(userId.toString());
      expect(updatedGameState.pendingActions[0].actionType).toBe('PlaceOrder');
      expect(updatedGameState.pendingActions[0].completed).toBe(false);
    });
  });

  describe('Order Model', () => {
    it('should create an order', async () => {
      const gameId = `test-game-${Date.now()}-order`;
      
      const game = await Game.create({
        gameId,
        createdBy: userId
      });

      // Create another user for the recipient
      const recipient = await User.create({
        username: 'recipient',
        email: 'recipient@example.com',
        password: 'password123'
      });

      const order = await Order.create({
        gameId: game.gameId,
        week: 0,
        sender: {
          role: 'Retailer',
          userId
        },
        recipient: {
          role: 'Wholesaler',
          userId: recipient._id
        },
        quantity: 5,
        status: 'Pending',
        deliveryWeek: 2
      });

      expect(order).toBeTruthy();
      expect(order.gameId).toBe(game.gameId);
      expect(order.week).toBe(0);
      expect(order.sender.role).toBe('Retailer');
      expect(order.sender.userId.toString()).toBe(userId.toString());
      expect(order.recipient.role).toBe('Wholesaler');
      expect(order.recipient.userId.toString()).toBe(recipient._id.toString());
      expect(order.quantity).toBe(5);
      expect(order.status).toBe('Pending');
      expect(order.deliveryWeek).toBe(2);
    });
  });
}); 