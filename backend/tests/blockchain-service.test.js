const { ethers } = require('ethers');
const mongoose = require('mongoose');
const blockchainService = require('../services/blockchain');
const Game = require('../models/Game');
const Order = require('../models/Order');
const User = require('../models/User');

// Skip these tests if not in blockchain integration test mode
const runBlockchainTests = process.env.RUN_BLOCKCHAIN_TESTS === 'true';

// Define test-only configuration for local blockchain
// These should match your local Hardhat or Ganache instance
process.env.RPC_URL = process.env.TEST_RPC_URL || 'http://localhost:8545';
process.env.CHAIN_ID = process.env.TEST_CHAIN_ID || '1337';
process.env.PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Hardhat default first account
process.env.PLAYER_REGISTRY_ADDRESS = process.env.TEST_PLAYER_REGISTRY_ADDRESS;
process.env.GAME_FACTORY_ADDRESS = process.env.TEST_GAME_FACTORY_ADDRESS;

describe('Blockchain Service Integration', () => {
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
  
  beforeAll(async () => {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/beer-game-test');
    
    // Clean up database
    await Game.deleteMany({});
    await Order.deleteMany({});
    await User.deleteMany({});
    
    // Create a test user with wallet
    provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    playerAddress = wallet.address;
    
    // Initialize blockchain service
    await blockchainService.initialize();
    
    // Generate a unique game ID for testing
    gameId = `test-game-${Date.now()}`;
    
    console.log('Blockchain service test setup complete');
    console.log(`Using wallet address: ${playerAddress}`);
    console.log(`Using PlayerRegistry: ${process.env.PLAYER_REGISTRY_ADDRESS}`);
    console.log(`Using GameFactory: ${process.env.GAME_FACTORY_ADDRESS}`);
  });
  
  afterAll(async () => {
    // Disconnect from MongoDB
    await mongoose.disconnect();
  });
  
  it('should be initialized properly', () => {
    expect(blockchainService.isInitialized()).toBe(true);
    expect(blockchainService.provider).toBeDefined();
    expect(blockchainService.wallet).toBeDefined();
    expect(blockchainService.playerRegistry).toBeDefined();
    expect(blockchainService.gameFactory).toBeDefined();
  });
  
  it('should register a player', async () => {
    const username = 'testplayer';
    const result = await blockchainService.registerPlayer(username, playerAddress);
    
    expect(result.success).toBe(true);
    expect(result.transactionHash).toBeDefined();
    expect(result.blockNumber).toBeDefined();
    
    // Verify player was registered on-chain
    const playerDetails = await blockchainService.playerRegistry.getPlayerDetails(playerAddress);
    expect(playerDetails.registered).toBe(true);
    
    // Allow time for event processing
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, 30000); // Increase timeout for blockchain transactions
  
  it('should create a game', async () => {
    const result = await blockchainService.createGame(
      gameId,       // gameId
      2,            // orderDelay
      2,            // shippingDelay
      0,            // demandPattern (0=Constant)
      12            // initialInventory
    );
    
    expect(result.success).toBe(true);
    expect(result.gameId).toBe(gameId);
    expect(result.gameAddress).toBeDefined();
    expect(result.transactionHash).toBeDefined();
    expect(result.blockNumber).toBeDefined();
    
    // Save game address for later tests
    gameAddress = result.gameAddress;
    
    // Verify game was created on-chain
    const gameExists = await blockchainService.gameFactory.gameExists(gameId);
    expect(gameExists).toBe(true);
    
    // Allow time for event processing
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, 30000);
  
  it('should assign a role to a player', async () => {
    const result = await blockchainService.assignRole(
      gameId,
      playerAddress,
      1  // Role 1 = Retailer
    );
    
    expect(result.success).toBe(true);
    expect(result.transactionHash).toBeDefined();
    expect(result.blockNumber).toBeDefined();
    
    // Verify role was assigned on-chain
    const role = await blockchainService.playerRegistry.getPlayerRole(gameId, playerAddress);
    expect(role.toNumber()).toBe(1); // 1 = Retailer
    
    // Allow time for event processing
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, 30000);
  
  it('should start a game', async () => {
    const result = await blockchainService.startGame(gameAddress);
    
    expect(result.success).toBe(true);
    expect(result.transactionHash).toBeDefined();
    expect(result.blockNumber).toBeDefined();
    
    // Verify game was started on-chain
    const gameInstance = blockchainService.getGameInstance(gameAddress);
    const gameStarted = await gameInstance.gameStarted();
    expect(gameStarted).toBe(true);
    
    // Allow time for event processing
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, 30000);
  
  it('should place an order', async () => {
    const result = await blockchainService.placeOrder(
      gameAddress,
      1,  // senderRole (1 = Retailer)
      2,  // recipientRole (2 = Wholesaler)
      5   // quantity
    );
    
    expect(result.success).toBe(true);
    expect(result.orderId).toBeDefined();
    expect(result.transactionHash).toBeDefined();
    expect(result.blockNumber).toBeDefined();
    
    // Allow time for event processing
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, 30000);
  
  it('should advance the week', async () => {
    const result = await blockchainService.advanceWeek(gameAddress);
    
    expect(result.success).toBe(true);
    expect(result.transactionHash).toBeDefined();
    expect(result.blockNumber).toBeDefined();
    
    // Verify week was advanced on-chain
    const weekResult = await blockchainService.getCurrentWeek(gameAddress);
    expect(weekResult.success).toBe(true);
    expect(weekResult.currentWeek).toBe(1); // Week should be 1 after advancing
    
    // Allow time for event processing
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, 30000);
  
  it('should get player role', async () => {
    const result = await blockchainService.getPlayerRole(gameId, playerAddress);
    
    expect(result.success).toBe(true);
    expect(result.role).toBe(1); // 1 = Retailer
  });
  
  it('should get current week', async () => {
    const result = await blockchainService.getCurrentWeek(gameAddress);
    
    expect(result.success).toBe(true);
    expect(result.currentWeek).toBe(1);
  });
  
  it('should process events and update the database', async () => {
    // Give some time for events to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if game was created in the database
    const game = await Game.findOne({ gameId });
    expect(game).toBeDefined();
    expect(game.contractAddress).toBe(gameAddress);
    expect(game.status).toBe('Active');
    expect(game.currentWeek).toBe(1);
    
    // Check if we have at least one order
    const orderCount = await Order.countDocuments({ gameId });
    expect(orderCount).toBeGreaterThan(0);
  }, 10000);
}); 