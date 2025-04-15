const express = require('express');
const { protect } = require('../middleware/auth');
const authService = require('../services/auth');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register user with traditional credentials
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const result = await authService.registerUser(req.body);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user with email and password
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const result = await authService.loginUser(req.body);
    
    if (!result.success) {
      return res.status(401).json(result);
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   POST /api/auth/wallet
 * @desc    Authenticate with a wallet signature
 * @access  Public
 */
router.post('/wallet', async (req, res) => {
  try {
    const { signature, message, walletAddress } = req.body;
    
    if (!signature || !message || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Please provide signature, message, and wallet address'
      });
    }
    
    const result = await authService.walletAuth(signature, message, walletAddress);
    
    if (!result.success) {
      return res.status(401).json(result);
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Wallet auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', protect, async (req, res) => {
  try {
    const result = await authService.getUserById(req.user._id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router; 