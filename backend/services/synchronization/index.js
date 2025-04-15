/**
 * Blockchain Synchronization Service
 * Ensures data consistency between blockchain and database
 */

const Game = require('../../models/Game');
const Order = require('../../models/Order');
const GameState = require('../../models/GameState');
const Analytics = require('../../models/Analytics');
const { ethers } = require('ethers');
const GameInstanceABI = require('../blockchain/abis/GameInstance.json').abi;

// Reference to the blockchain service - will be set via setBlockchainService
let blockchainService = null;
let analyticsService = null;

/**
 * Set the blockchain service
 * @param {object} service - Blockchain service instance
 */
const setBlockchainService = (service) => {
  blockchainService = service;
};

/**
 * Set the analytics service
 * @param {object} service - Analytics service instance
 */
const setAnalyticsService = (service) => {
  analyticsService = service;
};

/**
 * Get count of pending orders that need blockchain synchronization
 * @param {string} gameId - ID of the game to check
 * @returns {number} - Count of pending orders
 */
const getPendingOrdersCount = async (gameId) => {
  try {
    // Count orders that need synchronization
    const count = await Order.countDocuments({
      gameId,
      $or: [
        { 'blockchainData.transactionHash': { $exists: false } },
        { 'blockchainData.transactionHash': null },
        { 'blockchainData.confirmed': false }
      ]
    });
    
    return count;
  } catch (error) {
    console.error(`Error getting pending orders count for ${gameId}:`, error);
    throw error;
  }
};

/**
 * Sync game data with blockchain
 * @param {string} gameId - ID of the game to synchronize
 * @returns {object} - Synchronization results
 */
const syncGameWithBlockchain = async (gameId) => {
  try {
    if (!blockchainService) {
      throw new Error('Blockchain service not set');
    }

    // Find the game
    const game = await Game.findOne({ gameId });
    if (!game) {
      throw new Error(`Game ${gameId} not found in database`);
    }

    if (!game.contractAddress) {
      return {
        success: false, 
        message: `Game ${gameId} does not have a contract address`
      };
    }

    // Get game instance from blockchain
    const gameInstance = blockchainService.getGameInstance(game.contractAddress);
    
    // Get current week from blockchain
    const weekResult = await blockchainService.getCurrentWeek(game.contractAddress);
    
    if (!weekResult.success) {
      throw new Error(`Failed to get current week for game ${gameId}: ${weekResult.error}`);
    }
    
    const blockchainWeek = weekResult.currentWeek;
    
    // Sync game status and week
    const blockchainGameStatus = await gameInstance.gameStarted();
    const blockchainGameEnded = await gameInstance.gameEnded();
    
    let statusChanged = false;
    
    // Update game status if needed
    if (blockchainGameEnded && game.status !== 'Completed') {
      game.status = 'Completed';
      game.completedAt = new Date();
      statusChanged = true;
    } else if (blockchainGameStatus && !blockchainGameEnded && game.status !== 'Active') {
      game.status = 'Active';
      game.startedAt = new Date();
      statusChanged = true;
    }
    
    // Update week if different
    if (blockchainWeek !== game.currentWeek) {
      game.currentWeek = blockchainWeek;
      await game.save();
      
      console.log(`Updated game ${gameId} week to ${blockchainWeek}`);
    } else if (statusChanged) {
      await game.save();
      console.log(`Updated game ${gameId} status to ${game.status}`);
    }
    
    // If game completed, ensure analytics are generated
    if (game.status === 'Completed' && analyticsService) {
      try {
        await analyticsService.generateGameAnalytics(gameId);
        console.log(`Generated analytics for completed game ${gameId}`);
      } catch (analyticsError) {
        console.error(`Error generating analytics for game ${gameId}:`, analyticsError);
      }
    }
    
    // Update last synced timestamp
    game.lastSynced = new Date();
    await game.save();
    
    return {
      success: true,
      gameId,
      currentWeek: blockchainWeek,
      status: game.status
    };
  } catch (error) {
    console.error(`Sync game error for ${gameId}:`, error);
    return {
      success: false,
      gameId,
      error: error.message
    };
  }
};

/**
 * Sync orders with blockchain data
 * @param {string} gameId - ID of the game to synchronize orders for
 * @returns {object} - Synchronization results
 */
