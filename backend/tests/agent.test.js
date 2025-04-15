const mongoose = require('mongoose');
const agentService = require('../services/agent');
const User = require('../models/User');
const Game = require('../models/Game');
const GameState = require('../models/GameState');
const Order = require('../models/Order');
const { ethers } = require('ethers');

// Mock gameCoordinator and blockchain services
jest.mock('../services/gameCoordinator', () => ({
  processOrder: jest.fn().mockResolvedValue({
    success: true,
    data: {
      orderId: 'test-order-id',
      quantity: 5
    }
  })
}));

jest.mock('../services/blockchain', () => ({
  registerPlayer: jest.fn().mockResolvedValue({ success: true }),
  assignRole: jest.fn().mockResolvedValue({ success: true })
}));

describe('Agent Service', () => {
  // Create test user
  let testUser;
  let testGame;

  beforeAll(async () => {
    // Initialize agent service
    await agentService.initialize();
  });

  beforeEach(async () => {
    // Clean database collections for our test
    await User.deleteMany({});
    await Game.deleteMany({});
    await GameState.deleteMany({});
    await Order.deleteMany({});

    // Create test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });

    // Create test game
    testGame = await Game.create({
      gameId: 'test-game-1',
      createdBy: testUser._id,
      configuration: {
        orderDelay: 2,
        shippingDelay: 2,
        demandPattern: 'Constant',
        initialInventory: 12,
        blockchainEnabled: true,
        agents: {
          enabled: true,
          autoplay: true,
          fillEmptyRoles: true,
          algorithmConfig: {
            forecastHorizon: 4,
            safetyFactor: 0.5,
            visibilityMode: 'traditional'
          },
          roles: {
            retailer: true,
            wholesaler: false,
            distributor: true,
            factory: false
          }
        }
      },
      status: 'Setup',
      players: [
        {
          userId: testUser._id,
          role: 'Wholesaler',
          joined: new Date(),
          isActive: true
        }
      ]
    });

    // Create initial game state
    await GameState.create({
      gameId: 'test-game-1',
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
      }
    });

    // Add some orders
    await Order.create({
      gameId: 'test-game-1',
      week: 0,
      sender: {
        role: 'Customer',
      },
      recipient: {
        role: 'Retailer'
      },
      quantity: 4,
      status: 'Delivered',
      placedAt: new Date(),
      deliveryWeek: 0
    });
  });

  describe('Agent Wallet Generation', () => {
    it('should generate a valid Ethereum wallet', () => {
      const wallet = agentService.createAgentWallet('test-agent-id');
      
      expect(wallet).toBeDefined();
      expect(wallet.address).toBeDefined();
      expect(wallet.privateKey).toBeDefined();
      expect(ethers.utils.isAddress(wallet.address)).toBe(true);
    });
  });

  describe('Agent Registration', () => {
    it('should register an agent for a specific role', async () => {
      const result = await agentService.registerAgent('test-game-1', 'Retailer');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.role).toBe('Retailer');
      expect(result.data.username).toBeDefined();
      expect(result.data.walletAddress).toBeDefined();
      
      // Verify user was created
      const user = await User.findById(result.data.userId);
      expect(user).toBeDefined();
      expect(user.isAgent).toBe(true);
      expect(user.walletAddress).toBe(result.data.walletAddress);
    });
  });

  describe('Base-Stock Policy Algorithm', () => {
    it('should calculate proper order quantities using the Modified Base-Stock Policy', async () => {
      // Register an agent
      const registration = await agentService.registerAgent('test-game-1', 'Retailer', {
        forecastHorizon: 4,
        safetyFactor: 0.5,
        visibilityMode: 'traditional'
      });
      
      expect(registration.success).toBe(true);
      
      // Create game state and orders for testing
      const gameState = await GameState.findOne({ gameId: 'test-game-1', week: 0 });
      const orders = await Order.find({ gameId: 'test-game-1' });
      
      // Calculate order quantity
      const orderQuantity = await agentService.calculateOrderQuantity(
        'test-game-1',
        'Retailer',
        gameState,
        orders,
        {
          forecastHorizon: 4,
          safetyFactor: 0.5,
          visibilityMode: 'traditional'
        }
      );
      
      // With initial inventory of 12, customer demand of 4,
      // and forecast horizon of 4, algorithm should target:
      // target = avgDemand * forecastHorizon + safetyFactor * avgDemand
      // target = 4 * 4 + 0.5 * 4 = 18
      // order = target - inventory = 18 - 12 = 6
      expect(orderQuantity).toBe(6);
    });
  });

  describe('Game Agents Setup', () => {
    it('should set up agents for a game based on configuration', async () => {
      const result = await agentService.setupGameAgents('test-game-1');
      
      expect(result.success).toBe(true);
      // There should be registered agents, the exact number may vary
      expect(result.data.registeredAgents.length).toBeGreaterThan(0);
      
      // Check that agents are added to the game
      const game = await Game.findOne({ gameId: 'test-game-1' });
      
      // Should have more than the original number of players (1 human + AI agents)
      expect(game.players.length).toBeGreaterThan(1);
      
      // Verify agent roles
      const agentRoles = game.players
        .filter(player => player.isAgent)
        .map(player => player.role)
        .sort();
      
      // Should include our expected roles
      expect(agentRoles.includes('Retailer')).toBe(true);
      expect(agentRoles.includes('Distributor')).toBe(true);
    });
  });

  describe('Agent Decision Making', () => {
    it('should make decisions for all agents in a game', async () => {
      // Set up agents
      await agentService.setupGameAgents('test-game-1');
      
      // Activate the game
      testGame.status = 'Active';
      await testGame.save();
      
      // Make decisions
      const decisions = await agentService.makeAgentDecisions('test-game-1');
      
      expect(decisions.success).toBe(true);
      expect(decisions.data.decisions.length).toBe(2); // Retailer and Distributor
      
      // Check that decisions include the expected roles
      const decisionRoles = decisions.data.decisions.map(d => d.role).sort();
      expect(decisionRoles).toEqual(['Distributor', 'Retailer']);
      
      // Verify order quantities follow the algorithm
      const retailerDecision = decisions.data.decisions.find(d => d.role === 'Retailer');
      expect(retailerDecision.orderQuantity).toBeDefined();
    });
  });
}); 