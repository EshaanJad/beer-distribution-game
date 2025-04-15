const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Game = require('../models/Game');
const GameState = require('../models/GameState');
const Order = require('../models/Order');
const jwt = require('jsonwebtoken');
const analyticsService = require('../services/analytics');

// Mock analytics service
jest.mock('../services/analytics', () => ({
  getGameAnalytics: jest.fn().mockResolvedValue({
    playerPerformance: {
      retailer: { totalCost: 100, avgInventory: 10 },
      wholesaler: { totalCost: 120, avgInventory: 12 },
      distributor: { totalCost: 150, avgInventory: 15 },
      factory: { totalCost: 180, avgInventory: 18 }
    },
    bullwhipMetrics: {
      varianceRatio: 2.5,
      weeklyDemandVariance: [1.2, 2.3, 3.1]
    },
    blockchainMetrics: {
      totalTransactions: 25,
      averageGasUsed: 150000
    }
  }),
  getAggregatedAnalytics: jest.fn().mockResolvedValue({
    totalGames: 10,
    activeGames: 5,
    completedGames: 5,
    averageGameLength: 12,
    averageBullwhipEffect: 2.1,
    rolePerformance: {
      retailer: { avgCost: 110 },
      wholesaler: { avgCost: 130 },
      distributor: { avgCost: 160 },
      factory: { avgCost: 190 }
    }
  }),
  generateGameAnalytics: jest.fn().mockResolvedValue({
    success: true,
    data: {
      gameId: 'test-game-123',
      analyticsGenerated: true
    }
  })
}));

