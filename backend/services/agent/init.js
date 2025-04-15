/**
 * Initialize agent services
 */
const agentService = require('./index');
const scheduler = require('./scheduler');

/**
 * Initialize the agent system
 */
const initialize = async () => {
  try {
    // Set up services to know about each other
    agentService.setScheduler(scheduler);
    
    // Initialize services
    await agentService.initialize();
    await scheduler.initialize();
    
    console.log('Agent system initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize agent system:', error);
    throw error;
  }
};

module.exports = {
  initialize,
  agentService,
  scheduler
}; 