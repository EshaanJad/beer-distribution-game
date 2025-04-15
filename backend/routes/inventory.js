const express = require('express');
const { protect } = require('../middleware/auth');
const Game = require('../models/Game');
const GameState = require('../models/GameState');

const router = express.Router();

/**
 * @route   GET /api/inventory/:gameId/:role
 * @desc    Get inventory for a specific role in a game
 * @access  Private
 */
router.get('/:gameId/:role', protect, async (req, res) => {
  try {
    const { gameId, role } = req.params;
    
    if (!['Retailer', 'Wholesaler', 'Distributor', 'Factory'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role'
      });
    }
    
    // Check if user is part of the game
    const game = await Game.findOne({ gameId });
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    // Check if user is playing the requested role or is creator
    const userRole = game.players.find(player => 
      player.userId.toString() === req.user._id.toString()
    );
    
    const isCreator = game.createdBy.toString() === req.user._id.toString();
    
    if ((!userRole || userRole.role !== role) && !isCreator) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access inventory for this role'
      });
    }
    
    // Get game state for the current week
    const gameState = await GameState.findOne({ 
      gameId, 
      week: game.currentWeek 
    });
    
    if (!gameState) {
      return res.status(404).json({
        success: false,
        error: 'Game state not found'
      });
    }
    
    const inventoryData = gameState.playerStates[role.toLowerCase()];
    
    res.status(200).json({
      success: true,
      data: {
        role,
        gameId,
        week: game.currentWeek,
        inventory: inventoryData.inventory,
        backlog: inventoryData.backlog,
        incomingOrders: inventoryData.incomingOrders,
        outgoingOrders: inventoryData.outgoingOrders,
        currentCost: inventoryData.currentCost
      }
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/inventory/:gameId/:role/history
 * @desc    Get inventory history for a specific role in a game
 * @access  Private
 */
router.get('/:gameId/:role/history', protect, async (req, res) => {
  try {
    const { gameId, role } = req.params;
    
    if (!['Retailer', 'Wholesaler', 'Distributor', 'Factory'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role'
      });
    }
    
    // Check if user is part of the game
    const game = await Game.findOne({ gameId });
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    // Check if user is playing the requested role or is creator
    const userRole = game.players.find(player => 
      player.userId.toString() === req.user._id.toString()
    );
    
    const isCreator = game.createdBy.toString() === req.user._id.toString();
    
    if ((!userRole || userRole.role !== role) && !isCreator) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access inventory history for this role'
      });
    }
    
    // Get all game states for this game
    const gameStates = await GameState.find({ gameId }).sort({ week: 1 });
    
    const inventoryHistory = gameStates.map(state => ({
      week: state.week,
      inventory: state.playerStates[role.toLowerCase()].inventory,
      backlog: state.playerStates[role.toLowerCase()].backlog,
      incomingOrders: state.playerStates[role.toLowerCase()].incomingOrders,
      outgoingOrders: state.playerStates[role.toLowerCase()].outgoingOrders,
      currentCost: state.playerStates[role.toLowerCase()].currentCost
    }));
    
    res.status(200).json({
      success: true,
      count: inventoryHistory.length,
      data: inventoryHistory
    });
  } catch (error) {
    console.error('Get inventory history error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/inventory/:gameId
 * @desc    Get inventory for all roles in a game
 * @access  Private
 */
router.get('/:gameId', protect, async (req, res) => {
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
    
    // Get game state for the current week
    const gameState = await GameState.findOne({ 
      gameId, 
      week: game.currentWeek 
    });
    
    if (!gameState) {
      return res.status(404).json({
        success: false,
        error: 'Game state not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        gameId,
        week: game.currentWeek,
        playerStates: gameState.playerStates
      }
    });
  } catch (error) {
    console.error('Get all inventory error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router; 