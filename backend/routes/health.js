const express = require('express');
const mongoose = require('mongoose');
const os = require('os');

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Check API health status
 * @access  Public
 */
router.get('/', async (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  
  const health = {
    status: dbConnected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      connected: dbConnected,
      name: mongoose.connection.name || 'N/A'
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      memory: {
        total: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
        free: `${Math.round(os.freemem() / 1024 / 1024)} MB`,
        usage: `${Math.round((os.totalmem() - os.freemem()) / os.totalmem() * 100)}%`
      },
      cpus: os.cpus().length
    },
    services: {
      websocket: true,
      blockchain: process.env.BLOCKCHAIN_ENABLED === 'true',
      agents: process.env.ENABLE_AGENT_SYSTEM === 'true'
    }
  };
  
  res.status(dbConnected ? 200 : 503).json(health);
});

/**
 * @route   GET /api/health/ready
 * @desc    Check API readiness status (for Kubernetes)
 * @access  Public
 */
router.get('/ready', (req, res) => {
  const isReady = mongoose.connection.readyState === 1;
  
  if (isReady) {
    res.status(200).send('ok');
  } else {
    res.status(503).send('not ready');
  }
});

/**
 * @route   GET /api/health/live
 * @desc    Check API liveness status (for Kubernetes)
 * @access  Public
 */
router.get('/live', (req, res) => {
  res.status(200).send('ok');
});

module.exports = router; 