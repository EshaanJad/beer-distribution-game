const Game = require('../../models/Game');
const GameState = require('../../models/GameState');
const Order = require('../../models/Order');
const User = require('../../models/User');
const blockchainService = require('../blockchain');

// Reference to the websocket service - will be set via setWebSocketService
let websocketService = null;
let analyticsService = null;

/**
 * Set the websocket service for notifications
 * @param {object} service - WebSocket service instance
 */
const setWebSocketService = (service) => {
  websocketService = service;
};

/**
 * Set the analytics service for game analytics
 * @param {object} service - Analytics service instance 
 */
const setAnalyticsService = (service) => {
  analyticsService = service;
};

/**
 * Create a new game session
 * @param {object} configParams - Game configuration parameters
 * @param {object} creator - Creator user object
 * @returns {object} - Result with game data
 */
const createGame = async (configParams, creator) => {
  try {
    const { orderDelay, shippingDelay, demandPattern, initialInventory, blockchainEnabled } = configParams;
    
    // Generate a unique game ID if it's not provided (for tests)
    const gameId = configParams.gameId || `game-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Create game in database
    const game = await Game.create({
      gameId,
      createdBy: creator._id,
      configuration: {
        orderDelay: orderDelay || 2,
        shippingDelay: shippingDelay || 2,
        demandPattern: demandPattern || 'Constant',
        initialInventory: initialInventory || 12,
        blockchainEnabled: blockchainEnabled !== false
      },
      status: 'Setup'
    });
    
    // Generate customer demand for the game
    const customerDemand = generateCustomerDemand(demandPattern, 20);
    game.customerDemand = customerDemand;
    await game.save();
    
    // If blockchain enabled, create game on blockchain
    let blockchainData = {};
    if (blockchainEnabled !== false) {
      const demandPatternNumber = demandPattern === 'Step' ? 1 : demandPattern === 'Random' ? 2 : 0;
      
      const result = await blockchainService.createGame(
        game.gameId,
        orderDelay || 2,
        shippingDelay || 2,
        demandPatternNumber,
        initialInventory || 12
      );
      
      if (result.success) {
        game.contractAddress = result.gameAddress;
        await game.save();
        blockchainData = {
          contractAddress: result.gameAddress,
          transactionHash: result.transactionHash
        };
      } else {
        console.error('Failed to create game on blockchain:', result.error);
      }
    }
    
    // Initialize game state for week 0
    await GameState.create({
      gameId: game.gameId,
      week: 0,
      playerStates: {
        retailer: { 
          inventory: initialInventory || 12,
          backlog: 0,
          incomingOrders: 0,
          outgoingOrders: 0,
          currentCost: 0
        },
        wholesaler: { 
          inventory: initialInventory || 12,
          backlog: 0,
          incomingOrders: 0,
          outgoingOrders: 0,
          currentCost: 0
        },
        distributor: { 
          inventory: initialInventory || 12,
          backlog: 0,
          incomingOrders: 0,
          outgoingOrders: 0,
          currentCost: 0
        },
        factory: { 
          inventory: initialInventory || 12,
          backlog: 0,
          incomingOrders: 0,
          outgoingOrders: 0,
          currentCost: 0
        }
      },
      pendingActions: []
    });
    
    // Notify via WebSocket if available
    if (websocketService) {
      websocketService.broadcastUpdate(game.gameId, {
        type: 'GAME_CREATED',
        game: {
          gameId: game.gameId,
          createdBy: creator._id,
          configuration: game.configuration,
          contractAddress: game.contractAddress,
          status: game.status
        }
      });
    }
    
    return {
      success: true,
      data: {
        gameId: game.gameId,
        createdBy: creator._id,
        configuration: game.configuration,
        contractAddress: game.contractAddress,
        blockchain: blockchainData
      }
    };
  } catch (error) {
    console.error('Create game error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * Generate customer demand based on pattern
 * @param {string} pattern - Demand pattern
 * @param {number} weeks - Number of weeks to generate
 * @returns {Array} - Array of demand objects
 */
const generateCustomerDemand = (pattern, weeks) => {
  const demand = [];
  
  for (let week = 0; week < weeks; week++) {
    let quantity;
    
    switch (pattern) {
      case 'Step':
        // 4 units until week 4, then 8 units
        quantity = week < 4 ? 4 : 8;
        break;
      case 'Random':
        // Random between 2 and 6
        quantity = Math.floor(Math.random() * 5) + 2;
        break;
      case 'Constant':
      default:
        // Constant 4 units
        quantity = 4;
        break;
    }
    
    demand.push({ week, quantity });
  }
  
  return demand;
};

/**
 * Join a game
 * @param {string} gameId - ID of the game to join
 * @param {object} playerInfo - Player information including role
 * @param {object} user - User object
 * @returns {object} - Result with game data
 */
const joinGame = async (gameId, playerInfo, user) => {
  try {
    const { role } = playerInfo;
    
    // Validate role
    if (!['Retailer', 'Wholesaler', 'Distributor', 'Factory'].includes(role)) {
      return { 
        success: false, 
        error: 'Invalid role' 
      };
    }
    
    // Find game
    const game = await Game.findOne({ gameId });
    
    if (!game) {
      return { 
        success: false, 
        error: 'Game not found' 
      };
    }
    
    // Check if game is in Setup state
    if (game.status !== 'Setup') {
      return { 
        success: false, 
        error: 'Game has already started' 
      };
    }
    
    // Check if role is already taken
    const roleExists = game.players.some(player => player.role === role);
    if (roleExists) {
      return { 
        success: false, 
        error: 'Role already taken' 
      };
    }
    
    // Add player to game
    game.players.push({
      userId: user._id,
      role,
      joined: new Date(),
      isActive: true
    });
    
    await game.save();
    
    // If blockchain enabled, assign role on blockchain
    let blockchainData = {};
    if (game.configuration.blockchainEnabled && game.contractAddress) {
      // Map role string to number (1=Retailer, 2=Wholesaler, etc.)
      const roleNumber = {
        'Retailer': 1,
        'Wholesaler': 2,
        'Distributor': 3,
        'Factory': 4
      }[role];
      
      const result = await blockchainService.assignRole(
        game.gameId,
        user.walletAddress || game.createdBy.walletAddress, // Use creator's wallet if player doesn't have one
        roleNumber
      );
      
      if (result.success) {
        blockchainData = {
          transactionHash: result.transactionHash
        };
      } else {
        console.error('Failed to assign role on blockchain:', result.error);
      }
    }
    
    // Check if all roles are filled to start the game
    const allRolesFilled = game.players.length === 4;
    
    // Notify via WebSocket if available
    if (websocketService) {
      websocketService.broadcastUpdate(gameId, {
        type: 'PLAYER_JOINED',
        player: {
          userId: user._id,
          username: user.username,
          role: role
        },
        allRolesFilled: allRolesFilled
      });
    }
    
    return {
      success: true,
      data: {
        gameId: game.gameId,
        role,
        allRolesFilled,
        blockchain: blockchainData
      }
    };
  } catch (error) {
    console.error('Join game error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * Start a game
 * @param {string} gameId - ID of the game
 * @param {object} user - User object
 * @returns {object} - Result with game data
 */
const startGame = async (gameId, user) => {
  try {
    // Find game
    const game = await Game.findOne({ gameId });
    
    if (!game) {
      return { 
        success: false, 
        error: 'Game not found' 
      };
    }
    
    // Check if user is creator
    if (game.createdBy.toString() !== user._id.toString()) {
      return { 
        success: false, 
        error: 'Only the game creator can start the game' 
      };
    }
    
    // Check if game is already active
    if (game.status === 'Active') {
      return { 
        success: false, 
        error: 'Game has already started' 
      };
    }
    
    // Check if all roles are filled
    const requiredRoles = ['Retailer', 'Wholesaler', 'Distributor', 'Factory'];
    const currentRoles = game.players.map(player => player.role);
    
    const missingRoles = requiredRoles.filter(role => !currentRoles.includes(role));
    
    if (missingRoles.length > 0) {
      return { 
        success: false, 
        error: 'Not all roles have been filled' 
      };
    }
    
    // Update game status
    game.status = 'Active';
    game.startedAt = new Date();
    game.currentWeek = 0;
    await game.save();
    
    // If blockchain enabled, start game on blockchain
    let blockchainData = {};
    if (game.configuration.blockchainEnabled && game.contractAddress) {
      const result = await blockchainService.startGame(game.contractAddress);
      
      if (result.success) {
        blockchainData = {
          transactionHash: result.transactionHash
        };
      } else {
        console.error('Failed to start game on blockchain:', result.error);
      }
    }
    
    // Get current game state to return
    const gameState = await GameState.findOne({ 
      gameId: game.gameId, 
      week: 0 
    });
    
    // Get list of all players with roles
    const players = await User.find({ 
      _id: { $in: game.players.map(player => player.userId) } 
    }).select('username email walletAddress');
    
    const playersWithRoles = game.players.map(player => {
      const userInfo = players.find(u => u._id.toString() === player.userId.toString());
      return {
        userId: player.userId,
        role: player.role,
        username: userInfo ? userInfo.username : '',
        email: userInfo ? userInfo.email : '',
        walletAddress: userInfo ? userInfo.walletAddress : ''
      };
    });
    
    // Notify via WebSocket if available
    if (websocketService) {
      websocketService.broadcastUpdate(game.gameId, {
        type: 'GAME_STARTED',
        gameId: game.gameId,
        players: playersWithRoles,
        currentWeek: game.currentWeek,
        gameState: gameState ? gameState.toObject() : null
      });
    }
    
    return {
      success: true,
      data: {
        gameId: game.gameId,
        status: game.status,
        currentWeek: game.currentWeek,
        players: playersWithRoles,
        playerStates: gameState ? {
          retailer: gameState.playerStates.retailer,
          wholesaler: gameState.playerStates.wholesaler,
          distributor: gameState.playerStates.distributor,
          factory: gameState.playerStates.factory
        } : {},
        blockchain: blockchainData
      }
    };
  } catch (error) {
    console.error('Start game error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * Process an order
 * @param {string} gameId - ID of the game
 * @param {string} senderRole - Role of the sender
 * @param {string} recipientRole - Role of the recipient
 * @param {number} quantity - Order quantity
 * @param {object} user - User placing the order
 * @returns {object} - Result with order data
 */
const processOrder = async (gameId, senderRole, recipientRole, quantity, user) => {
  try {
    // Find game
    const game = await Game.findOne({ gameId });
    
    if (!game) {
      return { 
        success: false, 
        error: 'Game not found' 
      };
    }
    
    // Check if game is active
    if (game.status !== 'Active') {
      return { 
        success: false, 
        error: 'Game is not active' 
      };
    }
    
    // Validate roles
    if (!['Retailer', 'Wholesaler', 'Distributor', 'Factory'].includes(senderRole)) {
      return { 
        success: false, 
        error: 'Invalid sender role' 
      };
    }
    
    if (!['Retailer', 'Wholesaler', 'Distributor', 'Factory'].includes(recipientRole)) {
      return { 
        success: false, 
        error: 'Invalid recipient role' 
      };
    }
    
    // Check if user is playing the sender role
    const player = game.players.find(p => 
      p.userId.toString() === user._id.toString() && p.role === senderRole
    );
    
    if (!player) {
      return { 
        success: false, 
        error: 'You are not authorized to place orders as this role' 
      };
    }
    
    // Validate order flow (Retailer -> Wholesaler -> Distributor -> Factory)
    const roles = ['Retailer', 'Wholesaler', 'Distributor', 'Factory'];
    const senderIndex = roles.indexOf(senderRole);
    const recipientIndex = roles.indexOf(recipientRole);
    
    if (recipientIndex !== senderIndex + 1) {
      return { 
        success: false, 
        error: 'Invalid order flow. Orders must follow the supply chain.' 
      };
    }
    
    // Calculate delivery week based on order delay
    const deliveryWeek = game.currentWeek + game.configuration.orderDelay;
    
    // Create the order
    const recipientUser = game.players.find(p => p.role === recipientRole);
    
    const order = await Order.create({
      gameId: game.gameId,
      week: game.currentWeek,
      sender: {
        role: senderRole,
        userId: user._id
      },
      recipient: {
        role: recipientRole,
        userId: recipientUser ? recipientUser.userId : null
      },
      quantity,
      status: 'Pending',
      deliveryWeek
    });
    
    // Update game state
    const gameState = await GameState.findOne({ gameId, week: game.currentWeek });
    
    // Update outgoing orders for sender
    gameState.playerStates[senderRole.toLowerCase()].outgoingOrders += quantity;
    
    // Update incoming orders for recipient
    gameState.playerStates[recipientRole.toLowerCase()].incomingOrders += quantity;
    
    // Mark action as completed for the player
    const pendingActionIndex = gameState.pendingActions.findIndex(
      action => action.playerId.toString() === user._id.toString() && 
               action.actionType === 'PlaceOrder'
    );
    
    if (pendingActionIndex !== -1) {
      gameState.pendingActions[pendingActionIndex].completed = true;
    }
    
    await gameState.save();
    
    // If blockchain enabled, place order on blockchain
    let blockchainData = {};
    if (game.configuration.blockchainEnabled && game.contractAddress) {
      // Map role string to number (1=Retailer, 2=Wholesaler, etc.)
      const roleMap = {
        'Retailer': 1,
        'Wholesaler': 2,
        'Distributor': 3,
        'Factory': 4
      };
      
      const result = await blockchainService.placeOrder(
        game.contractAddress,
        roleMap[senderRole],
        roleMap[recipientRole],
        quantity
      );
      
      if (result.success) {
        // Update order with blockchain data
        order.blockchainData = {
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
          confirmed: true
        };
        
        await order.save();
        
        blockchainData = {
          transactionHash: result.transactionHash,
          orderId: result.orderId
        };
      } else {
        console.error('Failed to place order on blockchain:', result.error);
      }
    }
    
    // Notify via WebSocket if available
    if (websocketService) {
      websocketService.broadcastUpdate(gameId, {
        type: 'ORDER_PLACED',
        order: {
          orderId: order._id,
          gameId: game.gameId,
          week: game.currentWeek,
          sender: order.sender,
          recipient: order.recipient,
          quantity,
          deliveryWeek
        },
        gameState: gameState.toObject()
      });
      
      // Notify recipient of incoming order
      if (recipientUser) {
        websocketService.notifyPlayer(recipientUser.userId.toString(), {
          type: 'NEW_ORDER',
          orderId: order._id,
          gameId: gameId,
          sender: senderRole,
          quantity
        });
      }
    }
    
    return {
      success: true,
      data: {
        orderId: order._id,
        gameId: game.gameId,
        week: game.currentWeek,
        sender: order.sender,
        recipient: order.recipient,
        quantity,
        deliveryWeek,
        blockchain: blockchainData
      }
    };
  } catch (error) {
    console.error('Process order error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * Advance the game to the next week
 * @param {string} gameId - ID of the game
 * @param {object} user - User initiating the advancement
 * @returns {object} - Result with new game state
 */
const advanceWeek = async (gameId, user) => {
  try {
    // Find game
    const game = await Game.findOne({ gameId });
    
    if (!game) {
      return { 
        success: false, 
        error: 'Game not found' 
      };
    }
    
    // Check if user is the creator
    if (game.createdBy.toString() !== user._id.toString()) {
      return { 
        success: false, 
        error: 'Only the creator can advance the week' 
      };
    }
    
    // Check if game is active
    if (game.status !== 'Active') {
      return { 
        success: false, 
        error: 'Game is not active' 
      };
    }
    
    // Check if all players have completed their actions
    const currentGameState = await GameState.findOne({ gameId, week: game.currentWeek });
    const pendingActions = currentGameState.pendingActions.filter(action => !action.completed);
    
    if (pendingActions.length > 0) {
      return { 
        success: false, 
        error: 'Not all players have completed their actions' 
      };
    }
    
    // Process orders scheduled for delivery this week
    await processDeliveries(game, game.currentWeek);
    
    // Calculate inventory costs for current week
    await calculateCosts(game, game.currentWeek);
    
    // Get updated game state after processing
    const updatedCurrentState = await GameState.findOne({ gameId, week: game.currentWeek });
    
    // Increment week
    const newWeek = game.currentWeek + 1;
    game.currentWeek = newWeek;
    await game.save();
    
    // Create new game state for next week
    const newGameState = await createNextWeekState(game, newWeek);
    
    // If blockchain enabled, advance week on blockchain
    let blockchainData = {};
    if (game.configuration.blockchainEnabled && game.contractAddress) {
      const result = await blockchainService.advanceWeek(game.contractAddress);
      
      if (result.success) {
        blockchainData = {
          transactionHash: result.transactionHash
        };
      } else {
        console.error('Failed to advance week on blockchain:', result.error);
      }
    }
    
    // Create customer order for the new week
    const weekDemand = game.customerDemand.find(d => d.week === newWeek);
    if (weekDemand) {
      const retailerPlayer = game.players.find(p => p.role === 'Retailer');
      
      await Order.create({
        gameId: game.gameId,
        week: newWeek,
        sender: {
          role: 'Customer'
        },
        recipient: {
          role: 'Retailer',
          userId: retailerPlayer ? retailerPlayer.userId : null
        },
        quantity: weekDemand.quantity,
        status: 'Pending',
        deliveryWeek: newWeek
      });
    }
    
    // Notify via WebSocket if available
    if (websocketService) {
      // Broadcast week advancement to all players
      websocketService.broadcastWeekAdvanced(gameId, newWeek.toString(), {
        previousState: updatedCurrentState.toObject(),
        currentState: newGameState.toObject(),
        customerDemand: weekDemand ? weekDemand.quantity : 0
      });
      
      // Send individual notifications to each player
      for (const player of game.players) {
        websocketService.notifyPlayer(player.userId.toString(), {
          type: 'WEEK_ADVANCED',
          gameId: gameId,
          newWeek: newWeek,
          role: player.role,
          pendingAction: 'PlaceOrder'
        });
      }
    }
    
    // Check if this is the final week
    if (game.currentWeek >= game.configuration.maxWeeks) {
      return await completeGame(gameId, user);
    }
    
    return {
      success: true,
      data: {
        gameId: game.gameId,
        previousWeek: game.currentWeek - 1,
        currentWeek: game.currentWeek,
        playerStates: newGameState.playerStates,
        customerDemand: weekDemand ? weekDemand.quantity : 0,
        blockchain: blockchainData
      }
    };
  } catch (error) {
    console.error('Advance week error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * Process deliveries for a specific week
 * @param {object} game - Game object
 * @param {number} week - Current week
 */
const processDeliveries = async (game, week) => {
  // Find all orders scheduled for delivery this week
  const orders = await Order.find({
    gameId: game.gameId,
    deliveryWeek: week,
    status: 'Pending'
  });
  
  const gameState = await GameState.findOne({ gameId: game.gameId, week });
  
  for (const order of orders) {
    // Process order delivery
    if (order.sender.role === 'Customer') {
      // Customer orders go directly to the retailer's backlog
      const retailerState = gameState.playerStates.retailer;
      
      // Update retailer state
      if (retailerState.inventory >= order.quantity) {
        // Fulfill order from inventory
        retailerState.inventory -= order.quantity;
      } else {
        // Fulfill what we can and add the rest to backlog
        const fulfilled = retailerState.inventory;
        const backordered = order.quantity - fulfilled;
        
        retailerState.inventory = 0;
        retailerState.backlog += backordered;
      }
    } else {
      // Internal supply chain orders
      const recipientRole = order.recipient.role.toLowerCase();
      const recipientState = gameState.playerStates[recipientRole];
      
      // Add to recipient's inventory
      recipientState.inventory += order.quantity;
      
      // Fulfill backlog if possible
      if (recipientState.backlog > 0 && recipientState.inventory > 0) {
        const toFulfill = Math.min(recipientState.backlog, recipientState.inventory);
        recipientState.backlog -= toFulfill;
        recipientState.inventory -= toFulfill;
      }
    }
    
    // Mark order as delivered
    order.status = 'Delivered';
    await order.save();
    
    // Notify via WebSocket if available
    if (websocketService && order.recipient.userId) {
      websocketService.notifyPlayer(order.recipient.userId.toString(), {
        type: 'ORDER_DELIVERED',
        orderId: order._id,
        gameId: game.gameId,
        week: week,
        sender: order.sender.role,
        quantity: order.quantity
      });
    }
  }
  
  await gameState.save();
  
  // Notify about updated game state via WebSocket if available
  if (websocketService) {
    websocketService.broadcastGameState(game.gameId, gameState.toObject());
  }
};

/**
 * Calculate inventory holding and backlog costs
 * @param {object} game - Game object
 * @param {number} week - Current week
 */
const calculateCosts = async (game, week) => {
  const gameState = await GameState.findOne({ gameId: game.gameId, week });
  
  // Constants for cost calculation
  const HOLDING_COST = 1;
  const BACKLOG_COST = 2;
  
  // Calculate costs for each role
  for (const role of ['retailer', 'wholesaler', 'distributor', 'factory']) {
    const playerState = gameState.playerStates[role];
    
    // Calculate costs
    const holdingCost = playerState.inventory * HOLDING_COST;
    const backlogCost = playerState.backlog * BACKLOG_COST;
    const totalCost = holdingCost + backlogCost;
    
    // Update player state
    playerState.currentCost = totalCost;
    
    // Find the user for this role to send notifications
    const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);
    const player = game.players.find(p => p.role === roleCapitalized);
    
    if (player && websocketService) {
      websocketService.notifyPlayer(player.userId.toString(), {
        type: 'COSTS_UPDATED',
        gameId: game.gameId,
        week: week,
        role: roleCapitalized,
        holdingCost,
        backlogCost,
        totalCost
      });
    }
  }
  
  await gameState.save();
};

/**
 * Create game state for the next week
 * @param {object} game - Game object
 * @param {number} newWeek - New week number
 * @returns {object} - New game state
 */
const createNextWeekState = async (game, newWeek) => {
  // Get current game state
  const currentState = await GameState.findOne({ 
    gameId: game.gameId, 
    week: game.currentWeek - 1 
  });
  
  // Create new game state based on current state
  const newState = await GameState.create({
    gameId: game.gameId,
    week: newWeek,
    playerStates: {
      retailer: { 
        inventory: currentState.playerStates.retailer.inventory,
        backlog: currentState.playerStates.retailer.backlog,
        incomingOrders: 0,
        outgoingOrders: 0,
        currentCost: 0
      },
      wholesaler: { 
        inventory: currentState.playerStates.wholesaler.inventory,
        backlog: currentState.playerStates.wholesaler.backlog,
        incomingOrders: 0,
        outgoingOrders: 0,
        currentCost: 0
      },
      distributor: { 
        inventory: currentState.playerStates.distributor.inventory,
        backlog: currentState.playerStates.distributor.backlog,
        incomingOrders: 0,
        outgoingOrders: 0,
        currentCost: 0
      },
      factory: { 
        inventory: currentState.playerStates.factory.inventory,
        backlog: currentState.playerStates.factory.backlog,
        incomingOrders: 0,
        outgoingOrders: 0,
        currentCost: 0
      }
    },
    pendingActions: game.players.map(player => ({
      playerId: player.userId,
      actionType: 'PlaceOrder',
      completed: false
    }))
  });
  
  return newState;
};

/**
 * Complete a game and generate analytics
 * @param {string} gameId - ID of the game
 * @param {object} user - User completing the game
 * @returns {object} - Result with game data
 */
const completeGame = async (gameId, user) => {
  try {
    // Find game
    const game = await Game.findOne({ gameId });
    
    if (!game) {
      return { 
        success: false, 
        error: 'Game not found' 
      };
    }
    
    // Check if user is creator
    if (game.createdBy.toString() !== user._id.toString()) {
      return { 
        success: false, 
        error: 'Only the game creator can complete the game' 
      };
    }
    
    // Check if game is active
    if (game.status !== 'Active') {
      return { 
        success: false, 
        error: 'Only active games can be completed' 
      };
    }
    
    // Update game status
    game.status = 'Completed';
    game.completedAt = new Date();
    await game.save();
    
    // Generate analytics if the service is available
    let analytics = null;
    if (analyticsService) {
      try {
        analytics = await analyticsService.generateGameAnalytics(gameId);
        console.log(`Analytics generated for game ${gameId}`);
      } catch (error) {
        console.error(`Error generating analytics for game ${gameId}:`, error);
      }
    }
    
    // Notify via WebSocket if available
    if (websocketService) {
      websocketService.broadcastUpdate(gameId, {
        type: 'GAME_COMPLETED',
        gameId,
        completedAt: game.completedAt,
        analytics: analytics ? {
          playerPerformance: analytics.playerPerformance,
          bullwhipMetrics: analytics.bullwhipMetrics
        } : null
      });
    }
    
    return {
      success: true,
      data: {
        gameId,
        status: game.status,
        completedAt: game.completedAt,
        analytics: analytics ? {
          playerPerformance: analytics.playerPerformance,
          bullwhipMetrics: analytics.bullwhipMetrics
        } : null
      }
    };
  } catch (error) {
    console.error('Complete game error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

module.exports = {
  setWebSocketService,
  setAnalyticsService,
  createGame,
  joinGame,
  startGame,
  processOrder,
  advanceWeek,
  completeGame
}; 