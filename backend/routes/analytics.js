const express = require('express');
const { protect } = require('../middleware/auth');
const Game = require('../models/Game');
const GameState = require('../models/GameState');
const Order = require('../models/Order');
const analyticsService = require('../services/analytics');

const router = express.Router();

/**
 * @route   GET /api/analytics/gameHistory/:gameId
 * @desc    Get historical data for a specific game
 * @access  Private
 */
router.get('/gameHistory/:gameId', protect, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // Check if user is part of the game
    const game = await Game.findOne({ gameId });
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    const isParticipant = game.players.some(player => 
      player.userId.toString() === req.user._id.toString()
    );
    
    const isCreator = game.createdBy.toString() === req.user._id.toString();
    
    if (!isParticipant && !isCreator) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this game'
      });
    }
    
    // Get all game states for this game
    const gameStates = await GameState.find({ gameId }).sort({ week: 1 });
    
    // Get all orders for this game
    const orders = await Order.find({ gameId }).sort({ week: 1, placedAt: 1 });
    
    // Process data for each week
    const weeklyData = gameStates.map(state => {
      const weekOrders = orders.filter(order => order.week === state.week);
      
      return {
        week: state.week,
        playerStates: state.playerStates,
        orders: weekOrders.map(order => ({
          id: order._id,
          sender: order.sender,
          recipient: order.recipient,
          quantity: order.quantity,
          status: order.status,
          deliveryWeek: order.deliveryWeek
        }))
      };
    });
    
    res.status(200).json({
      success: true,
      data: {
        gameId,
        currentWeek: game.currentWeek,
        configuration: game.configuration,
        weeklyData
      }
    });
  } catch (error) {
    console.error('Get game history error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/analytics/performance/:gameId
 * @desc    Get performance metrics for a specific game
 * @access  Private
 */
router.get('/performance/:gameId', protect, async (req, res) => {
  try {
    const { gameId } = req.params;
    const forceGenerate = req.query.forceGenerate === 'true';
    
    // Check if user is part of the game
    const game = await Game.findOne({ gameId });
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    const isParticipant = game.players.some(player => 
      player.userId.toString() === req.user._id.toString()
    );
    
    const isCreator = game.createdBy.toString() === req.user._id.toString();
    
    if (!isParticipant && !isCreator) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this game'
      });
    }
    
    // Get analytics data from service
    const analytics = await analyticsService.getGameAnalytics(gameId, forceGenerate);
    
    res.status(200).json({
      success: true,
      data: {
        gameId,
        currentWeek: game.currentWeek,
        playerPerformance: analytics.playerPerformance,
        bullwhipMetrics: analytics.bullwhipMetrics,
        blockchainMetrics: analytics.blockchainMetrics
      }
    });
  } catch (error) {
    console.error('Get performance metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/analytics/aggregate
 * @desc    Get aggregated analytics across all games
 * @access  Private (Admin only)
 */
router.get('/aggregate', protect, async (req, res) => {
  try {
    // Check if user has admin role
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this resource'
      });
    }
    
    // Parse date filters if provided
    const filters = {};
    
    if (req.query.startDate) {
      filters.startDate = req.query.startDate;
    }
    
    if (req.query.endDate) {
      filters.endDate = req.query.endDate;
    }
    
    // Get aggregated analytics from service
    const aggregatedData = await analyticsService.getAggregatedAnalytics(filters);
    
    res.status(200).json({
      success: true,
      data: aggregatedData
    });
  } catch (error) {
    console.error('Get aggregated analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   POST /api/analytics/generate/:gameId
 * @desc    Force generate analytics for a game
 * @access  Private
 */
router.post('/generate/:gameId', protect, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // Check if user is creator of the game
    const game = await Game.findOne({ gameId });
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    const isCreator = game.createdBy.toString() === req.user._id.toString();
    
    if (!isCreator && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to generate analytics for this game'
      });
    }
    
    // Generate analytics
    const analytics = await analyticsService.generateGameAnalytics(gameId);
    
    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Generate analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router; 