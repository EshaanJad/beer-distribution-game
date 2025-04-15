const mongoose = require('mongoose');
const { ethers } = require('ethers');
const Game = require('../models/Game');
const Order = require('../models/Order');
const User = require('../models/User');
const GameState = require('../models/GameState');
const blockchainService = require('../services/blockchain');
const synchronizationService = require('../services/synchronization');

// Skip these tests if not in blockchain integration test mode
const runBlockchainTests = process.env.RUN_BLOCKCHAIN_TESTS === 'true';

// Define test-only configuration for local blockchain
// These should match your local Hardhat or Ganache instance
process.env.RPC_URL = process.env.TEST_RPC_URL || 'http://localhost:8545';
process.env.CHAIN_ID = process.env.TEST_CHAIN_ID || '1337';
process.env.PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Hardhat default first account
process.env.PLAYER_REGISTRY_ADDRESS = process.env.TEST_PLAYER_REGISTRY_ADDRESS;
process.env.GAME_FACTORY_ADDRESS = process.env.TEST_GAME_FACTORY_ADDRESS;

describe('Synchronization Service Integration', () => {
  // Only run these tests if explicitly enabled
  if (!runBlockchainTests) {
    it('Blockchain integration tests are skipped (set RUN_BLOCKCHAIN_TESTS=true to enable)', () => {
      console.log('Blockchain integration tests are skipped. Set RUN_BLOCKCHAIN_TESTS=true to enable them.');
      expect(true).toBe(true);
    });
    return;
  }
  
  let wallet;
  let provider;
  let gameId;
  let gameAddress;
  let playerAddress;
  let user;
  
  beforeAll(async () => {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/beer-game-test');
    
    // Clean up database
    await Game.deleteMany({});
    await Order.deleteMany({});
    await User.deleteMany({});
    await GameState.deleteMany({});
    
    // Create a test user with wallet
    provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    playerAddress = wallet.address;
    
    // Initialize blockchain service
    await blockchainService.initialize();
    
    // Set blockchain service for synchronization
    synchronizationService.setBlockchainService(blockchainService);
    
    // Generate a unique game ID for testing
    gameId = `sync-test-game-${Date.now()}`;
    
    // Create user in database
    user = await User.create({
      username: 'syncplayer',
      email: 'sync@example.com',
      password: 'password123',
      walletAddress: playerAddress
    });
    
    console.log('Synchronization service test setup complete');
    console.log(`Using wallet address: ${playerAddress}`);
    console.log(`Using PlayerRegistry: ${process.env.PLAYER_REGISTRY_ADDRESS}`);
    console.log(`Using GameFactory: ${process.env.GAME_FACTORY_ADDRESS}`);
  });
  
  afterAll(async () => {
    // Disconnect from MongoDB
    await mongoose.disconnect();
  });
  
  it('should setup the test environment', async () => {
    // Register player on blockchain
    const registerResult = await blockchainService.registerPlayer('syncplayer', playerAddress);
    expect(registerResult.success).toBe(true);
    
    // Create a game on blockchain
    const createResult = await blockchainService.createGame(
      gameId,       // gameId
      2,            // orderDelay
      2,            // shippingDelay
      0,            // demandPattern (0=Constant)
      12            // initialInventory
    );
    expect(createResult.success).toBe(true);
    gameAddress = createResult.gameAddress;
    
    // Create a game in database
    const game = await Game.create({
      gameId,
      createdBy: user._id,
      status: 'Setup', // Start as Setup, should be updated to Active
      configuration: {
        orderDelay: 2,
        shippingDelay: 2,
        demandPattern: 'Constant',
        initialInventory: 12,
        blockchainEnabled: true
      },
      players: []
    });
    
    // Assign player role on blockchain
    const assignResult = await blockchainService.assignRole(
      gameId,
      playerAddress,
      1  // Role 1 = Retailer
    );
    expect(assignResult.success).toBe(true);
    
    // Start game on blockchain
    const startResult = await blockchainService.startGame(gameAddress);
    expect(startResult.success).toBe(true);
    
    // Place an order on blockchain
    const orderResult = await blockchainService.placeOrder(
      gameAddress,
      1,  // senderRole (1 = Retailer)
      2,  // recipientRole (2 = Wholesaler)
      5   // quantity
    );
    expect(orderResult.success).toBe(true);
    
    // Create order in database that needs blockchain sync
    await Order.create({
      gameId,
      week: 0,
      sender: {
        role: 'Retailer',
        userId: user._id
      },
      recipient: {
        role: 'Wholesaler'
      },
      quantity: 5,
      status: 'Pending',
      placedAt: new Date()
    });
    
    // Allow time for events to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, 60000);
  
  it('should sync game data with blockchain', async () => {
    // Run synchronization for the game
    const result = await synchronizationService.syncGameWithBlockchain(gameId);
    
    expect(result.success).toBe(true);
    expect(result.gameId).toBe(gameId);
    expect(result.status).toBe('Active');
    
    // Check if game was updated in database
    const game = await Game.findOne({ gameId });
    expect(game).toBeDefined();
    expect(game.contractAddress).toBe(gameAddress);
    expect(game.status).toBe('Active');
    expect(game.lastSynced).toBeDefined();
  }, 30000);
  
  it('should sync orders with blockchain', async () => {
    // Run order synchronization
    const result = await synchronizationService.syncOrdersWithBlockchain(gameId);
    
    expect(result.success).toBe(true);
    expect(result.gameId).toBe(gameId);
    
    // Check if orders were updated in database
    const orders = await Order.find({ gameId });
    expect(orders.length).toBeGreaterThan(0);
    
    // Check if at least one order is synced with blockchain
    const syncedOrders = orders.filter(order => 
      order.blockchainData && order.blockchainData.confirmed === true
    );
    expect(syncedOrders.length).toBeGreaterThan(0);
  }, 30000);
  
  it('should run full synchronization', async () => {
    // Advance week on blockchain
    const advanceResult = await blockchainService.advanceWeek(gameAddress);
    expect(advanceResult.success).toBe(true);
    
    // Run full synchronization
    const result = await synchronizationService.runFullSynchronization(gameId);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.gamesProcessed).toBe(1);
    
    // Check if game week was updated
    const game = await Game.findOne({ gameId });
    expect(game.currentWeek).toBe(1);
  }, 30000);
  
  it('should count pending orders correctly', async () => {
    // Create a new order that needs sync
    await Order.create({
      gameId,
      week: 1,
      sender: {
        role: 'Retailer',
        userId: user._id
      },
      recipient: {
        role: 'Wholesaler'
      },
      quantity: 3,
      status: 'Pending',
      placedAt: new Date()
    });
    
    // Get pending orders count
    const count = await synchronizationService.getPendingOrdersCount(gameId);
    
    // At least one pending order should exist
    expect(count).toBeGreaterThan(0);
  });
}); 