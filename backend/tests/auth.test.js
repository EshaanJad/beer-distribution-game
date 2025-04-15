const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

describe('Auth Routes', () => {
  // Test user
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
  };

  // Register a user for tests that need authentication
  let token;
  let userId;

  beforeEach(async () => {
    // Create a test user for authentication tests
    const user = await User.create(testUser);
    userId = user._id;
    token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const newUser = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('username', newUser.username);
      expect(response.body.data).toHaveProperty('email', newUser.email);
      expect(response.body.data).toHaveProperty('token');

      // Check if user was created in database
      const user = await User.findOne({ email: newUser.email });
      expect(user).toBeTruthy();
      expect(user.username).toBe(newUser.username);
    });

    it('should not register a user with duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should not register a user with invalid data', async () => {
      const invalidUser = {
        username: '',
        email: 'notanemail',
        password: 'short',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUser);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login a user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('username', testUser.username);
      expect(response.body.data).toHaveProperty('email', testUser.email);
      expect(response.body.data).toHaveProperty('token');
    });

    it('should not login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should not login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        });

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get the current user profile when authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('username', testUser.username);
      expect(response.body.data).toHaveProperty('email', testUser.email);
    });

    it('should deny access without a token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access with an invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/auth/wallet', () => {
    it('should authenticate with a valid wallet signature', async () => {
      // Mock the ethers library for the wallet test
      jest.mock('ethers', () => {
        return {
          ethers: {
            Wallet: {
              createRandom: jest.fn().mockImplementation(() => ({
                address: '0x1234567890abcdef1234567890abcdef12345678',
                signMessage: jest.fn().mockResolvedValue('0xmockedsignature')
              }))
            },
            utils: {
              verifyMessage: jest.fn().mockReturnValue('0x1234567890abcdef1234567890abcdef12345678')
            }
          }
        };
      });

      // Use the mocked ethers
      const { ethers } = require('ethers');
      
      // Create a wallet with the mocked function
      const wallet = {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        signMessage: jest.fn().mockResolvedValue('0xmockedsignature')
      };
      
      const message = "Sign this message to authenticate with the Beer Distribution Game";
      const signature = '0xmockedsignature';

      const response = await request(app)
        .post('/api/auth/wallet')
        .send({
          signature,
          message,
          walletAddress: wallet.address
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('walletAddress', wallet.address);
      expect(response.body.data).toHaveProperty('token');
      
      // Restore mocks
      jest.restoreAllMocks();
      jest.resetModules();
    });
  });
}); 