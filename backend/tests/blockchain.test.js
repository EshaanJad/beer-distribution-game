const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Game = require('../models/Game');
const jwt = require('jsonwebtoken');
const synchronizationService = require('../services/synchronization');

// Mock the synchronization service
jest.mock('../services/synchronization', () => ({
  runFullSynchronization: jest.fn().mockResolvedValue({
    success: true,
    data: {
      gamesProcessed: 1,
      ordersProcessed: 2,
      errors: []
    }
  }),
  getPendingOrdersCount: jest.fn().mockResolvedValue(3)
}));

describe('Blockchain Routes', () => {
  // Test user and admin
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
      players: [
        {
          userId: userId,
          role: 'Retailer',
          username: 'testuser'
        }
      ],
      currentWeek: 1,
      lastSynced: new Date()
    });

    gameId = game.gameId;
  });

  describe('POST /api/blockchain/sync/:gameId', () => {
    it('should sync a game when user is a participant', async () => {
      const response = await request(app)
        .post(`/api/blockchain/sync/${gameId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('gamesProcessed', 1);
      expect(synchronizationService.runFullSynchronization).toHaveBeenCalledWith(gameId);
    });

    it('should return 404 for non-existent game', async () => {
      const response = await request(app)
        .post('/api/blockchain/sync/nonexistent-game')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post(`/api/blockchain/sync/${gameId}`);

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/blockchain/sync-all', () => {
    it('should sync all games when user is admin', async () => {
      const response = await request(app)
        .post('/api/blockchain/sync-all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(synchronizationService.runFullSynchronization).toHaveBeenCalled();
    });

    it('should deny access when user is not admin', async () => {
      const response = await request(app)
        .post('/api/blockchain/sync-all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.statusCode).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/blockchain/status/:gameId', () => {
    it('should get blockchain status when user is a participant', async () => {
      const response = await request(app)
        .get(`/api/blockchain/status/${gameId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('gameId', gameId);
      expect(response.body.data).toHaveProperty('contractAddress', '0x1234567890123456789012345678901234567890');
      expect(response.body.data).toHaveProperty('pendingOrdersCount', 3);
      expect(synchronizationService.getPendingOrdersCount).toHaveBeenCalledWith(gameId);
    });

    it('should return 404 for non-existent game', async () => {
      const response = await request(app)
        .get('/api/blockchain/status/nonexistent-game')
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
        .get(`/api/blockchain/status/${gameId}`)
        .set('Authorization', `Bearer ${anotherToken}`);

      expect(response.statusCode).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });
}); 