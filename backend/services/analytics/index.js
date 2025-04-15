/**
 * Analytics Service
 * Handles analytics data generation and retrieval
 */

const Analytics = require('../../models/Analytics');
const Game = require('../../models/Game');
const Order = require('../../models/Order');
const GameState = require('../../models/GameState');

/**
 * Calculate variance of an array of numbers
 * @param {Array} values - Array of numeric values
 * @returns {number} - Variance
 */
const calculateVariance = (values) => {
  if (!values || values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  
  return variance;
};

/**
 * Calculate standard deviation of an array of numbers
 * @param {Array} values - Array of numeric values
 * @returns {number} - Standard deviation
 */
const calculateStandardDeviation = (values) => {
  return Math.sqrt(calculateVariance(values));
};

/**
 * Calculate bullwhip effect metrics for a game
 * @param {Object} game - Game document
 * @param {Array} gameStates - Array of game state documents
 * @returns {Object} - Bullwhip metrics object
 */
const calculateBullwhipMetrics = (game, gameStates) => {
  const retailerOrders = gameStates.map(state => state.playerStates.retailer.outgoingOrders);
  const factoryOrders = gameStates.map(state => state.playerStates.factory.outgoingOrders);
  
  const retailerOrderVariance = calculateVariance(retailerOrders);
  const factoryOrderVariance = calculateVariance(factoryOrders);
  
  const orderVarianceRatio = retailerOrderVariance > 0 
    ? factoryOrderVariance / retailerOrderVariance 
    : 0;
  
  // Calculate demand amplification
  const customerDemand = game.customerDemand
    .filter(d => d.week < game.currentWeek)
    .map(d => d.quantity);
  
  const customerDemandVariance = calculateVariance(customerDemand);
  const demandAmplification = customerDemandVariance > 0 
    ? factoryOrderVariance / customerDemandVariance 
    : 0;
    
  return {
    demandAmplification,
    orderVarianceRatio
  };
};

/**
 * Calculate performance metrics for each role
 * @param {Array} gameStates - Array of game state documents
 * @returns {Object} - Player performance object with metrics for each role
 */
const calculatePlayerPerformance = (gameStates) => {
  const roles = ['retailer', 'wholesaler', 'distributor', 'factory'];
  const playerPerformance = {};
  
  for (const role of roles) {
    // Calculate total cost across all weeks
    const totalCost = gameStates.reduce((sum, state) => {
      return sum + (state.playerStates[role].currentCost || 0);
    }, 0);
    
    // Calculate average inventory
    const totalInventory = gameStates.reduce((sum, state) => {
      return sum + state.playerStates[role].inventory;
    }, 0);
    const averageInventory = gameStates.length > 0 
      ? totalInventory / gameStates.length 
      : 0;
    
    // Calculate order variability (standard deviation of outgoing orders)
    const orders = gameStates.map(state => state.playerStates[role].outgoingOrders);
    const orderVariability = calculateStandardDeviation(orders);
    
    playerPerformance[role] = {
      totalCost,
      averageInventory,
      orderVariability
    };
  }
  
  return playerPerformance;
};

/**
 * Generate or update analytics for a game
 * @param {string} gameId - ID of the game
 * @returns {Object} - Generated or updated analytics object
 */
const generateGameAnalytics = async (gameId) => {
  try {
    // Find the game
    const game = await Game.findOne({ gameId });
    
    if (!game) {
      throw new Error('Game not found');
    }
    
    // Get all game states
    const gameStates = await GameState.find({ gameId }).sort({ week: 1 });
    
    if (gameStates.length === 0) {
      throw new Error('No game states found');
    }
    
    // Calculate performance metrics
    const playerPerformance = calculatePlayerPerformance(gameStates);
    
    // Calculate bullwhip metrics
    const bullwhipMetrics = calculateBullwhipMetrics(game, gameStates);
    
    // Count blockchain transactions
    const orderCount = await Order.countDocuments({ gameId });
    
    const confirmedOrders = await Order.countDocuments({
      gameId,
      'blockchainData.confirmed': true
    });
    
    // Get existing analytics or create new ones
    let analytics = await Analytics.findOne({ gameId });
    
    if (!analytics) {
      // Create new analytics
      analytics = new Analytics({
        gameId,
        completedAt: game.status === 'Completed' ? new Date() : null,
        duration: game.currentWeek,
        playerPerformance,
        bullwhipMetrics,
        blockchainMetrics: {
          transactionsSubmitted: orderCount,
          transactionsConfirmed: confirmedOrders,
          averageConfirmationTime: 0 // Would need transaction timestamps for this
        }
      });
      
      if (game.status === 'Completed') {
        await analytics.save();
      }
    } else {
      // Update existing analytics
      analytics.playerPerformance = playerPerformance;
      analytics.bullwhipMetrics = bullwhipMetrics;
      analytics.blockchainMetrics = {
        transactionsSubmitted: orderCount,
        transactionsConfirmed: confirmedOrders,
        averageConfirmationTime: analytics.blockchainMetrics.averageConfirmationTime
      };
      
      if (game.status === 'Completed' && !analytics.completedAt) {
        analytics.completedAt = new Date();
        analytics.duration = game.currentWeek;
      }
      
      await analytics.save();
    }
    
    return analytics;
  } catch (error) {
    console.error('Generate game analytics error:', error);
    throw error;
  }
};

/**
 * Get analytics for a specific game
 * @param {string} gameId - ID of the game
 * @param {boolean} forceGenerate - Whether to force regeneration of analytics
 * @returns {Object} - Analytics object
 */
const getGameAnalytics = async (gameId, forceGenerate = false) => {
  try {
    // Find existing analytics
    let analytics = await Analytics.findOne({ gameId });
    
    // If analytics don't exist or force regeneration is requested, generate them
    if (!analytics || forceGenerate) {
      analytics = await generateGameAnalytics(gameId);
    }
    
    return analytics;
  } catch (error) {
    console.error('Get game analytics error:', error);
    throw error;
  }
};

/**
 * Get aggregated analytics across multiple games
 * @param {Object} filters - Filters to apply (e.g., date range)
 * @returns {Object} - Aggregated analytics
 */
const getAggregatedAnalytics = async (filters = {}) => {
  try {
    // Build match stage based on filters
    const matchStage = {};
    
    if (filters.startDate && filters.endDate) {
      matchStage.completedAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }
    
    // Run aggregation pipeline
    const aggregatedData = await Analytics.aggregate([
      { $match: matchStage },
      { $group: {
        _id: null,
        gameCount: { $sum: 1 },
        averageDuration: { $avg: '$duration' },
        retailerAvgCost: { $avg: '$playerPerformance.retailer.totalCost' },
        wholesalerAvgCost: { $avg: '$playerPerformance.wholesaler.totalCost' },
        distributorAvgCost: { $avg: '$playerPerformance.distributor.totalCost' },
        factoryAvgCost: { $avg: '$playerPerformance.factory.totalCost' },
        avgDemandAmplification: { $avg: '$bullwhipMetrics.demandAmplification' },
        avgOrderVarianceRatio: { $avg: '$bullwhipMetrics.orderVarianceRatio' },
        totalTransactions: { $sum: '$blockchainMetrics.transactionsSubmitted' },
        confirmedTransactions: { $sum: '$blockchainMetrics.transactionsConfirmed' }
      }}
    ]);
    
    if (aggregatedData.length === 0) {
      return {
        gameCount: 0,
        averageDuration: 0,
        roleCosts: {
          retailer: 0,
          wholesaler: 0,
          distributor: 0,
          factory: 0
        },
        bullwhipMetrics: {
          avgDemandAmplification: 0,
          avgOrderVarianceRatio: 0
        },
        blockchainMetrics: {
          totalTransactions: 0,
          confirmedTransactions: 0,
          confirmationRate: 0
        }
      };
    }
    
    const data = aggregatedData[0];
    
    return {
      gameCount: data.gameCount,
      averageDuration: data.averageDuration,
      roleCosts: {
        retailer: data.retailerAvgCost,
        wholesaler: data.wholesalerAvgCost,
        distributor: data.distributorAvgCost,
        factory: data.factoryAvgCost
      },
      bullwhipMetrics: {
        avgDemandAmplification: data.avgDemandAmplification,
        avgOrderVarianceRatio: data.avgOrderVarianceRatio
      },
      blockchainMetrics: {
        totalTransactions: data.totalTransactions,
        confirmedTransactions: data.confirmedTransactions,
        confirmationRate: data.totalTransactions > 0 
          ? data.confirmedTransactions / data.totalTransactions 
          : 0
      }
    };
  } catch (error) {
    console.error('Get aggregated analytics error:', error);
    throw error;
  }
};

module.exports = {
  generateGameAnalytics,
  getGameAnalytics,
  getAggregatedAnalytics,
  calculateBullwhipMetrics,
  calculatePlayerPerformance
}; 