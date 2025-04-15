const Game = require('../../models/Game');
const GameState = require('../../models/GameState');
const Order = require('../../models/Order');
const User = require('../../models/User');
const { ethers } = require('ethers');
const blockchainService = require('../blockchain');
const gameCoordinator = require('../gameCoordinator');
const walletUtils = require('../../utils/wallet');

// Will be initialized after export to avoid circular dependency
let scheduler = null;

/**
 * Agent Service - Implements the Modified Base-Stock Policy algorithm for AI players
 */
class AgentService {
  constructor() {
    this.algorithmicAgents = new Map(); // Map of gameId -> Map of role -> agent configuration
    this.wallets = new Map(); // Map of agentId -> wallet
    this.initialized = false;
  }

  /**
   * Set the scheduler service
   * @param {Object} schedulerService - The scheduler service instance
   */
  setScheduler(schedulerService) {
    scheduler = schedulerService;
  }

  /**
   * Initialize the Agent Service
   */
  async initialize() {
    try {
      console.log('Agent service initialized');
      this.initialized = true;
      
      // Restore agent configurations from database
      await this.restoreAgentConfigurations();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize agent service:', error);
      throw error;
    }
  }

  /**
   * Restore agent configurations from database
   */
  async restoreAgentConfigurations() {
    try {
      // Find all games with agents enabled
      const gamesWithAgents = await Game.find({
        'configuration.agents.enabled': true
      });
      
      for (const game of gamesWithAgents) {
        // Find all agent players in this game
        const agentPlayers = game.players.filter(player => player.isAgent);
        
        if (agentPlayers.length > 0) {
          // Create agent map for this game
          if (!this.algorithmicAgents.has(game.gameId)) {
            this.algorithmicAgents.set(game.gameId, new Map());
          }
          
          // Register each agent in memory
          for (const player of agentPlayers) {
            const user = await User.findById(player.userId).lean();
            
            if (user && user.isAgent) {
              const agentId = `agent-${game.gameId}-${player.role}-${user._id}`;
              
              // Store agent configuration
              this.algorithmicAgents.get(game.gameId).set(player.role, {
                forecastHorizon: game.configuration.agents.algorithmConfig.forecastHorizon,
                safetyFactor: game.configuration.agents.algorithmConfig.safetyFactor,
                visibilityMode: game.configuration.agents.algorithmConfig.visibilityMode,
                userId: user._id,
                walletAddress: user.walletAddress,
                agentId
              });
              
              console.log(`Restored agent ${agentId} for game ${game.gameId} in role ${player.role}`);
            }
          }
        }
      }
      
      console.log(`Restored agent configurations for ${this.algorithmicAgents.size} games`);
    } catch (error) {
      console.error('Error restoring agent configurations:', error);
    }
  }

  /**
   * Create a new algorithmic agent wallet
   * @param {string} agentId - Unique identifier for the agent
   * @returns {Object} wallet information
   */
  createAgentWallet(agentId) {
    // For deterministic testing, use the agentId as seed if in test environment
    let wallet;
    if (process.env.NODE_ENV === 'test') {
      wallet = walletUtils.generateDeterministicWallet(agentId);
    } else {
      wallet = walletUtils.generateAgentWallet();
    }
    
    this.wallets.set(agentId, wallet);
    return wallet;
  }

