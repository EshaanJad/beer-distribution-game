const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Ensure JWT_SECRET is set for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_for_testing_purposes_only';

// Create a .env.test file before running tests if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('.env.test')) {
  fs.writeFileSync('.env.test', `
    MONGODB_URI=mongodb://localhost:27017/test
    JWT_SECRET=test_secret_key_for_testing_purposes_only
    JWT_EXPIRE=1h
    PLAYER_REGISTRY_ADDRESS=0x0000000000000000000000000000000000000000
    GAME_FACTORY_ADDRESS=0x0000000000000000000000000000000000000000
    RPC_URL=http://localhost:8545
    CHAIN_ID=1337
    PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000001
    FRONTEND_URL=http://localhost:3000
  `.trim());
}

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn()
}));

let mongoServer;

// Connect to the in-memory database before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
  
  // Log environment variables in test mode for debugging
  console.log('Running in test mode with JWT_SECRET:', process.env.JWT_SECRET);
});

// Clear the database between tests
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Disconnect and close connection after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Mock socket.io
jest.mock('socket.io', () => {
  const mockOn = jest.fn();
  const mockTo = jest.fn().mockReturnThis();
  const mockEmit = jest.fn();
  
  return jest.fn().mockImplementation(() => ({
    on: mockOn,
    to: mockTo,
    emit: mockEmit,
  }));
});

// Mock the blockchain service
jest.mock('../services/blockchain', () => ({
  initialize: jest.fn().mockResolvedValue(true),
  isInitialized: jest.fn().mockReturnValue(true),
  setWebSocketService: jest.fn(),
  createGame: jest.fn().mockImplementation(() => ({
    success: true,
    gameAddress: '0x1234567890123456789012345678901234567890',
    transactionHash: '0xabcdef1234567890',
  })),
  assignRole: jest.fn().mockImplementation(() => ({
    success: true,
    transactionHash: '0xabcdef1234567890',
  })),
  startGame: jest.fn().mockImplementation(() => ({
    success: true,
    transactionHash: '0xabcdef1234567890',
  })),
  placeOrder: jest.fn().mockImplementation(() => ({
    success: true,
    orderId: 1,
    transactionHash: '0xabcdef1234567890',
  })),
  advanceWeek: jest.fn().mockImplementation(() => ({
    success: true,
    transactionHash: '0xabcdef1234567890',
  })),
}));

// Mock the gameCoordinator service
jest.mock('../services/gameCoordinator', () => ({
  setWebSocketService: jest.fn(),
  createGame: jest.fn().mockImplementation((config, creator) => ({
    success: true,
    data: {
      gameId: 'test-game-id',
      createdBy: creator._id,
      configuration: config,
      contractAddress: '0x1234567890123456789012345678901234567890',
      blockchain: {
        contractAddress: '0x1234567890123456789012345678901234567890',
        transactionHash: '0xabcdef1234567890'
      }
    }
  })),
  joinGame: jest.fn().mockImplementation((gameId, playerInfo, user) => ({
    success: true,
    data: {
      gameId,
      role: playerInfo.role,
      allRolesFilled: false
    }
  })),
  startGame: jest.fn().mockImplementation((gameId) => ({
    success: true,
    data: {
      gameId,
      status: 'Active',
      currentWeek: 0,
      playerStates: {
        retailer: { inventory: 12, backlog: 0 },
        wholesaler: { inventory: 12, backlog: 0 },
        distributor: { inventory: 12, backlog: 0 },
        factory: { inventory: 12, backlog: 0 }
      }
    }
  })),
  processOrder: jest.fn().mockImplementation((gameId, senderRole, recipientRole, quantity, user) => ({
    success: true,
    data: {
      orderId: 'test-order-id',
      sender: {
        role: senderRole,
        userId: user._id
      },
      recipient: {
        role: recipientRole
      },
      quantity
    }
  })),
  advanceWeek: jest.fn().mockImplementation((gameId) => ({
    success: true,
    data: {
      gameId,
      currentWeek: 1
    }
  }))
})); 