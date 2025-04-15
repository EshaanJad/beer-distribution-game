const mongoose = require('mongoose');
const agentService = require('../services/agent');
const scheduler = require('../services/agent/scheduler');
const Game = require('../models/Game');
const User = require('../models/User');
const GameState = require('../models/GameState');

// Mock the agent service
jest.mock('../services/agent', () => ({
  makeAgentDecisions: jest.fn().mockResolvedValue({
    success: true,
    data: {
      gameId: 'test-game-1',
      week: 0,
      decisions: [
        { role: 'Retailer', orderQuantity: 6 },
        { role: 'Distributor', orderQuantity: 8 }
      ]
    }
  })
}));

// Mock the game coordinator
jest.mock('../services/gameCoordinator', () => ({
  advanceWeek: jest.fn().mockResolvedValue({
    success: true,
    data: {
      gameId: 'test-game-1',
      newWeek: 1
    }
  })
}));

describe('Autoplay Scheduler', () => {
  let testUser;
  let testGame;

  beforeEach(async () => {
    // Clean up any existing state
    scheduler.stopAllSchedulers();
    
    // Clean database collections for our test
    await User.deleteMany({});
    await Game.deleteMany({});
    await GameState.deleteMany({});

    // Create test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });

    // Create AI agent user
    const agentUser = await User.create({
      username: 'AI-Retailer',
      email: 'ai-retailer@beergame.ai',
      password: 'password123',
      walletAddress: '0x1234567890123456789012345678901234567890',
      isAgent: true
    });

    // Create test game with autoplay enabled
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
          autoAdvance: true,
          autoAdvanceInterval: 500,
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
      status: 'Active',
      players: [
        {
          userId: testUser._id,
          role: 'Wholesaler',
          joined: new Date(),
          isActive: true
        },
        {
          userId: agentUser._id,
          role: 'Retailer',
          joined: new Date(),
          isActive: true,
          isAgent: true
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
  });

  describe('Scheduler Initialization', () => {
    it('should initialize and find active games with autoplay enabled', async () => {
      await scheduler.initialize();
      
      expect(scheduler.initialized).toBe(true);
      expect(scheduler.scheduledGames.size).toBe(1);
      expect(scheduler.scheduledGames.has('test-game-1')).toBe(true);
    });
  });

  describe('Starting and Stopping Schedulers', () => {
    it('should start a scheduler for a game', async () => {
      const result = await scheduler.startScheduler('test-game-1');
      
      expect(result).toBe(true);
      expect(scheduler.scheduledGames.has('test-game-1')).toBe(true);
    });

    it('should stop a scheduler for a game', async () => {
      // Start the scheduler first
      await scheduler.startScheduler('test-game-1');
      
      // Then stop it
      const result = scheduler.stopScheduler('test-game-1');
      
      expect(result).toBe(true);
      expect(scheduler.scheduledGames.has('test-game-1')).toBe(false);
    });

    it('should stop all schedulers', async () => {
      // Start a scheduler
      await scheduler.startScheduler('test-game-1');
      
      // Stop all schedulers
      scheduler.stopAllSchedulers();
      
      expect(scheduler.scheduledGames.size).toBe(0);
    });
  });

  describe('Processing Autoplay Turns', () => {
    it('should process a single autoplay turn', async () => {
      const result = await scheduler.processAutoplayTurn('test-game-1');
      
      expect(result.success).toBe(true);
      expect(agentService.makeAgentDecisions).toHaveBeenCalledWith('test-game-1');
    });

    it('should stop the scheduler if the game is not found', async () => {
      const result = await scheduler.processAutoplayTurn('non-existent-game');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Game not found');
    });

    it('should stop the scheduler if the game is no longer active', async () => {
      // Change game status to completed
      await Game.findOneAndUpdate(
        { gameId: 'test-game-1' },
        { status: 'Completed' }
      );
      
      const result = await scheduler.processAutoplayTurn('test-game-1');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Game is not active (status: Completed)');
    });
  });
}); 