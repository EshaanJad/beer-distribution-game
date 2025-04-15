const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { server, blockchainService, gameCoordinator, analyticsService, synchronizationService, dataRetentionService } = require('./app');
const scheduler = require('./utils/scheduler');
const agentSystem = require('./services/agent/init');

// Load environment variables
dotenv.config();

// Connect to MongoDB with modern configuration
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// Initialize services and set up dependencies
(async () => {
  try {
    // Initialize blockchain service if not already initialized
    if (!blockchainService.isInitialized()) {
      await blockchainService.initialize();
      console.log('Blockchain service initialized successfully');
    }
    
    // Set analytics service in game coordinator
    gameCoordinator.setAnalyticsService(analyticsService);
    console.log('Analytics service set in game coordinator');
    
    // Configure data retention from environment variables
    if (process.env.DATA_RETENTION_PERIODS) {
      try {
        const retentionPeriods = JSON.parse(process.env.DATA_RETENTION_PERIODS);
        dataRetentionService.setRetentionPeriods(retentionPeriods);
        console.log('Data retention periods configured from environment');
      } catch (parseError) {
        console.error('Error parsing DATA_RETENTION_PERIODS environment variable:', parseError);
      }
    }
    
    // Initialize scheduler for periodic tasks
    scheduler.initScheduler();
    console.log('Task scheduler initialized');
    
    // Initialize agent system
    if (process.env.ENABLE_AGENT_SYSTEM === 'true') {
      try {
        await agentSystem.initialize();
        console.log('Agent system initialized successfully');
      } catch (error) {
        console.error('Agent system initialization error:', error);
      }
    }
    
    // Run initial blockchain synchronization
    if (process.env.SYNC_ON_STARTUP === 'true') {
      console.log('Running initial blockchain synchronization...');
      try {
        const result = await scheduler.runTaskNow('syncBlockchain');
        console.log(`Initial blockchain sync completed: ${result.syncedGames} games synced`);
      } catch (error) {
        console.error('Initial blockchain sync error:', error);
      }
    }
    
    // Run initial data retention if configured
    if (process.env.DATA_RETENTION_ON_STARTUP === 'true') {
      console.log('Running initial data retention process...');
      try {
        const result = await scheduler.runTaskNow('dataRetention');
        console.log(`Initial data retention completed: ${result.archivedGames} games archived, ${result.purgedGameStates} game states purged`);
      } catch (error) {
        console.error('Initial data retention error:', error);
      }
    }
  } catch (error) {
    console.error('Error initializing services:', error);
    process.exit(1);
  }
})();

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 