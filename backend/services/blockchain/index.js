const { ethers } = require('ethers');
const PlayerRegistryABI = require('./abis/PlayerRegistry.json').abi;
const GameFactoryABI = require('./abis/GameFactory.json').abi;
const GameInstanceABI = require('./abis/GameInstance.json').abi;
const Game = require('../../models/Game');
const Order = require('../../models/Order');
const GameState = require('../../models/GameState');
const User = require('../../models/User');

let websocketService = null;

class BlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.playerRegistry = null;
    this.gameFactory = null;
    this.gameInstances = {};
    this.initialized = false;
  }

  /**
   * Check if the blockchain service is initialized
   * @returns {boolean} - Whether the service is initialized
   */
  isInitialized() {
    return this.initialized === true;
  }

  /**
   * Set the websocket service for notifications
   * @param {object} service - WebSocket service instance
   */
  setWebSocketService(service) {
    websocketService = service;
  }

  /**
   * Initialize the blockchain service
   */
  async initialize() {
    try {
      // Connect to the Ethereum provider
      this.provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
      
      // Create signer using private key
      this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
      
      // Create contract instances
      this.playerRegistry = new ethers.Contract(
        process.env.PLAYER_REGISTRY_ADDRESS,
        PlayerRegistryABI,
        this.wallet
      );
      
      this.gameFactory = new ethers.Contract(
        process.env.GAME_FACTORY_ADDRESS,
        GameFactoryABI,
        this.wallet
      );
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.initialized = true;
      console.log('Blockchain service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  /**
   * Get a GameInstance contract by address
   * @param {string} gameAddress - Address of the game instance contract
   * @returns {ethers.Contract} - Game instance contract
   */
  getGameInstance(gameAddress) {
    if (!this.gameInstances[gameAddress]) {
      this.gameInstances[gameAddress] = new ethers.Contract(
        gameAddress,
        GameInstanceABI,
        this.wallet
      );
      
      // Setup event listeners for this game instance
      this.setupGameInstanceEventListeners(this.gameInstances[gameAddress]);
    }
    return this.gameInstances[gameAddress];
  }

  /**
   * Setup event listeners for contracts
   */
  setupEventListeners() {
    // PlayerRegistry events
    this.playerRegistry.on('PlayerRegistered', async (playerAddress, username) => {
      console.log(`Player registered: ${username} (${playerAddress})`);
      
      try {
        // Find and update user in the database with wallet address if needed
        const user = await User.findOne({ walletAddress: playerAddress });
        if (user) {
          // Update the user's data if needed
          if (user.username !== username) {
            user.username = username;
            await user.save();
          }
        }
      } catch (error) {
        console.error('Error processing PlayerRegistered event:', error);
      }
    });
    
    this.playerRegistry.on('PlayerRoleAssigned', async (gameId, playerAddress, role) => {
      console.log(`Player role assigned: ${playerAddress} as role ${role} in game ${gameId}`);
      
      try {
        // Find the game in the database
        const game = await Game.findOne({ gameId });
        if (!game) {
          console.error(`Game ${gameId} not found in database`);
          return;
        }
        
        // Find the user by wallet address
        const user = await User.findOne({ walletAddress: playerAddress });
        if (!user) {
          console.error(`User with wallet ${playerAddress} not found`);
          return;
        }
        
        // Map role number to string
        const roleMap = {
          1: 'Retailer',
          2: 'Wholesaler',
          3: 'Distributor',
          4: 'Factory'
        };
        
        const roleString = roleMap[role.toString()];
        
        // Check if the player is already in the game
        const playerExists = game.players.some(player => 
          player.userId.toString() === user._id.toString()
        );
        
        if (!playerExists) {
          // Add player to the game
          game.players.push({
            userId: user._id,
            role: roleString,
            joined: new Date(),
            isActive: true
          });
          
          await game.save();
          
          // Notify via WebSocket if available
          if (websocketService) {
            websocketService.broadcastUpdate(gameId, {
              type: 'PLAYER_JOINED',
              player: {
                userId: user._id.toString(),
                username: user.username,
                role: roleString
              }
            });
          }
        }
      } catch (error) {
        console.error('Error processing PlayerRoleAssigned event:', error);
      }
    });
    
    // Game Factory events
    this.gameFactory.on('GameCreated', async (gameId, gameAddress, creator) => {
      console.log(`Game created: ${gameId} at address ${gameAddress} by ${creator}`);
      
      try {
        // Add game instance to cache
        this.getGameInstance(gameAddress);
        
        // Find the game in the database and update its contract address
        const game = await Game.findOne({ gameId });
        if (game) {
          game.contractAddress = gameAddress;
          await game.save();
          
          console.log(`Updated game ${gameId} with contract address ${gameAddress}`);
          
          // Notify via WebSocket if available
          if (websocketService) {
            websocketService.broadcastTransaction(gameId, {
              type: 'GAME_CREATED',
              gameId,
              contractAddress: gameAddress
            });
          }
        } else {
          console.error(`Game ${gameId} not found in database`);
        }
      } catch (error) {
        console.error('Error processing GameCreated event:', error);
      }
    });
    
    this.gameFactory.on('GameStatusUpdated', async (gameId, active) => {
      console.log(`Game status updated: ${gameId} - Active: ${active}`);
      
      try {
        // Update game status in the database
        const game = await Game.findOne({ gameId });
        if (game) {
          game.status = active ? 'Active' : 'Completed';
          await game.save();
          
          // Notify via WebSocket if available
          if (websocketService) {
            websocketService.broadcastUpdate(gameId, {
              type: 'GAME_STATUS_UPDATED',
              gameId,
              status: game.status
            });
          }
        }
      } catch (error) {
        console.error('Error processing GameStatusUpdated event:', error);
      }
    });
  }
  
  /**
   * Setup event listeners for a game instance contract
   * @param {ethers.Contract} gameInstance - Game instance contract
   */
  setupGameInstanceEventListeners(gameInstance) {
    // Get the game ID from the contract
    gameInstance.gameId().then(async (gameId) => {
      // OrderPlaced event
      gameInstance.on('OrderPlaced', async (orderId, gameIdEvent, senderRole, recipientRole, quantity) => {
        console.log(`Order placed: ${orderId} in game ${gameIdEvent} from ${senderRole} to ${recipientRole} for ${quantity} units`);
        
        try {
          // Map role numbers to strings
          const roleMap = {
            1: 'Retailer',
            2: 'Wholesaler',
            3: 'Distributor',
            4: 'Factory'
          };
          
          const senderRoleStr = roleMap[senderRole.toString()];
          const recipientRoleStr = roleMap[recipientRole.toString()];
          
          // Find the game
          const game = await Game.findOne({ gameId: gameIdEvent });
          if (!game) {
            console.error(`Game ${gameIdEvent} not found in database`);
            return;
          }
          
          // Find sender and recipient users
          const senderPlayer = game.players.find(p => p.role === senderRoleStr);
          const recipientPlayer = game.players.find(p => p.role === recipientRoleStr);
          
          if (!senderPlayer || !recipientPlayer) {
            console.error(`Could not find sender or recipient in game ${gameIdEvent}`);
            return;
          }
          
          // Update or create order in the database
          let order = await Order.findOne({ 
            gameId: gameIdEvent,
            'blockchainData.transactionHash': { $exists: true }, 
            'sender.role': senderRoleStr, 
            'recipient.role': recipientRoleStr,
            quantity: quantity.toString()
          });
          
          if (!order) {
            // Create new order
            order = new Order({
              gameId: gameIdEvent,
              week: game.currentWeek,
              sender: {
                role: senderRoleStr,
                userId: senderPlayer.userId
              },
              recipient: {
                role: recipientRoleStr,
                userId: recipientPlayer.userId
              },
              quantity: quantity.toString(),
              status: 'Pending',
              deliveryWeek: game.currentWeek + game.configuration.orderDelay,
              blockchainData: {
                transactionHash: '', // Will be updated when we get the transaction receipt
                confirmed: true
              }
            });
            
            await order.save();
          }
          
          // Notify via WebSocket if available
          if (websocketService) {
            websocketService.broadcastTransaction(gameIdEvent, {
              type: 'ORDER_PLACED',
              orderId: orderId.toString(),
              sender: senderRoleStr,
              recipient: recipientRoleStr,
              quantity: quantity.toString()
            });
          }
        } catch (error) {
          console.error('Error processing OrderPlaced event:', error);
        }
      });
      
      // OrderShipped event
      gameInstance.on('OrderShipped', async (orderId, gameIdEvent, week) => {
        console.log(`Order shipped: ${orderId} in game ${gameIdEvent} at week ${week}`);
        
        try {
          // Find the order in the database by orderId (from blockchain)
          // Note: We might need to store the blockchain orderId in our database to make this lookup easier
          const orders = await Order.find({ 
            gameId: gameIdEvent,
            week: week.toString(),
            status: 'Pending'
          });
          
          if (orders.length > 0) {
            // Update the first matching order (ideally we should have a more precise way to match)
            const order = orders[0];
            order.status = 'Shipped';
            await order.save();
            
            // Notify via WebSocket if available
            if (websocketService) {
              websocketService.broadcastTransaction(gameIdEvent, {
                type: 'ORDER_SHIPPED',
                orderId: orderId.toString(),
                week: week.toString()
              });
            }
          }
        } catch (error) {
          console.error('Error processing OrderShipped event:', error);
        }
      });
      
      // OrderDelivered event
      gameInstance.on('OrderDelivered', async (orderId, gameIdEvent, week) => {
        console.log(`Order delivered: ${orderId} in game ${gameIdEvent} at week ${week}`);
        
        try {
          // Find the order in the database by orderId (from blockchain)
          const orders = await Order.find({ 
            gameId: gameIdEvent,
            status: 'Shipped'
          });
          
          if (orders.length > 0) {
            // Update the first matching order
            const order = orders[0];
            order.status = 'Delivered';
            await order.save();
            
            // Notify via WebSocket if available
            if (websocketService) {
              websocketService.broadcastTransaction(gameIdEvent, {
                type: 'ORDER_DELIVERED',
                orderId: orderId.toString(),
                week: week.toString()
              });
            }
          }
        } catch (error) {
          console.error('Error processing OrderDelivered event:', error);
        }
      });
      
      // WeekAdvanced event
      gameInstance.on('WeekAdvanced', async (gameIdEvent, newWeek) => {
        console.log(`Week advanced: ${gameIdEvent} to week ${newWeek}`);
        
        try {
          // Update game week in the database
          const game = await Game.findOne({ gameId: gameIdEvent });
          if (game) {
            game.currentWeek = newWeek.toString();
            await game.save();
            
            // Fetch or create game state for the new week
            let gameState = await GameState.findOne({ 
              gameId: gameIdEvent, 
              week: newWeek.toString() 
            });
            
            if (!gameState) {
              // Create new game state based on previous week
              const prevWeek = parseInt(newWeek.toString()) - 1;
              const prevGameState = await GameState.findOne({ 
                gameId: gameIdEvent, 
                week: prevWeek 
              });
              
              if (prevGameState) {
                gameState = new GameState({
                  gameId: gameIdEvent,
                  week: newWeek.toString(),
                  playerStates: {
                    retailer: { ...prevGameState.playerStates.retailer.toObject() },
                    wholesaler: { ...prevGameState.playerStates.wholesaler.toObject() },
                    distributor: { ...prevGameState.playerStates.distributor.toObject() },
                    factory: { ...prevGameState.playerStates.factory.toObject() }
                  },
                  pendingActions: game.players.map(player => ({
                    playerId: player.userId,
                    actionType: 'PlaceOrder',
                    completed: false
                  }))
                });
                
                await gameState.save();
              }
            }
            
            // Notify via WebSocket if available
            if (websocketService) {
              websocketService.broadcastWeekAdvanced(gameIdEvent, newWeek.toString(), {
                gameState: gameState ? gameState.toObject() : null
              });
            }
          }
        } catch (error) {
          console.error('Error processing WeekAdvanced event:', error);
        }
      });
      
      // InventoryUpdated event
      gameInstance.on('InventoryUpdated', async (gameIdEvent, role, week, inventory, backlog) => {
        console.log(`Inventory updated: ${gameIdEvent}, role ${role}, week ${week}, inventory ${inventory}, backlog ${backlog}`);
        
        try {
          // Map role number to string
          const roleMap = {
            1: 'retailer',
            2: 'wholesaler',
            3: 'distributor',
            4: 'factory'
          };
          
          const roleString = roleMap[role.toString()];
          
          // Update game state in the database
          const gameState = await GameState.findOne({ 
            gameId: gameIdEvent, 
            week: week.toString() 
          });
          
          if (gameState && roleString) {
            gameState.playerStates[roleString].inventory = inventory.toString();
            gameState.playerStates[roleString].backlog = backlog.toString();
            await gameState.save();
            
            // Notify via WebSocket if available
            if (websocketService) {
              websocketService.broadcastGameState(gameIdEvent, gameState.toObject());
            }
          }
        } catch (error) {
          console.error('Error processing InventoryUpdated event:', error);
        }
      });
      
      // CostIncurred event
      gameInstance.on('CostIncurred', async (gameIdEvent, role, week, holdingCost, backlogCost) => {
        console.log(`Cost incurred: ${gameIdEvent}, role ${role}, week ${week}, holding ${holdingCost}, backlog ${backlogCost}`);
        
        try {
          // Map role number to string
          const roleMap = {
            1: 'retailer',
            2: 'wholesaler',
            3: 'distributor',
            4: 'factory'
          };
          
          const roleString = roleMap[role.toString()];
          
          // Update game state in the database
          const gameState = await GameState.findOne({ 
            gameId: gameIdEvent, 
            week: week.toString() 
          });
          
          if (gameState && roleString) {
            const totalCost = parseInt(holdingCost.toString()) + parseInt(backlogCost.toString());
            gameState.playerStates[roleString].currentCost = totalCost;
            await gameState.save();
            
            // Notify via WebSocket if available
            if (websocketService) {
              websocketService.broadcastGameState(gameIdEvent, gameState.toObject());
            }
          }
        } catch (error) {
          console.error('Error processing CostIncurred event:', error);
        }
      });
      
      console.log(`Setup event listeners for game ${gameId}`);
    }).catch(error => {
      console.error('Error getting gameId from contract:', error);
    });
  }

  /**
   * Register a player in the PlayerRegistry
   * @param {string} username - Username for the player
   * @param {string} playerAddress - Ethereum address of the player
   */
  async registerPlayer(username, playerAddress) {
    try {
      // Check if player is already registered
      const playerDetails = await this.playerRegistry.getPlayerDetails(playerAddress);
      if (playerDetails.registered) {
        return { success: false, message: 'Player already registered' };
      }
      
      // Register the player
      const tx = await this.playerRegistry.registerPlayer(username);
      const receipt = await tx.wait();
      
      return { 
        success: true, 
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber 
      };
    } catch (error) {
      console.error('Error registering player:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new game
   * @param {string} gameId - Unique identifier for the game
   * @param {number} orderDelay - Delay for orders in weeks
   * @param {number} shippingDelay - Delay for shipments in weeks
   * @param {number} demandPattern - Type of demand pattern (0=Constant, 1=Step, 2=Random)
   * @param {number} initialInventory - Initial inventory for all players
   */
  async createGame(gameId, orderDelay, shippingDelay, demandPattern, initialInventory) {
    try {
      const tx = await this.gameFactory.createGame(
        gameId,
        orderDelay,
        shippingDelay,
        demandPattern,
        initialInventory
      );
      const receipt = await tx.wait();
      
      // Parse the GameCreated event
      const event = receipt.events.find(e => e.event === 'GameCreated');
      if (!event) {
        throw new Error('Game creation event not found in transaction receipt');
      }
      
      const gameAddress = event.args.gameAddress;
      
      return { 
        success: true,
        gameId,
        gameAddress,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber 
      };
    } catch (error) {
      console.error('Error creating game:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Assign a role to a player
   * @param {string} gameId - ID of the game
   * @param {string} playerAddress - Address of the player
   * @param {number} role - Role to assign (1=Retailer, 2=Wholesaler, 3=Distributor, 4=Factory)
   */
  async assignRole(gameId, playerAddress, role) {
    try {
      const tx = await this.playerRegistry.assignRole(gameId, playerAddress, role);
      const receipt = await tx.wait();
      
      return { 
        success: true, 
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber 
      };
    } catch (error) {
      console.error('Error assigning role:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start a game
   * @param {string} gameAddress - Address of the game contract
   */
  async startGame(gameAddress) {
    try {
      const gameInstance = this.getGameInstance(gameAddress);
      const tx = await gameInstance.startGame();
      const receipt = await tx.wait();
      
      return { 
        success: true, 
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber 
      };
    } catch (error) {
      console.error('Error starting game:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Place an order in a game
   * @param {string} gameAddress - Address of the game contract
   * @param {number} senderRole - Role of the sender
   * @param {number} recipientRole - Role of the recipient
   * @param {number} quantity - Order quantity
   */
  async placeOrder(gameAddress, senderRole, recipientRole, quantity) {
    try {
      const gameInstance = this.getGameInstance(gameAddress);
      const tx = await gameInstance.placeOrder(senderRole, recipientRole, quantity);
      const receipt = await tx.wait();
      
      // Parse the OrderPlaced event
      const event = receipt.events.find(e => e.event === 'OrderPlaced');
      if (!event) {
        throw new Error('Order placement event not found in transaction receipt');
      }
      
      const orderId = event.args.orderId.toNumber();
      
      return { 
        success: true,
        orderId,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber 
      };
    } catch (error) {
      console.error('Error placing order:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Advance the week in a game
   * @param {string} gameAddress - Address of the game contract
   */
  async advanceWeek(gameAddress) {
    try {
      const gameInstance = this.getGameInstance(gameAddress);
      const tx = await gameInstance.advanceWeek();
      const receipt = await tx.wait();
      
      return { 
        success: true, 
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber 
      };
    } catch (error) {
      console.error('Error advancing week:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get the current week of a game
   * @param {string} gameAddress - Address of the game contract
   */
  async getCurrentWeek(gameAddress) {
    try {
      const gameInstance = this.getGameInstance(gameAddress);
      const currentWeek = await gameInstance.currentWeek();
      
      return { 
        success: true, 
        currentWeek: currentWeek.toNumber()
      };
    } catch (error) {
      console.error('Error getting current week:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get player role in a game
   * @param {string} gameId - ID of the game
   * @param {string} playerAddress - Address of the player
   */
  async getPlayerRole(gameId, playerAddress) {
    try {
      const role = await this.playerRegistry.getPlayerRole(gameId, playerAddress);
      
      return { 
        success: true, 
        role: role.toNumber()
      };
    } catch (error) {
      console.error('Error getting player role:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create and export a singleton instance
const blockchainService = new BlockchainService();
module.exports = blockchainService; 