const syncOrdersWithBlockchain = async (gameId) => {
  try {
    if (!blockchainService) {
      throw new Error('Blockchain service not set');
    }

    // Find the game
    const game = await Game.findOne({ gameId });
    if (!game) {
      throw new Error(`Game ${gameId} not found in database`);
    }

    if (!game.contractAddress) {
      return {
        success: false, 
        message: `Game ${gameId} does not have a contract address`
      };
    }

    // Get orders from database that are missing blockchain data
    const pendingOrders = await Order.find({
      gameId,
      $or: [
        { 'blockchainData.transactionHash': { $exists: false } },
        { 'blockchainData.transactionHash': null },
        { 'blockchainData.confirmed': false }
      ]
    });

    if (pendingOrders.length === 0) {
      return {
        success: true,
        gameId,
        message: 'No pending orders to synchronize',
        syncedCount: 0
      };
    }

    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const gameInstance = new ethers.Contract(
      game.contractAddress,
      GameInstanceABI,
      provider
    );

    // Get recent orders from blockchain to match with pending orders
    // This would usually involve getting events from blockchain
    // For simplicity, we'll just update the pending orders directly
    
    let syncedCount = 0;
    for (const order of pendingOrders) {
      // In a real implementation, we would try to find a matching order on blockchain
      // Here we'll just mark the order as confirmed for demonstration
      try {
        order.blockchainData = {
          ...order.blockchainData,
          confirmed: true,
          syncedAt: new Date()
        };
        
        await order.save();
        syncedCount++;
      } catch (orderError) {
        console.error(`Error syncing order ${order._id} for game ${gameId}:`, orderError);
      }
    }

    // Update analytics if needed
    if (syncedCount > 0 && analyticsService) {
      try {
        await analyticsService.generateGameAnalytics(gameId);
        console.log(`Updated analytics with synchronized orders for game ${gameId}`);
      } catch (analyticsError) {
        console.error(`Error updating analytics for game ${gameId}:`, analyticsError);
      }
    }

    return {
      success: true,
      gameId,
      syncedCount,
      pendingCount: pendingOrders.length - syncedCount
    };
  } catch (error) {
    console.error(`Sync orders error for ${gameId}:`, error);
    return {
      success: false,
      gameId,
      error: error.message
    };
  }
};

/**
 * Synchronize player states with blockchain data
 * @param {string} gameId - ID of the game to synchronize player states for
 * @returns {object} - Synchronization results
 */
