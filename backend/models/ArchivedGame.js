const mongoose = require('mongoose');

const ArchivedGameSchema = new mongoose.Schema({
  // Reference to the original game ID
  originalId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  // Key information from the original game
  gameId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Setup', 'Active', 'Completed'],
    required: true
  },
  createdAt: {
    type: Date,
    required: true
  },
  completedAt: {
    type: Date
  },
  contractAddress: {
    type: String
  },
  currentWeek: {
    type: Number,
    required: true
  },
  // Array of players in the game
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
        type: Date
      },
      isActive: {
        type: Boolean
      }
    }
  ],
  // The entire game data as JSON
  gameData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  // Analytics data for reference
  analyticsData: {
    type: mongoose.Schema.Types.Mixed
  },
  // When the game was archived
  archivedAt: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  }
});

// Create indexes for efficient querying
ArchivedGameSchema.index({ createdBy: 1 });
ArchivedGameSchema.index({ status: 1 });
ArchivedGameSchema.index({ 'players.userId': 1 });
ArchivedGameSchema.index({ createdAt: -1 });
ArchivedGameSchema.index({ completedAt: 1 }, { sparse: true });

module.exports = mongoose.model('ArchivedGame', ArchivedGameSchema); 