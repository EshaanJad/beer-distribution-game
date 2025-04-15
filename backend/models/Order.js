const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    ref: 'Game'
  },
  week: {
    type: Number,
    required: true
  },
  sender: {
    role: {
      type: String,
      enum: ['Retailer', 'Wholesaler', 'Distributor', 'Factory', 'Customer'],
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  recipient: {
    role: {
      type: String,
      enum: ['Retailer', 'Wholesaler', 'Distributor', 'Factory'],
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  quantity: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Shipped', 'Delivered'],
    default: 'Pending'
  },
  placedAt: {
    type: Date,
    default: Date.now
  },
  deliveryWeek: {
    type: Number
  },
  blockchainData: {
    transactionHash: {
      type: String
    },
    blockNumber: {
      type: Number
    },
    confirmed: {
      type: Boolean,
      default: false
    },
    syncedAt: {
      type: Date
    },
    orderId: {
      type: Number
    },
    syncAttempts: {
      type: Number,
      default: 0
    }
  }
});

// Compound index for efficient querying
OrderSchema.index({ gameId: 1, week: 1, 'sender.role': 1, 'recipient.role': 1 });

// Index for blockchain transaction verification
OrderSchema.index({ 'blockchainData.transactionHash': 1 }, { sparse: true });

// New indexes for optimizing query performance
OrderSchema.index({ gameId: 1, deliveryWeek: 1, status: 1 });
OrderSchema.index({ gameId: 1, 'sender.userId': 1 });
OrderSchema.index({ gameId: 1, 'recipient.userId': 1 });
OrderSchema.index({ gameId: 1, 'sender.role': 1 });
OrderSchema.index({ gameId: 1, 'recipient.role': 1 });
OrderSchema.index({ placedAt: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ 'blockchainData.confirmed': 1 });
OrderSchema.index({ 'blockchainData.syncedAt': 1 }, { sparse: true });
OrderSchema.index({ 'blockchainData.orderId': 1 }, { sparse: true });

module.exports = mongoose.model('Order', OrderSchema); 