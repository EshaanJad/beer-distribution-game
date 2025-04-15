const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

// Import routes
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/games');
const orderRoutes = require('./routes/orders');
const inventoryRoutes = require('./routes/inventory');
const analyticsRoutes = require('./routes/analytics');
const blockchainRoutes = require('./routes/blockchain');
const adminRoutes = require('./routes/admin');
const agentRoutes = require('./routes/agents');

// Import services
const blockchainService = require('./services/blockchain');
const gameCoordinator = require('./services/gameCoordinator');
const analyticsService = require('./services/analytics');
const synchronizationService = require('./services/synchronization');
const dataRetentionService = require('./services/dataRetention');
const agentSystem = require('./services/agent/init');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io if not in test mode
let io;
let websocketService;
if (process.env.NODE_ENV !== 'test') {
  io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST']
    }
  });
  
  // Setup WebSocket service
  websocketService = require('./services/websocket')(io);
  
  // Set the websocket service in services
  blockchainService.setWebSocketService(websocketService);
  gameCoordinator.setWebSocketService(websocketService);
  
  // Set up dependencies for synchronization service
  synchronizationService.setBlockchainService(blockchainService);
  synchronizationService.setAnalyticsService(analyticsService);
}

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/health', require('./routes/health'));

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Beer Distribution Game API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Export the app for testing
module.exports = app;

// Export services for testing
module.exports.server = server;
module.exports.blockchainService = blockchainService;
module.exports.websocketService = websocketService;
module.exports.gameCoordinator = gameCoordinator;
module.exports.analyticsService = analyticsService;
module.exports.synchronizationService = synchronizationService;
module.exports.dataRetentionService = dataRetentionService;
module.exports.agentSystem = agentSystem; 