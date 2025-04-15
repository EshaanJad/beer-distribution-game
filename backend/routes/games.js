const express = require('express');
const { protect } = require('../middleware/auth');
const gameCoordinator = require('../services/gameCoordinator');
const Game = require('../models/Game');
const GameState = require('../models/GameState');

const router = express.Router();

/**
 * @route   POST /api/games/create
 * @desc    Create a new game
 * @access  Private
 */
router.post('/create', protect, async (req, res) => {
  try {
    const result = await gameCoordinator.createGame(req.body, req.user);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   POST /api/games/:gameId/join
 * @desc    Join an existing game
 * @access  Private
 */
router.post('/:gameId/join', protect, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { role } = req.body;
    
    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a role'
      });
    }
    
    const result = await gameCoordinator.joinGame(gameId, { role }, req.user);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Join game error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   POST /api/games/join
 * @desc    Join an existing game (alternative endpoint)
 * @access  Private
 */
router.post('/join', protect, async (req, res) => {
  try {
    const { gameId, role } = req.body;
    
    if (!gameId || !role) {
      return res.status(400).json({
        success: false,
        error: 'Please provide gameId and role'
      });
    }
    
    const result = await gameCoordinator.joinGame(gameId, { role }, req.user);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Join game error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   POST /api/games/:gameId/start
 * @desc    Start a game
 * @access  Private
 */
router.post('/:gameId/start', protect, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const result = await gameCoordinator.startGame(gameId, req.user);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   POST /api/games/:gameId/advance
 * @desc    Advance the game to the next week
 * @access  Private
 */
router.post('/:gameId/advance', protect, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const result = await gameCoordinator.advanceWeek(gameId, req.user);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Advance week error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/games
 * @desc    Get all games for the authenticated user
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const games = await Game.find({
      $or: [
        { createdBy: req.user._id },
        { 'players.userId': req.user._id }
      ]
    }).select('gameId status currentWeek configuration players createdAt');
    
    res.status(200).json({
      success: true,
      count: games.length,
      data: games
    });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/games/:gameId
 * @desc    Get a specific game
 * @access  Private
 */
router.get('/:gameId', protect, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const game = await Game.findOne({ gameId })
      .populate('createdBy', 'username email')
      .populate('players.userId', 'username email walletAddress');
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    // Check if user is part of the game
    const isParticipant = game.players.some(player => 
      player.userId._id.toString() === req.user._id.toString()
    );
    
    const isCreator = game.createdBy._id.toString() === req.user._id.toString();
    
    if (!isParticipant && !isCreator) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this game'
      });
    }
    
    // Get current game state
    const gameState = await GameState.findOne({
      gameId: game.gameId,
      week: game.currentWeek
    });
    
    res.status(200).json({
      success: true,
      data: {
        game,
        currentState: gameState
      }
    });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/games/:gameId/state/:week
 * @desc    Get game state for a specific week
 * @access  Private
 */
router.get('/:gameId/state/:week', protect, async (req, res) => {
  try {
    const { gameId, week } = req.params;
    
    const game = await Game.findOne({ gameId });
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    // Check if user is part of the game
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
    
    // Get game state for the specified week
    const gameState = await GameState.findOne({
      gameId: game.gameId,
      week: parseInt(week)
    });
    
    if (!gameState) {
      return res.status(404).json({
        success: false,
        error: 'Game state not found for the specified week'
      });
    }
    
    res.status(200).json({
      success: true,
      data: gameState
    });
  } catch (error) {
    console.error('Get game state error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router; 