const express = require('express');
const { protect } = require('../middleware/auth');
const gameCoordinator = require('../services/gameCoordinator');
const Game = require('../models/Game');
const Order = require('../models/Order');

const router = express.Router();

/**
 * @route   POST /api/orders/place
 * @desc    Place an order
 * @access  Private
 */
router.post('/place', protect, async (req, res) => {
  try {
    const { gameId, senderRole, recipientRole, quantity } = req.body;
    
    if (!gameId || !senderRole || !recipientRole || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Please provide gameId, senderRole, recipientRole, and quantity'
      });
    }
    
    const result = await gameCoordinator.processOrder(
      gameId,
      senderRole,
      recipientRole,
      quantity,
      req.user
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/orders/:gameId
 * @desc    Get all orders for a specific game
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
    
    // Get all orders for the game
    const orders = await Order.find({ gameId })
      .sort({ week: 1, placedAt: 1 })
      .populate('sender.userId', 'username')
      .populate('recipient.userId', 'username');
    
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/orders/game/:gameId/week/:week
 * @desc    Get orders for a specific game and week
 * @access  Private
 */
router.get('/game/:gameId/week/:week', protect, async (req, res) => {
  try {
    const { gameId, week } = req.params;
    
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
    
    // Get orders for the specified week
    const orders = await Order.find({ 
      gameId, 
      week: parseInt(week) 
    })
      .sort({ placedAt: 1 })
      .populate('sender.userId', 'username')
      .populate('recipient.userId', 'username');
    
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Get orders by week error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/orders/game/:gameId/role/:role
 * @desc    Get orders for a specific game and role
 * @access  Private
 */
router.get('/game/:gameId/role/:role', protect, async (req, res) => {
  try {
    const { gameId, role } = req.params;
    
    // Check if user is part of the game
    const game = await Game.findOne({ gameId });
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    // Check if user is playing the requested role
    const userRole = game.players.find(player => 
      player.userId.toString() === req.user._id.toString()
    );
    
    const isCreator = game.createdBy.toString() === req.user._id.toString();
    
    if ((!userRole || userRole.role !== role) && !isCreator) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access orders for this role'
      });
    }
    
    // Get orders where the specified role is either sender or recipient
    const orders = await Order.find({
      gameId,
      $or: [
        { 'sender.role': role },
        { 'recipient.role': role }
      ]
    })
      .sort({ week: 1, placedAt: 1 })
      .populate('sender.userId', 'username')
      .populate('recipient.userId', 'username');
    
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Get orders by role error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router; 