  /**
   * Register an algorithmic agent in the system
   * @param {string} gameId - ID of the game
   * @param {string} role - Role in the supply chain
   * @param {Object} settings - Agent settings including algorithm parameters
   * @returns {Object} - Result with agent data
   */
  async registerAgent(gameId, role, settings = {}) {
    try {
      // Create a unique agent ID
      const agentId = `agent-${gameId}-${role}-${Date.now()}`;
      
      // Create a wallet for the agent
      const wallet = this.createAgentWallet(agentId);
      
      // Create user record for the agent if it doesn't exist
      let user = await User.findOne({ username: `AI-${role}` });
      
      if (!user) {
        user = await User.create({
          username: `AI-${role}`,
          email: `ai-${role.toLowerCase()}@beergame.ai`,
          password: ethers.utils.id(wallet.privateKey).substring(0, 12), // Generate a password from the private key
          walletAddress: wallet.address,
          isAgent: true // Flag as an AI agent
        });
      }
      
      // Register agent parameters
      if (!this.algorithmicAgents.has(gameId)) {
        this.algorithmicAgents.set(gameId, new Map());
      }
      
      // Save agent configuration
      const defaultSettings = {
        forecastHorizon: 4, // Default to 4 weeks
        safetyFactor: 0.5, // Default safety factor
        visibilityMode: 'traditional', // 'traditional' or 'blockchain'
        userId: user._id,
        walletAddress: wallet.address,
        agentId
      };
      
      const agentConfig = { ...defaultSettings, ...settings };
      this.algorithmicAgents.get(gameId).set(role, agentConfig);
      
      // If blockchain is enabled for the game, register player on blockchain
      const game = await Game.findOne({ gameId }).lean();
      if (game && game.configuration.blockchainEnabled) {
        try {
          // Register player on blockchain
          await blockchainService.registerPlayer(`AI-${role}`, wallet.address);
          
          // Map role string to number for blockchain
          const roleMap = {
            'Retailer': 1,
            'Wholesaler': 2,
            'Distributor': 3,
            'Factory': 4
          };
          
          // Assign role on blockchain
          await blockchainService.assignRole(gameId, wallet.address, roleMap[role]);
        } catch (error) {
          console.error(`Error registering agent ${agentId} on blockchain:`, error);
        }
      }
      
      return {
        success: true,
        data: {
          agentId,
          role,
          userId: user._id,
          username: user.username,
          walletAddress: wallet.address
        }
      };
    } catch (error) {
      console.error('Register agent error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate the order quantity using the Modified Base-Stock Policy
   * @param {string} gameId - ID of the game
   * @param {string} role - Role in the supply chain
   * @param {Object} gameState - Current game state data
   * @param {Array} orders - Historical orders
   * @param {Object} agentConfig - Algorithm configuration
   * @returns {number} - Calculated order quantity
   */
  async calculateOrderQuantity(gameId, role, gameState, orders, agentConfig) {
    const { forecastHorizon, safetyFactor, visibilityMode } = agentConfig;
    const currentWeek = gameState.week;
    
    // Get role-specific state
    const playerState = gameState.playerStates[role.toLowerCase()];
    
    // Calculate current inventory and backlog
    const currentInventory = playerState.inventory;
    const backlog = playerState.backlog;
    
    // Get incoming supply
    const incomingSupply = await this.calculateIncomingSupply(gameId, role, currentWeek);
    
    // Determine observed demand based on visibility mode
    const observedDemand = this.getObservedDemand(gameId, role, orders, currentWeek, visibilityMode);
    
    // Calculate average demand
    const avgDemand = this.calculateAverageDemand(observedDemand);
    
    // Set target inventory level
    const targetInventory = avgDemand * forecastHorizon + safetyFactor * avgDemand;
    
    // Calculate order quantity
    const orderQuantity = Math.max(0, Math.round(targetInventory - currentInventory + backlog - incomingSupply));
    
    console.log(`[Agent ${role}] Week ${currentWeek} - Order quantity calculation:`, {
      currentInventory,
      backlog,
      incomingSupply,
      avgDemand,
      targetInventory,
      orderQuantity
    });
    
    return orderQuantity;
  }

  /**
   * Calculate average demand from observed demand history
   * @param {Array} demandHistory - Array of demand quantities
   * @returns {number} - Average demand
   */
  calculateAverageDemand(demandHistory) {
    if (!demandHistory || demandHistory.length === 0) {
      return 4; // Default starting value if no history
    }
    
    const sum = demandHistory.reduce((total, current) => total + current, 0);
    return sum / demandHistory.length;
  }

  /**
   * Get observed demand based on role and visibility mode
   * @param {string} gameId - ID of the game
   * @param {string} role - Role in the supply chain
   * @param {Array} orders - Historical orders
   * @param {number} currentWeek - Current week
   * @param {string} visibilityMode - 'traditional' or 'blockchain'
   * @returns {Array} - Array of observed demand quantities
   */
  getObservedDemand(gameId, role, orders, currentWeek, visibilityMode) {
    // Filter orders to get demand for this role
    const relevantOrders = orders.filter(order => {
      // Traditional visibility: only see immediate downstream orders
      if (visibilityMode === 'traditional') {
        return order.recipient.role === role && order.week < currentWeek;
      } 
      // Blockchain visibility: can see all downstream orders
      else if (visibilityMode === 'blockchain') {
        // Retailer can see customer demand directly
        if (role === 'Retailer') {
          return order.recipient.role === 'Retailer' && order.week < currentWeek;
        }
        // Other roles can see orders further downstream
        else if (role === 'Wholesaler') {
          return (order.recipient.role === 'Retailer' || order.recipient.role === 'Wholesaler') && order.week < currentWeek;
        }
        else if (role === 'Distributor') {
          return ['Retailer', 'Wholesaler', 'Distributor'].includes(order.recipient.role) && order.week < currentWeek;
        }
        else if (role === 'Factory') {
          return ['Retailer', 'Wholesaler', 'Distributor', 'Factory'].includes(order.recipient.role) && order.week < currentWeek;
        }
      }
      return false;
    });
    
    // Extract quantities
    return relevantOrders.map(order => order.quantity);
  }

  /**
   * Calculate incoming supply for a role
   * @param {string} gameId - ID of the game
   * @param {string} role - Role in the supply chain
   * @param {number} currentWeek - Current week
   * @returns {number} - Total incoming supply
   */
  async calculateIncomingSupply(gameId, role, currentWeek) {
    try {
      // Find all incoming orders that are in-transit (Shipped status)
      const incomingOrders = await Order.find({
        gameId,
        'recipient.role': role,
        status: 'Shipped',
        deliveryWeek: { $gt: currentWeek }
      });
      
      // Sum up quantities
      return incomingOrders.reduce((total, order) => total + order.quantity, 0);
    } catch (error) {
      console.error(`Error calculating incoming supply for ${role}:`, error);
      return 0;
    }
  }

  /**
   * Make decisions for all agents in a game
   * @param {string} gameId - ID of the game
   * @returns {Object} - Result with decisions data
   */
  async makeAgentDecisions(gameId) {
    try {
      // Check if game has agents
      if (!this.algorithmicAgents.has(gameId)) {
        return {
          success: false,
          error: 'No agents registered for this game'
        };
      }
      
      // Get current game state
      const game = await Game.findOne({ gameId });
      if (!game) {
        return {
          success: false,
          error: 'Game not found'
        };
      }
      
      if (game.status !== 'Active') {
        return {
          success: false,
          error: 'Game is not active'
        };
      }
      
      const currentWeek = game.currentWeek;
      const gameState = await GameState.findOne({ gameId, week: currentWeek });
      
      if (!gameState) {
        return {
          success: false,
          error: 'Game state not found'
        };
      }
      
      // Get historical orders for the game
      const orders = await Order.find({ gameId, week: { $lt: currentWeek } }).sort({ week: 1 });
      
      // Process decisions for each agent
      const decisions = [];
      
      for (const [role, agentConfig] of this.algorithmicAgents.get(gameId).entries()) {
        // Calculate order quantity using the algorithm
        const orderQuantity = await this.calculateOrderQuantity(
          gameId,
          role,
          gameState,
          orders,
          agentConfig
        );
        
        // Determine recipient role based on sender role
        let recipientRole;
        switch (role) {
          case 'Retailer':
            recipientRole = 'Wholesaler';
            break;
          case 'Wholesaler':
            recipientRole = 'Distributor';
            break;
          case 'Distributor':
            recipientRole = 'Factory';
            break;
          case 'Factory':
            recipientRole = null; // Factory produces (no recipient)
            break;
        }
        
        if (recipientRole) {
          // Find user record for this agent
          const user = await User.findById(agentConfig.userId);
          
          if (!user) {
            console.error(`User not found for agent in role ${role}`);
            continue;
          }
          
          // Place the order
          const orderResult = await gameCoordinator.processOrder(
            gameId,
            role,
            recipientRole,
            orderQuantity,
            user
          );
          
          decisions.push({
            role,
            recipientRole,
            orderQuantity,
            result: orderResult
          });
        }
      }
      
      return {
        success: true,
        data: {
          gameId,
          week: currentWeek,
          decisions
        }
      };
    } catch (error) {
      console.error('Make agent decisions error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Set up AI agents for a game based on configuration
   * @param {string} gameId - ID of the game
   * @returns {Object} - Result with setup data
   */
  async setupGameAgents(gameId) {
    try {
      // Find the game
      const game = await Game.findOne({ gameId });
      if (!game) {
        return {
          success: false,
          error: 'Game not found'
        };
      }
      
      // Check if agents are enabled for this game
      if (!game.configuration.agents || !game.configuration.agents.enabled) {
        return {
          success: false,
          error: 'Agents are not enabled for this game'
        };
      }
      
      const { roles, algorithmConfig } = game.configuration.agents;
      const agentRoles = [];
      const registeredAgents = [];
      
      // Determine which roles should be filled by agents
      if (roles.retailer) agentRoles.push('Retailer');
      if (roles.wholesaler) agentRoles.push('Wholesaler');
      if (roles.distributor) agentRoles.push('Distributor');
      if (roles.factory) agentRoles.push('Factory');
      
      // Fill empty roles if configured
      if (game.configuration.agents.fillEmptyRoles) {
        const occupiedRoles = game.players.map(player => player.role);
        const allRoles = ['Retailer', 'Wholesaler', 'Distributor', 'Factory'];
        
        allRoles.forEach(role => {
          if (!occupiedRoles.includes(role) && !agentRoles.includes(role)) {
            agentRoles.push(role);
          }
        });
      }
      
      // Register agents for each role
      for (const role of agentRoles) {
        // Skip if role is already occupied
        const playerExists = game.players.some(player => player.role === role);
        if (playerExists) continue;
        
        // Register agent
        const registrationResult = await this.registerAgent(gameId, role, {
          forecastHorizon: algorithmConfig.forecastHorizon,
          safetyFactor: algorithmConfig.safetyFactor,
          visibilityMode: algorithmConfig.visibilityMode
        });
        
        if (registrationResult.success) {
          // Update the game with the AI player
          const agentUser = await User.findById(registrationResult.data.userId);
          
          // Add player to game
          game.players.push({
            userId: agentUser._id,
            role: role,
            joined: new Date(),
            isActive: true,
            isAgent: true
          });
          
          registeredAgents.push({
            role,
            agentId: registrationResult.data.agentId,
            userId: agentUser._id.toString(),
            username: agentUser.username
          });
        }
      }
      
      // Save game with updated players
      await game.save();
      
      return {
        success: true,
        data: {
          gameId,
          registeredAgents
        }
      };
    } catch (error) {
      console.error('Setup game agents error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enable autoplay for a game
   * @param {string} gameId - ID of the game
   * @param {boolean} autoAdvance - Whether to automatically advance weeks
   * @param {number} interval - Interval between autoplay turns in ms
   * @returns {Object} - Result of the operation
   */
  async enableAutoplay(gameId, autoAdvance = true, interval = 5000) {
    try {
      // Find the game
      const game = await Game.findOne({ gameId });
      if (!game) {
        return {
          success: false,
          error: 'Game not found'
        };
      }
      
      // Check if agents are enabled
      if (!game.configuration.agents || !game.configuration.agents.enabled) {
        return {
          success: false,
          error: 'Agents are not enabled for this game'
        };
      }
      
      // Update autoplay configuration
      game.configuration.agents.autoplay = true;
      game.configuration.agents.autoAdvance = autoAdvance;
      game.configuration.agents.autoAdvanceInterval = interval;
      
      // Save the game
      await game.save();
      
      // Start the scheduler if the game is active
      if (game.status === 'Active' && scheduler) {
        await scheduler.startScheduler(gameId);
      }
      
      return {
        success: true,
        data: {
          gameId,
          autoplay: true,
          autoAdvance,
          interval
        }
      };
    } catch (error) {
      console.error('Enable autoplay error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Disable autoplay for a game
   * @param {string} gameId - ID of the game
   * @returns {Object} - Result of the operation
   */
  async disableAutoplay(gameId) {
    try {
      // Find the game
      const game = await Game.findOne({ gameId });
      if (!game) {
        return {
          success: false,
          error: 'Game not found'
        };
      }
      
      // Update autoplay configuration
      if (game.configuration.agents) {
        game.configuration.agents.autoplay = false;
        
        // Save the game
        await game.save();
      }
      
      // Stop the scheduler
      if (scheduler) {
        scheduler.stopScheduler(gameId);
      }
      
      return {
        success: true,
        data: {
          gameId,
          autoplay: false
        }
      };
    } catch (error) {
      console.error('Disable autoplay error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

const agentService = new AgentService();
module.exports = agentService; 