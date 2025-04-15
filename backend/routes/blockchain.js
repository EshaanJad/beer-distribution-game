const express = require('express');
const { protect } = require('../middleware/auth');
const synchronizationService = require('../services/synchronization');
const Game = require('../models/Game');

const router = express.Router();

/**
 * @route   POST /api/blockchain/sync/:gameId
 * @desc    Manually trigger synchronization for a specific game
 * @access  Private
 */
router.post('/sync/:gameId', protect, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // Find the game to check permissions
    const game = await Game.findOne({ gameId });
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    // Check if user is creator or part of the game
    const isCreator = game.createdBy.toString() === req.user._id.toString();
    const isParticipant = game.players.some(player => 
      player.userId.toString() === req.user._id.toString()
    );
    
    if (!isCreator && !isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to sync this game'
      });
    }
    
    // Run synchronization
    const result = await synchronizationService.runFullSynchronization(gameId);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Sync game error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   POST /api/blockchain/sync-all
 * @desc    Manually trigger synchronization for all active games
 * @access  Private (Admin only)
 */
router.post('/sync-all', protect, async (req, res) => {
  try {
    // Check if user has admin role
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to sync all games'
      });
    }
    
    // Run full synchronization
    const result = await synchronizationService.runFullSynchronization();
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Sync all games error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/blockchain/status/:gameId
 * @desc    Get blockchain synchronization status for a game
 * @access  Private
 */
router.get('/status/:gameId', protect, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // Find the game to check permissions
    const game = await Game.findOne({ gameId });
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    // Check if user is creator or part of the game
    const isCreator = game.createdBy.toString() === req.user._id.toString();
    const isParticipant = game.players.some(player => 
      player.userId.toString() === req.user._id.toString()
    );
    
    if (!isCreator && !isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this game'
      });
    }
    
    // Get pending orders that need synchronization
    const pendingOrdersCount = await synchronizationService.getPendingOrdersCount(gameId);
    
    res.status(200).json({
      success: true,
      data: {
        gameId,
        contractAddress: game.contractAddress,
        status: game.status,
        pendingOrdersCount,
        lastSynced: game.lastSynced || null
      }
    });
  } catch (error) {
    console.error('Get blockchain status error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router; 