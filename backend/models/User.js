const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  walletAddress: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isAgent: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  gameHistory: [
    {
      gameId: {
        type: String,
        required: true
      },
      role: {
        type: String,
        enum: ['Retailer', 'Wholesaler', 'Distributor', 'Factory'],
        required: true
      },
      finalCost: {
        type: Number
      },
      completedAt: {
        type: Date
      }
    }
  ],
  preferences: {
    theme: {
      type: String,
      default: 'light'
    },
    notifications: {
      type: Boolean,
      default: true
    }
  }
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      username: this.username,
      walletAddress: this.walletAddress,
      isAdmin: this.isAdmin
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE
    }
  );
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Add indexes for frequent queries
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ walletAddress: 1 }, { sparse: true });
UserSchema.index({ lastLogin: -1 });
UserSchema.index({ 'gameHistory.gameId': 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ isAdmin: 1 });

module.exports = mongoose.model('User', UserSchema); 