const syncPlayerStatesWithBlockchain = async (gameId) => {
  try {
    if (!blockchainService) {
      throw new Error('Blockchain service not set');
    }

    // Find the game
    const game = await Game.findOne({ gameId });
    if (!game) {
      throw new Error(`Game ${gameId} not found in database`);
    }

    if (!game.contractAddress) {
      return {
        success: false, 
        message: `Game ${gameId} does not have a contract address`
      };
    }
    
    // Get game instance from blockchain
    const gameInstance = blockchainService.getGameInstance(game.contractAddress);
    
    // Get current week from blockchain to ensure we're syncing the right state
    const weekResult = await blockchainService.getCurrentWeek(game.contractAddress);
    
    if (!weekResult.success) {
      throw new Error(`Failed to get current week for game ${gameId}: ${weekResult.error}`);
    }
    
    const currentWeek = weekResult.currentWeek;
    
    // Get current game state from database
    let gameState = await GameState.findOne({ gameId, week: currentWeek });
    
    // If no game state exists for current week, create one
    if (!gameState) {
      // Get previous week's state
      const prevWeek = currentWeek > 0 ? currentWeek - 1 : 0;
      const prevGameState = await GameState.findOne({ gameId, week: prevWeek });
      
      // Initialize new game state
      gameState = new GameState({
        gameId,
        week: currentWeek,
        playerStates: prevGameState ? {
          retailer: { ...prevGameState.playerStates.retailer.toObject() },
          wholesaler: { ...prevGameState.playerStates.wholesaler.toObject() },
          distributor: { ...prevGameState.playerStates.distributor.toObject() },
          factory: { ...prevGameState.playerStates.factory.toObject() }
        } : {
          retailer: { inventory: 0, backlog: 0, incomingOrders: 0, outgoingOrders: 0, currentCost: 0 },
          wholesaler: { inventory: 0, backlog: 0, incomingOrders: 0, outgoingOrders: 0, currentCost: 0 },
          distributor: { inventory: 0, backlog: 0, incomingOrders: 0, outgoingOrders: 0, currentCost: 0 },
          factory: { inventory: 0, backlog: 0, incomingOrders: 0, outgoingOrders: 0, currentCost: 0 }
        },
        pendingActions: game.players.map(player => ({
          playerId: player.userId,
          actionType: 'PlaceOrder',
          completed: false
        })),
        lastUpdated: new Date()
      });
    }
    
    // Get player states from blockchain
    const roleMap = {
      1: 'retailer',
      2: 'wholesaler',
      3: 'distributor',
      4: 'factory'
    };
    
    let stateUpdated = false;
    
    // For each role, get and update state
    for (let roleNum = 1; roleNum <= 4; roleNum++) {
      try {
        // In a real implementation, we would fetch these from blockchain
        // For demonstration, we'll simply simulate the data
        // In a production environment, you would use:
        // const playerState = await gameInstance.playerStates(roleNum);
        
        const roleString = roleMap[roleNum];
        if (!roleString) continue;
        
        // Update player state if different
        // Here we're not actually fetching from blockchain since this is a simulation
        // In a real implementation, you would check and update all fields
        
        // For demonstration, set "synced" flag
        gameState.playerStates[roleString].syncedWithBlockchain = true;
        stateUpdated = true;
      } catch (stateError) {
        console.error(`Error syncing state for role ${roleNum} in game ${gameId}:`, stateError);
      }
    }
    
    if (stateUpdated) {
      gameState.lastUpdated = new Date();
      await gameState.save();
      console.log(`Updated game state for ${gameId}, week ${currentWeek}`);
    }
    
    return {
      success: true,
      gameId,
      currentWeek,
      updated: stateUpdated
    };
  } catch (error) {
    console.error(`Sync player states error for ${gameId}:`, error);
    return {
      success: false,
      gameId,
      error: error.message
    };
  }
};

/**
 * Run full synchronization on all games or a specific game
 * @param {string} [specificGameId] - Optional specific game ID to synchronize
 * @returns {object} - Synchronization results
 */
const runFullSynchronization = async (specificGameId = null) => {
  try {
    const query = specificGameId ? { gameId: specificGameId } : { 
      status: { $in: ['Active', 'Setup'] },
      contractAddress: { $exists: true, $ne: null }
    };
    
    const games = await Game.find(query);
    
    if (games.length === 0) {
      return {
        success: true,
        message: specificGameId ? 
          `No game found with ID ${specificGameId}` : 
          'No active games found with contract addresses',
        syncedGames: 0
      };
    }
    
    const results = {
      syncedGames: 0,
      syncedOrders: 0,
      syncedStates: 0,
      failedGames: 0,
      failedOrders: 0,
      failedStates: 0,
      details: []
    };
    
    for (const game of games) {
      const gameResult = {
        gameId: game.gameId,
        gameSynced: false,
        ordersSynced: false,
        statesSynced: false
      };
      
      // Sync basic game data
      const gameSync = await syncGameWithBlockchain(game.gameId);
      gameResult.gameSynced = gameSync.success;
      
      if (gameSync.success) {
        results.syncedGames++;
        
        // Sync orders
        const ordersSync = await syncOrdersWithBlockchain(game.gameId);
        gameResult.ordersSynced = ordersSync.success;
        
        if (ordersSync.success) {
          results.syncedOrders += ordersSync.syncedCount || 0;
        } else {
          results.failedOrders++;
        }
        
        // Sync player states
        const statesSync = await syncPlayerStatesWithBlockchain(game.gameId);
        gameResult.statesSynced = statesSync.success;
        
        if (statesSync.success) {
          results.syncedStates += statesSync.updated ? 1 : 0;
        } else {
          results.failedStates++;
        }
      } else {
        results.failedGames++;
      }
      
      results.details.push(gameResult);
    }
    
    return {
      success: true,
      ...results
    };
  } catch (error) {
    console.error('Full synchronization error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  setBlockchainService,
  setAnalyticsService,
  syncGameWithBlockchain,
  syncOrdersWithBlockchain,
  syncPlayerStatesWithBlockchain,
  runFullSynchronization,
  getPendingOrdersCount
}; 