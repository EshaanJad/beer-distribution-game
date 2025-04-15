const Game = require('../../models/Game');
const User = require('../../models/User');
const agentService = require('./index');
const gameCoordinator = require('../gameCoordinator');

class AutoplayScheduler {
  constructor() {
    this.scheduledGames = new Map(); // gameId -> interval ID
    this.initialized = false;
  }

  /**
   * Initialize the scheduler
   */
  async initialize() {
    try {
      // Clear any existing scheduled tasks
      this.stopAllSchedulers();
      
      // Find all active games with autoplay enabled
      const games = await Game.find({
        status: 'Active',
        'configuration.agents.enabled': true,
        'configuration.agents.autoplay': true
      });
      
      // Start schedulers for these games
      for (const game of games) {
        await this.startScheduler(game.gameId);
      }
      
      console.log(`Autoplay scheduler initialized with ${this.scheduledGames.size} games`);
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize autoplay scheduler:', error);
      throw error;
    }
  }

  /**
   * Start the autoplay scheduler for a game
   * @param {string} gameId - ID of the game to schedule
   * @returns {boolean} - Success status
   */
  async startScheduler(gameId) {
    try {
      // Don't schedule if already scheduled
      if (this.scheduledGames.has(gameId)) {
        return true;
      }

      // Get the game
      const game = await Game.findOne({ gameId });
      if (!game) {
        console.error(`Game ${gameId} not found`);
        return false;
      }

      // Check if autoplay is enabled
      if (!game.configuration.agents || 
          !game.configuration.agents.enabled || 
          !game.configuration.agents.autoplay) {
        console.error(`Autoplay not enabled for game ${gameId}`);
        return false;
      }

      // Get the interval from configuration or use default
      const interval = game.configuration.agents.autoAdvanceInterval || 5000; // Default 5 seconds

      // Schedule the game processing
      const intervalId = setInterval(async () => {
        await this.processAutoplayTurn(gameId);
      }, interval);

      // Store the interval ID
      this.scheduledGames.set(gameId, intervalId);
      
      console.log(`Started autoplay scheduler for game ${gameId} with interval ${interval}ms`);
      return true;
    } catch (error) {
      console.error(`Error starting scheduler for game ${gameId}:`, error);
      return false;
    }
  }

  /**
   * Stop the autoplay scheduler for a game
   * @param {string} gameId - ID of the game to stop scheduling
   * @returns {boolean} - Success status
   */
  stopScheduler(gameId) {
    if (this.scheduledGames.has(gameId)) {
      clearInterval(this.scheduledGames.get(gameId));
      this.scheduledGames.delete(gameId);
      console.log(`Stopped autoplay scheduler for game ${gameId}`);
      return true;
    }
    return false;
  }

  /**
   * Stop all autoplay schedulers
   */
  stopAllSchedulers() {
    for (const [gameId, intervalId] of this.scheduledGames.entries()) {
      clearInterval(intervalId);
      console.log(`Stopped autoplay scheduler for game ${gameId}`);
    }
    this.scheduledGames.clear();
  }

  /**
   * Process a single turn for an autoplay game
   * @param {string} gameId - ID of the game to process
   * @returns {Object} - Result of the processing
   */
  async processAutoplayTurn(gameId) {
    try {
      // Get the game
      const game = await Game.findOne({ gameId });
      if (!game) {
        this.stopScheduler(gameId);
        return {
          success: false,
          error: 'Game not found'
        };
      }

      // Check if game is still active
      if (game.status !== 'Active') {
        this.stopScheduler(gameId);
        return {
          success: false,
          error: `Game is not active (status: ${game.status})`
        };
      }

      // Get AI players in the game
      const aiPlayers = game.players.filter(player => player.isAgent);
      
      // Skip if there are no AI players
      if (aiPlayers.length === 0) {
        return {
          success: false,
          error: 'No AI players in game'
        };
      }

      // Make decisions for all AI agents
      const decisions = await agentService.makeAgentDecisions(gameId);
      
      // If all AI agents have made their decisions, check if we should advance the week
      if (decisions.success && game.configuration.agents.autoAdvance) {
        // Get a human player (if any) to use for advancing the week
        const humanPlayer = game.players.find(player => !player.isAgent);
        
        // If no human players or all roles are AI-controlled, advance the week
        if (!humanPlayer || aiPlayers.length === game.players.length) {
          // Use the first AI player to advance the week
          const aiUser = await User.findById(aiPlayers[0].userId);
          
          if (aiUser) {
            await gameCoordinator.advanceWeek(gameId, aiUser);
          }
        }
      }

      return {
        success: true,
        data: {
          gameId,
          decisionsCount: decisions.success ? decisions.data.decisions.length : 0
        }
      };
    } catch (error) {
      console.error(`Error processing autoplay turn for game ${gameId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new AutoplayScheduler(); 