const mongoose = require('mongoose');

const PlayerStateSchema = new mongoose.Schema({
  inventory: {
    type: Number,
    required: true,
    default: 0
  },
  backlog: {
    type: Number,
    required: true,
    default: 0
  },
  incomingOrders: {
    type: Number,
    required: true,
    default: 0
  },
  outgoingOrders: {
    type: Number,
    required: true,
    default: 0
  },
  currentCost: {
    type: Number,
    required: true,
    default: 0
  },
  syncedWithBlockchain: {
    type: Boolean,
    default: false
  },
  lastSyncedAt: {
    type: Date
  }
});

const GameStateSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    ref: 'Game'
  },
  week: {
    type: Number,
    required: true
  },
  playerStates: {
    retailer: PlayerStateSchema,
    wholesaler: PlayerStateSchema,
    distributor: PlayerStateSchema,
    factory: PlayerStateSchema
  },
  pendingActions: [
    {
      playerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      actionType: {
        type: String,
        enum: ['PlaceOrder', 'ConfirmReceipt'],
        required: true
      },
      completed: {
        type: Boolean,
        default: false
      }
    }
  ],
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  syncStatus: {
    synced: {
      type: Boolean,
      default: false
    },
    lastSyncAttempt: {
      type: Date
    },
    syncAttempts: {
      type: Number,
      default: 0
    }
  }
});

// Compound index for efficient querying
GameStateSchema.index({ gameId: 1, week: 1 }, { unique: true });

// Additional indexes for optimization
GameStateSchema.index({ gameId: 1 });
GameStateSchema.index({ week: 1 });
GameStateSchema.index({ 'pendingActions.playerId': 1 });
GameStateSchema.index({ 'pendingActions.completed': 1 });
GameStateSchema.index({ lastUpdated: -1 });
GameStateSchema.index({ 'syncStatus.synced': 1 });
GameStateSchema.index({ 'syncStatus.lastSyncAttempt': 1 }, { sparse: true });

module.exports = mongoose.model('GameState', GameStateSchema); 