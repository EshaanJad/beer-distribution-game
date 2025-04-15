const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  contractAddress: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  lastSynced: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Setup', 'Active', 'Completed'],
    default: 'Setup'
  },
  configuration: {
    orderDelay: {
      type: Number,
      required: true,
      default: 2
    },
    shippingDelay: {
      type: Number,
      required: true,
      default: 2
    },
    demandPattern: {
      type: String,
      enum: ['Constant', 'Step', 'Random'],
      required: true,
      default: 'Constant'
    },
    initialInventory: {
      type: Number,
      required: true,
      default: 12
    },
    blockchainEnabled: {
      type: Boolean,
      default: true
    },
    agents: {
      enabled: {
        type: Boolean,
        default: false
      },
      autoplay: {
        type: Boolean,
        default: false
      },
      fillEmptyRoles: {
        type: Boolean,
        default: false
      },
      autoAdvance: {
        type: Boolean,
        default: false
      },
      autoAdvanceInterval: {
        type: Number,
        default: 5000
      },
      algorithmConfig: {
        forecastHorizon: {
          type: Number,
          default: 4
        },
        safetyFactor: {
          type: Number,
          default: 0.5
        },
        visibilityMode: {
          type: String,
          enum: ['traditional', 'blockchain'],
          default: 'traditional'
        }
      },
      roles: {
        retailer: {
          type: Boolean,
          default: false
        },
        wholesaler: {
          type: Boolean,
          default: false
        },
        distributor: {
          type: Boolean,
          default: false
        },
        factory: {
          type: Boolean,
          default: false
        }
      }
    }
  },
  currentWeek: {
    type: Number,
    default: 0
  },
  players: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      role: {
        type: String,
        enum: ['Retailer', 'Wholesaler', 'Distributor', 'Factory'],
        required: true
      },
      joined: {
        type: Date,
        default: Date.now
      },
      isActive: {
        type: Boolean,
        default: true
      },
      isAgent: {
        type: Boolean,
        default: false
      }
    }
  ],
  customerDemand: [
    {
      week: {
        type: Number,
        required: true
      },
      quantity: {
        type: Number,
        required: true
      }
    }
  ]
});

// Generate a unique game ID before saving
GameSchema.pre('save', function(next) {
  if (!this.isNew) {
    return next();
  }
  
  // Generate a random game ID if not provided
  if (!this.gameId) {
    const timestamp = new Date().getTime().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    this.gameId = `game-${timestamp}-${randomStr}`;
  }
  
  next();
});

// Add indexes for frequently used queries
GameSchema.index({ createdBy: 1 });
GameSchema.index({ status: 1 });
GameSchema.index({ 'players.userId': 1 });
GameSchema.index({ 'players.role': 1 });
GameSchema.index({ createdAt: -1 });
GameSchema.index({ completedAt: 1 }, { sparse: true });
GameSchema.index({ lastSynced: 1 }, { sparse: true });

module.exports = mongoose.model('Game', GameSchema); 