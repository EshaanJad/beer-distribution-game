const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const agentSystem = require('../services/agent/init');

// @route   GET /api/agents/status
// @desc    Get status of the agent system
// @access  Admin only
router.get('/status', protect, authorize('admin'), async (req, res) => {
  try {
    // Get all registered agents
    const games = agentSystem.agentService.algorithmicAgents;
    
    // Format response
    const formattedGames = [];
    for (const [gameId, agents] of games.entries()) {
      const gameAgents = [];
      for (const [role, config] of agents.entries()) {
        gameAgents.push({
          role,
          agentId: config.agentId,
          userId: config.userId,
          walletAddress: config.walletAddress,
          algorithm: {
            forecastHorizon: config.forecastHorizon,
            safetyFactor: config.safetyFactor,
            visibilityMode: config.visibilityMode
          }
        });
      }
      
      formattedGames.push({
        gameId,
        agents: gameAgents
      });
    }
    
    // Check scheduler status
    const scheduledGames = Array.from(agentSystem.scheduler.scheduledGames.keys());
    
    res.status(200).json({
      success: true,
      data: {
        isInitialized: agentSystem.agentService.initialized && agentSystem.scheduler.initialized,
        registeredGames: formattedGames,
        scheduledGames: scheduledGames
      }
    });
  } catch (error) {
    console.error('Error getting agent system status:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   POST /api/agents/register
// @desc    Register a new agent for a game
// @access  Admin only
router.post('/register', protect, authorize('admin'), async (req, res) => {
  try {
    const { gameId, role, settings } = req.body;
    
    if (!gameId || !role) {
      return res.status(400).json({
        success: false,
        error: 'Please provide gameId and role'
      });
    }
    
    const result = await agentSystem.agentService.registerAgent(gameId, role, settings);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error registering agent:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   POST /api/agents/setup/:gameId
// @desc    Set up agents for a game based on configuration
// @access  Admin or game creator
router.post('/setup/:gameId', protect, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // Authorization: Admin or game creator
    const result = await agentSystem.agentService.setupGameAgents(gameId);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error setting up game agents:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   POST /api/agents/autoplay/:gameId
// @desc    Enable or disable autoplay for a game
// @access  Admin or game creator
router.post('/autoplay/:gameId', protect, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { enabled, autoAdvance, interval } = req.body;
    
    let result;
    
    if (enabled) {
      // Enable autoplay
      result = await agentSystem.agentService.enableAutoplay(gameId, autoAdvance, interval);
    } else {
      // Disable autoplay
      result = await agentSystem.agentService.disableAutoplay(gameId);
    }
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error configuring autoplay:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   POST /api/agents/decide/:gameId
// @desc    Manually trigger agent decisions for a game
// @access  Admin or game creator
router.post('/decide/:gameId', protect, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const result = await agentSystem.agentService.makeAgentDecisions(gameId);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error making agent decisions:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router; 