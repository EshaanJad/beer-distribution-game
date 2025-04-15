const mongoose = require('mongoose');

const PlayerPerformanceSchema = new mongoose.Schema({
  totalCost: {
    type: Number,
    required: true
  },
  averageInventory: {
    type: Number,
    required: true
  },
  orderVariability: {
    type: Number,
    required: true
  }
});

const AnalyticsSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    ref: 'Game'
  },
  completedAt: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  playerPerformance: {
    retailer: PlayerPerformanceSchema,
    wholesaler: PlayerPerformanceSchema,
    distributor: PlayerPerformanceSchema,
    factory: PlayerPerformanceSchema
  },
  bullwhipMetrics: {
    demandAmplification: {
      type: Number,
      required: true
    },
    orderVarianceRatio: {
      type: Number,
      required: true
    }
  },
  blockchainMetrics: {
    transactionsSubmitted: {
      type: Number,
      default: 0
    },
    transactionsConfirmed: {
      type: Number,
      default: 0
    },
    averageConfirmationTime: {
      type: Number,
      default: 0
    }
  }
});

// Index for efficient retrieval of analytics by game ID
AnalyticsSchema.index({ gameId: 1 }, { unique: true });

// Additional indexes for optimizing analytics queries
AnalyticsSchema.index({ completedAt: -1 });
AnalyticsSchema.index({ duration: 1 });
AnalyticsSchema.index({ 'playerPerformance.retailer.totalCost': 1 });
AnalyticsSchema.index({ 'playerPerformance.wholesaler.totalCost': 1 });
AnalyticsSchema.index({ 'playerPerformance.distributor.totalCost': 1 });
AnalyticsSchema.index({ 'playerPerformance.factory.totalCost': 1 });
AnalyticsSchema.index({ 'bullwhipMetrics.demandAmplification': 1 });
AnalyticsSchema.index({ 'bullwhipMetrics.orderVarianceRatio': 1 });

module.exports = mongoose.model('Analytics', AnalyticsSchema); 