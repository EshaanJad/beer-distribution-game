/**
 * Data Retention Service
 * Handles archiving and purging of old game data
 */

const Game = require('../../models/Game');
const GameState = require('../../models/GameState');
const Order = require('../../models/Order');
const Analytics = require('../../models/Analytics');
const ArchivedGame = require('../../models/ArchivedGame');
const mongoose = require('mongoose');

// Default retention periods in days
const DEFAULT_RETENTION_PERIODS = {
  completedGames: 90, // Keep completed games for 90 days
  incompleteGames: 30, // Keep abandoned games for 30 days
  gameStates: 90,      // Keep game states for 90 days
  orders: 90,          // Keep orders for 90 days
  analyticsData: 365   // Keep analytics data for 365 days
};

// Configurable retention periods
let retentionPeriods = { ...DEFAULT_RETENTION_PERIODS };

/**
 * Set custom retention periods
 * @param {Object} periods - Custom retention periods
 */
const setRetentionPeriods = (periods) => {
  retentionPeriods = { ...DEFAULT_RETENTION_PERIODS, ...periods };
  console.log('Data retention periods updated:', retentionPeriods);
};

/**
 * Archive completed games that are older than the retention period
 * @returns {Promise<Object>} - Result with archived games count
 */
const archiveOldGames = async () => {
  try {
    const completedCutoffDate = new Date();
    completedCutoffDate.setDate(completedCutoffDate.getDate() - retentionPeriods.completedGames);
    
    const incompleteCutoffDate = new Date();
    incompleteCutoffDate.setDate(incompleteCutoffDate.getDate() - retentionPeriods.incompleteGames);
    
    // Find games to archive (completed games that are old, or inactive incomplete games that are very old)
    const gamesToArchive = await Game.find({
      $or: [
        { status: 'Completed', completedAt: { $lt: completedCutoffDate } },
        {
          status: { $ne: 'Completed' },
          createdAt: { $lt: incompleteCutoffDate },
          // No activity for a long time (based on lastUpdated field)
          $or: [
            { lastSynced: { $lt: incompleteCutoffDate } },
            { lastSynced: { $exists: false } }
          ]
        }
      ]
    });
    
    if (gamesToArchive.length === 0) {
      return { success: true, message: 'No games to archive', archivedCount: 0 };
    }
    
    let archivedCount = 0;
    let failedCount = 0;
    
    // Process each game for archiving
    for (const game of gamesToArchive) {
      try {
        // Create archive record for the game
        const archivedGame = new ArchivedGame({
          originalId: game._id,
          gameId: game.gameId,
          createdBy: game.createdBy,
          status: game.status,
          createdAt: game.createdAt,
          completedAt: game.completedAt,
          contractAddress: game.contractAddress,
          currentWeek: game.currentWeek,
          players: game.players,
          gameData: game.toObject(), // Store the entire game object for reference
          archivedAt: new Date()
        });
        
        await archivedGame.save();
        
        // Check if we should also archive analytics
        const analytics = await Analytics.findOne({ gameId: game.gameId });
        if (analytics) {
          archivedGame.analyticsData = analytics.toObject();
          await archivedGame.save();
        }
        
        // Delete the original game and related data
        await GameState.deleteMany({ gameId: game.gameId });
        await Order.deleteMany({ gameId: game.gameId });
        // Keep analytics data as it's small and valuable
        
        // Delete the game last
        await Game.deleteOne({ _id: game._id });
        
        archivedCount++;
        console.log(`Archived game ${game.gameId}, created on ${game.createdAt}`);
      } catch (error) {
        console.error(`Error archiving game ${game.gameId}:`, error);
        failedCount++;
      }
    }
    
    return {
      success: true,
      archivedCount,
      failedCount,
      totalProcessed: gamesToArchive.length
    };
  } catch (error) {
    console.error('Archive games error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Purge old game states that are no longer needed
 * @returns {Promise<Object>} - Result with purged game states count
 */
const purgeOldGameStates = async () => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionPeriods.gameStates);
    
    // Keep the most recent states for active games
    const activeGames = await Game.find({ status: { $ne: 'Completed' } }).select('gameId');
    const activeGameIds = activeGames.map(game => game.gameId);
    
    // For completed games, we can purge old states except for the final state
    const completedGames = await Game.find({ status: 'Completed' }).select('gameId currentWeek');
    
    // Build exclusion list for completed games (keep the final state)
    const completedGameExclusions = [];
    for (const game of completedGames) {
      completedGameExclusions.push({
        gameId: game.gameId,
        week: game.currentWeek
      });
    }
    
    // Construct the query to purge old states
    const query = {
      $or: [
        // For completed games, purge states that are not the final state and are older than cutoff
        {
          gameId: { $in: completedGames.map(g => g.gameId) },
          lastUpdated: { $lt: cutoffDate },
          $nor: completedGameExclusions.map(({ gameId, week }) => ({ gameId, week }))
        },
        // For inactive and archived games, purge all states
        {
          gameId: { $nin: [...activeGameIds, ...completedGames.map(g => g.gameId)] },
          lastUpdated: { $lt: cutoffDate }
        }
      ]
    };
    
    // Delete the old game states
    const result = await GameState.deleteMany(query);
    
    return {
      success: true,
      purgedCount: result.deletedCount
    };
  } catch (error) {
    console.error('Purge game states error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Purge old orders that are no longer needed
 * @returns {Promise<Object>} - Result with purged orders count
 */
const purgeOldOrders = async () => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionPeriods.orders);
    
    // Keep orders for active games
    const activeGames = await Game.find({ status: { $ne: 'Completed' } }).select('gameId');
    const activeGameIds = activeGames.map(game => game.gameId);
    
    // For all other games, purge old orders
    const query = {
      gameId: { $nin: activeGameIds },
      placedAt: { $lt: cutoffDate }
    };
    
    // Delete the old orders
    const result = await Order.deleteMany(query);
    
    return {
      success: true,
      purgedCount: result.deletedCount
    };
  } catch (error) {
    console.error('Purge orders error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Purge old analytics data
 * @returns {Promise<Object>} - Result with purged analytics count
 */
const purgeOldAnalytics = async () => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionPeriods.analyticsData);
    
    // Purge analytics for games that have been archived
    const archivedGameIds = await ArchivedGame.find({
      archivedAt: { $lt: cutoffDate }
    }).select('gameId');
    
    // Delete analytics for these archived games
    const result = await Analytics.deleteMany({
      gameId: { $in: archivedGameIds.map(g => g.gameId) }
    });
    
    return {
      success: true,
      purgedCount: result.deletedCount
    };
  } catch (error) {
    console.error('Purge analytics error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Run complete data retention process
 * @returns {Promise<Object>} - Result with counts of processed data
 */
const runDataRetention = async () => {
  try {
    const archiveResult = await archiveOldGames();
    const gameStatesPurgeResult = await purgeOldGameStates();
    const ordersPurgeResult = await purgeOldOrders();
    const analyticsPurgeResult = await purgeOldAnalytics();
    
    return {
      success: true,
      archivedGames: archiveResult.archivedCount || 0,
      purgedGameStates: gameStatesPurgeResult.purgedCount || 0,
      purgedOrders: ordersPurgeResult.purgedCount || 0,
      purgedAnalytics: analyticsPurgeResult.purgedCount || 0,
      details: {
        archiveResult,
        gameStatesPurgeResult,
        ordersPurgeResult,
        analyticsPurgeResult
      }
    };
  } catch (error) {
    console.error('Data retention process error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  setRetentionPeriods,
  archiveOldGames,
  purgeOldGameStates,
  purgeOldOrders,
  purgeOldAnalytics,
  runDataRetention,
  DEFAULT_RETENTION_PERIODS
}; 