describe('Analytics Routes', () => {
  // Test users
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    isAdmin: false
  };

  const adminUser = {
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    isAdmin: true
  };

  let userToken;
  let userId;
  let adminToken;
  let adminId;
  let gameId;

  beforeEach(async () => {
    // Create test user
    const user = await User.create(testUser);
    userId = user._id;
    userToken = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create admin user
    const admin = await User.create(adminUser);
    adminId = admin._id;
    adminToken = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create a test game
    const game = await Game.create({
      gameId: 'test-game-123',
      name: 'Test Game',
      createdBy: userId,
      contractAddress: '0x1234567890123456789012345678901234567890',
      status: 'Active',
      currentWeek: 3,
      configuration: {
        initialInventory: 12,
        demandPattern: 'Constant',
        orderDelay: 2,
        shippingDelay: 2
      },
      players: [
        {
          userId: userId,
          role: 'Retailer',
          username: 'testuser'
        }
      ]
    });

    gameId = game.gameId;

    // Create some game states
    await GameState.create({
      gameId,
      week: 0,
      playerStates: {
        retailer: { inventory: 12, backlog: 0 },
        wholesaler: { inventory: 12, backlog: 0 },
        distributor: { inventory: 12, backlog: 0 },
        factory: { inventory: 12, backlog: 0 }
      }
    });

    await GameState.create({
      gameId,
      week: 1,
      playerStates: {
        retailer: { inventory: 10, backlog: 0 },
        wholesaler: { inventory: 10, backlog: 0 },
        distributor: { inventory: 11, backlog: 0 },
        factory: { inventory: 10, backlog: 0 }
      }
    });

    await GameState.create({
      gameId,
      week: 2,
      playerStates: {
        retailer: { inventory: 8, backlog: 0 },
        wholesaler: { inventory: 8, backlog: 0 },
        distributor: { inventory: 10, backlog: 0 },
        factory: { inventory: 9, backlog: 0 }
      }
    });

    // Create some orders with proper capitalized roles and valid status
    await Order.create({
      gameId,
      week: 1,
      placedAt: new Date(),
      sender: {
        role: 'Retailer',
        userId: userId
      },
      recipient: {
        role: 'Wholesaler'
      },
      quantity: 5,
      status: 'Delivered', // Changed from 'completed' to 'Delivered'
      deliveryWeek: 3
    });

    await Order.create({
      gameId,
      week: 1,
      placedAt: new Date(),
      sender: {
        role: 'Wholesaler',
        userId: mongoose.Types.ObjectId()
      },
      recipient: {
        role: 'Distributor'
      },
      quantity: 6,
      status: 'Shipped', // Changed from 'completed' to 'Shipped'
      deliveryWeek: 3
    });
  });

  describe('GET /api/analytics/gameHistory/:gameId', () => {
    it('should get game history when user is a participant', async () => {
      const response = await request(app)
        .get(`/api/analytics/gameHistory/${gameId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('gameId', gameId);
      expect(response.body.data).toHaveProperty('currentWeek', 3);
      expect(response.body.data).toHaveProperty('weeklyData');
      expect(response.body.data.weeklyData).toHaveLength(3); // 3 weeks of data
      
      // Check the structure of weekly data
      expect(response.body.data.weeklyData[0]).toHaveProperty('week', 0);
      expect(response.body.data.weeklyData[0]).toHaveProperty('playerStates');
      expect(response.body.data.weeklyData[0]).toHaveProperty('orders');
    });

    it('should return 404 for non-existent game', async () => {
      const response = await request(app)
        .get('/api/analytics/gameHistory/nonexistent-game')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should deny access to users not part of the game', async () => {
      // Create another user not part of the game
      const anotherUser = await User.create({
        username: 'another',
        email: 'another@example.com',
        password: 'password123'
      });
      
      const anotherToken = jwt.sign(
        { id: anotherUser._id, username: anotherUser.username },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get(`/api/analytics/gameHistory/${gameId}`)
        .set('Authorization', `Bearer ${anotherToken}`);

      expect(response.statusCode).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/analytics/performance/:gameId', () => {
    it('should get performance metrics when user is a participant', async () => {
      const response = await request(app)
        .get(`/api/analytics/performance/${gameId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('gameId', gameId);
      expect(response.body.data).toHaveProperty('currentWeek', 3);
      expect(response.body.data).toHaveProperty('playerPerformance');
      expect(response.body.data).toHaveProperty('bullwhipMetrics');
      expect(response.body.data).toHaveProperty('blockchainMetrics');
      
      // Verify analytics service was called
      expect(analyticsService.getGameAnalytics).toHaveBeenCalledWith(gameId, false);
    });

    it('should force generate analytics when query parameter is provided', async () => {
      const response = await request(app)
        .get(`/api/analytics/performance/${gameId}?forceGenerate=true`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.statusCode).toBe(200);
      expect(analyticsService.getGameAnalytics).toHaveBeenCalledWith(gameId, true);
    });
  });

  describe('GET /api/analytics/aggregate', () => {
    it('should get aggregated analytics when user is admin', async () => {
      const response = await request(app)
        .get('/api/analytics/aggregate')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalGames', 10);
      expect(response.body.data).toHaveProperty('activeGames', 5);
      expect(response.body.data).toHaveProperty('rolePerformance');
      
      // Verify service was called
      expect(analyticsService.getAggregatedAnalytics).toHaveBeenCalled();
    });

    it('should accept date filters', async () => {
      const response = await request(app)
        .get('/api/analytics/aggregate?startDate=2023-01-01&endDate=2023-12-31')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.statusCode).toBe(200);
      expect(analyticsService.getAggregatedAnalytics).toHaveBeenCalledWith({
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      });
    });

    it('should deny access when user is not admin', async () => {
      const response = await request(app)
        .get('/api/analytics/aggregate')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.statusCode).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/analytics/generate/:gameId', () => {
    it('should generate analytics when user is game creator', async () => {
      const response = await request(app)
        .post(`/api/analytics/generate/${gameId}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data.data).toHaveProperty('gameId', gameId);
      expect(response.body.data.data).toHaveProperty('analyticsGenerated', true);
      
      // Verify service was called
      expect(analyticsService.generateGameAnalytics).toHaveBeenCalledWith(gameId);
    });
  });
}); 