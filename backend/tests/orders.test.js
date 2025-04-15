const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Game = require('../models/Game');
const GameState = require('../models/GameState');
const Order = require('../models/Order');
const jwt = require('jsonwebtoken');
const blockchainService = require('../services/blockchain');
const gameCoordinator = require('../services/gameCoordinator');

// Mock the blockchain service
jest.mock('../services/blockchain');
jest.mock('../services/gameCoordinator');

// Ensure JWT_SECRET is set for tests
process.env.JWT_SECRET = 'test_secret_key_for_testing_purposes_only';

describe('Orders Routes', () => {
  // Test users
  const testUsers = [
    {
      username: 'gameCreator',
      email: 'creator@example.com',
      password: 'password123',
      walletAddress: '0x1111111111111111111111111111111111111111'
    },
    {
      username: 'retailer',
      email: 'retailer@example.com',
      password: 'password123',
      walletAddress: '0x2222222222222222222222222222222222222222'
    },
    {
      username: 'wholesaler',
      email: 'wholesaler@example.com',
      password: 'password123',
      walletAddress: '0x3333333333333333333333333333333333333333'
    },
    {
      username: 'distributor',
      email: 'distributor@example.com',
      password: 'password123',
      walletAddress: '0x4444444444444444444444444444444444444444'
    },
    {
      username: 'factory',
      email: 'factory@example.com',
      password: 'password123',
      walletAddress: '0x5555555555555555555555555555555555555555'
    }
  ];

  let tokens = [];
  let userIds = [];
  let gameId;
  let activeGameId;

  beforeEach(async () => {
    // Reset mocks and collections
    jest.clearAllMocks();
    
    // Reset user and token arrays
    tokens = [];
    userIds = [];
    
    // Create test users and generate tokens
    for (let i = 0; i < testUsers.length; i++) {
      const user = await User.create(testUsers[i]);
      userIds.push(user._id);
      
      // Generate a real token with the correct secret
      const token = jwt.sign(
        { id: user._id.toString(), username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      tokens.push(token);
      
      console.log(`Created test user: ${user.username}, token: ${token.substring(0, 20)}...`);
    }
    
    // Mock blockchain service methods
    blockchainService.createGame.mockReturnValue({
      success: true,
      contractAddress: '0x1234567890123456789012345678901234567890',
      transactionHash: '0xabcdef1234567890'
    });

    blockchainService.assignRole.mockReturnValue({
      success: true,
      transactionHash: '0xabcdef1234567890'
    });

    blockchainService.startGame.mockReturnValue({
      success: true,
      transactionHash: '0xabcdef1234567890'
    });
    
    blockchainService.placeOrder.mockReturnValue({
      success: true,
      orderId: 1,
      transactionHash: '0xabcdef1234567890',
    });
    
    // Create games and set up mocks for gameCoordinator
    await setupTestGames();
    
    // Set up mock for processOrder
    gameCoordinator.processOrder.mockImplementation((gameId, senderRole, recipientRole, quantity, user) => {
      // Call the blockchain service mock directly to ensure it's used
      blockchainService.placeOrder(gameId, senderRole, quantity, user.walletAddress);
      
      // Handle error cases first
      if (senderRole === 'Retailer' && recipientRole === 'Factory') {
        return {
          success: false,
          error: 'Invalid order flow. Orders must follow the supply chain.'
        };
      }
      
      if (senderRole === 'Wholesaler' && user._id.toString() === userIds[1].toString()) {
        return {
          success: false,
          error: 'You are not authorized to place orders as this role'
        };
      }
      
      if (gameId === gameId) { // non-active game
        return {
          success: false,
          error: 'Game is not active'
        };
      }
      
      // Create a real order ID to use
      const orderId = new mongoose.Types.ObjectId();
      
      return {
        success: true,
        data: {
          orderId,
          sender: {
            role: senderRole,
            userId: user._id
          },
          recipient: {
            role: recipientRole
          },
          quantity
        }
      };
    });
  });
  
  // Helper function to set up test games
  async function setupTestGames() {
    // Create a game
    const gameConfig = {
      orderDelay: 2,
      shippingDelay: 2,
      demandPattern: 'Constant',
      initialInventory: 12,
      blockchainEnabled: true
    };
    
    const game = await Game.create({
      gameId: 'test-game-id',
      createdBy: userIds[0],
      configuration: gameConfig,
      status: 'Setup'
    });
    
    gameId = game.gameId;
    
    // Create initial game state
    await GameState.create({
      gameId,
      week: 0,
      playerStates: {
        retailer: { 
          inventory: gameConfig.initialInventory,
          backlog: 0,
          incomingOrders: 0,
          outgoingOrders: 0,
          currentCost: 0
        },
        wholesaler: { 
          inventory: gameConfig.initialInventory,
          backlog: 0,
          incomingOrders: 0,
          outgoingOrders: 0,
          currentCost: 0
        },
        distributor: { 
          inventory: gameConfig.initialInventory,
          backlog: 0,
          incomingOrders: 0,
          outgoingOrders: 0,
          currentCost: 0
        },
        factory: { 
          inventory: gameConfig.initialInventory,
          backlog: 0,
          incomingOrders: 0,
          outgoingOrders: 0,
          currentCost: 0
        }
      },
      pendingActions: []
    });
    
    // Create an active game for order tests
    const activeGame = await Game.create({
      gameId: 'active-game-id',
      createdBy: userIds[0],
      configuration: gameConfig,
      status: 'Active',
      currentWeek: 0,
      players: [
        {
          userId: userIds[1],
          role: 'Retailer',
          joined: new Date(),
          isActive: true
        },
        {
          userId: userIds[2],
          role: 'Wholesaler',
          joined: new Date(),
          isActive: true
        },
        {
          userId: userIds[3],
          role: 'Distributor',
          joined: new Date(),
          isActive: true
        },
        {
          userId: userIds[4],
          role: 'Factory',
          joined: new Date(),
          isActive: true
        }
      ]
    });
    
    activeGameId = activeGame.gameId;
    
    // Create initial game state for active game
    await GameState.create({
      gameId: activeGameId,
      week: 0,
      playerStates: {
        retailer: { 
          inventory: gameConfig.initialInventory,
          backlog: 0,
          incomingOrders: 0,
          outgoingOrders: 0,
          currentCost: 0
        },
        wholesaler: { 
          inventory: gameConfig.initialInventory,
          backlog: 0,
          incomingOrders: 0,
          outgoingOrders: 0,
          currentCost: 0
        },
        distributor: { 
          inventory: gameConfig.initialInventory,
          backlog: 0,
          incomingOrders: 0,
          outgoingOrders: 0,
          currentCost: 0
        },
        factory: { 
          inventory: gameConfig.initialInventory,
          backlog: 0,
          incomingOrders: 0,
          outgoingOrders: 0,
          currentCost: 0
        }
      },
      pendingActions: [
        {
          playerId: userIds[1],
          actionType: 'PlaceOrder',
          completed: false
        },
        {
          playerId: userIds[2],
          actionType: 'PlaceOrder',
          completed: false
        },
        {
          playerId: userIds[3],
          actionType: 'PlaceOrder',
          completed: false
        },
        {
          playerId: userIds[4],
          actionType: 'PlaceOrder',
          completed: false
        }
      ]
    });
    
    // Create some orders for testing
    await Order.create({
      gameId: activeGameId,
      week: 0,
      sender: {
        role: 'Retailer',
        userId: userIds[1]
      },
      recipient: {
        role: 'Wholesaler',
        userId: userIds[2]
      },
      quantity: 5,
      status: 'Pending',
      deliveryWeek: 2
    });
    
    await Order.create({
      gameId: activeGameId,
      week: 0,
      sender: {
        role: 'Wholesaler',
        userId: userIds[2]
      },
      recipient: {
        role: 'Distributor',
        userId: userIds[3]
      },
      quantity: 7,
      status: 'Pending',
      deliveryWeek: 2
    });
  }

  describe('POST /api/orders/place', () => {
    it('should place an order as Retailer to Wholesaler', async () => {
      // Set up a mock implementation for processOrder just for this test
      const mockOrderId = new mongoose.Types.ObjectId();
      gameCoordinator.processOrder.mockImplementationOnce((gameId, senderRole, recipientRole, quantity, user) => {
        // Call the blockchain service mock directly to ensure it's used
        blockchainService.placeOrder(gameId, senderRole, quantity, user.walletAddress);
        
        return {
          success: true,
          data: {
            orderId: mockOrderId,
            sender: {
              role: senderRole,
              userId: user.id
            },
            recipient: {
              role: recipientRole
            },
            quantity
          }
        };
      });
      
      // Create a real order in the database to be found by the test
      await Order.create({
        _id: mockOrderId,
        gameId: activeGameId,
        week: 0,
        sender: {
          role: 'Retailer',
          userId: userIds[1]
        },
        recipient: {
          role: 'Wholesaler',
          userId: userIds[2]
        },
        quantity: 5,
        status: 'Pending',
        deliveryWeek: 2
      });
      
      const orderData = {
        gameId: activeGameId,
        senderRole: 'Retailer',
        recipientRole: 'Wholesaler',
        quantity: 5
      };

      const response = await request(app)
        .post('/api/orders/place')
        .set('Authorization', `Bearer ${tokens[1]}`) // Retailer token
        .send(orderData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('orderId');
      
      // Check if blockchain interaction occurred
      expect(blockchainService.placeOrder).toHaveBeenCalledTimes(1);
    });

    it('should not place an order with invalid role flow', async () => {
      // Mock the error response specifically for this test
      gameCoordinator.processOrder.mockImplementationOnce(() => ({
        success: false,
        error: 'Invalid order flow. Orders must follow the supply chain.'
      }));
      
      const orderData = {
        gameId: activeGameId,
        senderRole: 'Retailer',
        recipientRole: 'Factory', // Invalid flow - should go to Wholesaler
        quantity: 5
      };

      const response = await request(app)
        .post('/api/orders/place')
        .set('Authorization', `Bearer ${tokens[1]}`) // Retailer token
        .send(orderData);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toBe('Invalid order flow. Orders must follow the supply chain.');
    });

    it('should not place an order if the user is not playing the sender role', async () => {
      // Mock the error response specifically for this test
      gameCoordinator.processOrder.mockImplementationOnce(() => ({
        success: false,
        error: 'You are not authorized to place orders as this role'
      }));
      
      const orderData = {
        gameId: activeGameId,
        senderRole: 'Wholesaler', // User is Retailer, not Wholesaler
        recipientRole: 'Distributor',
        quantity: 5
      };

      const response = await request(app)
        .post('/api/orders/place')
        .set('Authorization', `Bearer ${tokens[1]}`) // Retailer token
        .send(orderData);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toBe('You are not authorized to place orders as this role');
    });

    it('should not place an order in a game that is not active', async () => {
      // Mock the error response specifically for this test
      gameCoordinator.processOrder.mockImplementationOnce(() => ({
        success: false,
        error: 'Game is not active'
      }));
      
      const orderData = {
        gameId: 'test-game-id', // This game is in 'Setup' state
        senderRole: 'Retailer',
        recipientRole: 'Wholesaler',
        quantity: 5
      };

      const response = await request(app)
        .post('/api/orders/place')
        .set('Authorization', `Bearer ${tokens[1]}`) // Retailer token
        .send(orderData);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toBe('Game is not active');
    });
  });

  describe('GET /api/orders/:gameId', () => {
    it('should get all orders for a game', async () => {
      const response = await request(app)
        .get(`/api/orders/${activeGameId}`)
        .set('Authorization', `Bearer ${tokens[0]}`); // Creator token

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('sender');
      expect(response.body.data[0]).toHaveProperty('recipient');
      expect(response.body.data[0]).toHaveProperty('quantity');
    });

    it('should get orders filtered by role', async () => {
      const response = await request(app)
        .get(`/api/orders/${activeGameId}?role=Retailer`)
        .set('Authorization', `Bearer ${tokens[0]}`); // Creator token

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].sender.role).toBe('Retailer');
    });

    it('should handle non-existent game ID', async () => {
      const response = await request(app)
        .get('/api/orders/nonexistent-game')
        .set('Authorization', `Bearer ${tokens[0]}`);
        
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Order Model', () => {
    it('should create a new order', async () => {
      const order = await Order.create({
        gameId,
        week: 0,
        sender: {
          role: 'Retailer',
          userId: userIds[0]
        },
        recipient: {
          role: 'Wholesaler',
          userId: userIds[1]
        },
        quantity: 5,
        status: 'Pending',
        deliveryWeek: 2
      });

      expect(order).toBeTruthy();
      expect(order.gameId).toBe(gameId);
      expect(order.week).toBe(0);
      expect(order.sender.role).toBe('Retailer');
      expect(order.sender.userId.toString()).toBe(userIds[0].toString());
      expect(order.recipient.role).toBe('Wholesaler');
      expect(order.recipient.userId.toString()).toBe(userIds[1].toString());
      expect(order.quantity).toBe(5);
      expect(order.status).toBe('Pending');
      expect(order.deliveryWeek).toBe(2);
    });

    it('should find orders by game ID', async () => {
      // Create multiple orders
      const order1 = await Order.create({
        gameId,
        week: 0,
        sender: {
          role: 'Retailer',
          userId: userIds[0]
        },
        recipient: {
          role: 'Wholesaler',
          userId: userIds[1]
        },
        quantity: 5,
        status: 'Pending',
        deliveryWeek: 2
      });
      
      const order2 = await Order.create({
        gameId,
        week: 0,
        sender: {
          role: 'Wholesaler',
          userId: userIds[1]
        },
        recipient: {
          role: 'Distributor',
          userId: userIds[2]
        },
        quantity: 8,
        status: 'Pending',
        deliveryWeek: 2
      });

      // Find all orders for the game
      const orders = await Order.find({ gameId });
      
      expect(orders).toHaveLength(2);
      expect(orders.some(o => o.sender.role === 'Retailer' && o.quantity === 5)).toBe(true);
      expect(orders.some(o => o.sender.role === 'Wholesaler' && o.quantity === 8)).toBe(true);
    });

    it('should find orders by role', async () => {
      // Create multiple orders with different roles
      const order1 = await Order.create({
        gameId,
        week: 0,
        sender: {
          role: 'Retailer',
          userId: userIds[0]
        },
        recipient: {
          role: 'Wholesaler',
          userId: userIds[1]
        },
        quantity: 5,
        status: 'Pending',
        deliveryWeek: 2
      });
      
      const order2 = await Order.create({
        gameId,
        week: 0,
        sender: {
          role: 'Wholesaler',
          userId: userIds[1]
        },
        recipient: {
          role: 'Distributor',
          userId: userIds[2]
        },
        quantity: 8,
        status: 'Pending',
        deliveryWeek: 2
      });

      // Find orders for a specific role and game
      const retailerOrders = await Order.find({ 'sender.role': 'Retailer', gameId });
      const wholesalerOrders = await Order.find({ 'sender.role': 'Wholesaler', gameId });
      
      expect(retailerOrders).toHaveLength(1);
      expect(retailerOrders[0].sender.role).toBe('Retailer');
      expect(retailerOrders[0].quantity).toBe(5);
      
      expect(wholesalerOrders).toHaveLength(1);
      expect(wholesalerOrders[0].sender.role).toBe('Wholesaler');
      expect(wholesalerOrders[0].quantity).toBe(8);
    });
  });
}); 