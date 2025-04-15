const express = require('express');
const { protect } = require('../middleware/auth');
const dataRetentionService = require('../services/dataRetention');
const scheduler = require('../utils/scheduler');

const router = express.Router();

/**
 * Admin role middleware
 */
const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required for this resource'
    });
  }
  next();
};

/**
 * @route   POST /api/admin/data-retention/run
 * @desc    Manually trigger data retention process
 * @access  Private (Admin only)
 */
router.post('/data-retention/run', protect, requireAdmin, async (req, res) => {
  try {
    const result = await scheduler.runTaskNow('dataRetention');
    res.status(200).json(result);
  } catch (error) {
    console.error('Run data retention error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   PUT /api/admin/data-retention/config
 * @desc    Update data retention configuration
 * @access  Private (Admin only)
 */
router.put('/data-retention/config', protect, requireAdmin, async (req, res) => {
  try {
    const { retentionPeriods } = req.body;
    
    if (!retentionPeriods || typeof retentionPeriods !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid retention periods configuration'
      });
    }
    
    // Validate retention periods
    const validPeriods = ['completedGames', 'incompleteGames', 'gameStates', 'orders', 'analyticsData'];
    const invalidPeriods = Object.keys(retentionPeriods).filter(key => !validPeriods.includes(key));
    
    if (invalidPeriods.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid retention period keys: ${invalidPeriods.join(', ')}`
      });
    }
    
    // Validate that all retention periods are positive numbers
    for (const [key, value] of Object.entries(retentionPeriods)) {
      if (typeof value !== 'number' || value <= 0) {
        return res.status(400).json({
          success: false,
          error: `Retention period for '${key}' must be a positive number`
        });
      }
    }
    
    // Update retention periods
    dataRetentionService.setRetentionPeriods(retentionPeriods);
    
    res.status(200).json({
      success: true,
      message: 'Data retention configuration updated',
      retentionPeriods: {
        ...dataRetentionService.DEFAULT_RETENTION_PERIODS,
        ...retentionPeriods
      }
    });
  } catch (error) {
    console.error('Update data retention config error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/admin/data-retention/config
 * @desc    Get current data retention configuration
 * @access  Private (Admin only)
 */
router.get('/data-retention/config', protect, requireAdmin, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      retentionPeriods: dataRetentionService.DEFAULT_RETENTION_PERIODS
    });
  } catch (error) {
    console.error('Get data retention config error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/admin/archived-games
 * @desc    Get list of archived games
 * @access  Private (Admin only)
 */
router.get('/archived-games', protect, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    // Import ArchivedGame model here to avoid circular dependency
    const ArchivedGame = require('../models/ArchivedGame');
    
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { archivedAt: -1 }
    };
    
    const archivedGames = await ArchivedGame.find({})
      .sort(options.sort)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .select('gameId createdBy status createdAt completedAt archivedAt players.userId players.role');
    
    const total = await ArchivedGame.countDocuments({});
    
    res.status(200).json({
      success: true,
      count: archivedGames.length,
      total,
      pages: Math.ceil(total / options.limit),
      currentPage: options.page,
      data: archivedGames
    });
  } catch (error) {
    console.error('Get archived games error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/admin/archived-games/:gameId
 * @desc    Get details of a specific archived game
 * @access  Private (Admin only)
 */
router.get('/archived-games/:gameId', protect, requireAdmin, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // Import ArchivedGame model here to avoid circular dependency
    const ArchivedGame = require('../models/ArchivedGame');
    
    const archivedGame = await ArchivedGame.findOne({ gameId })
      .populate('createdBy', 'username email')
      .populate('players.userId', 'username email');
    
    if (!archivedGame) {
      return res.status(404).json({
        success: false,
        error: 'Archived game not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: archivedGame
    });
  } catch (error) {
    console.error('Get archived game error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router; 