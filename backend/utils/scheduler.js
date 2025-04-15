/**
 * Scheduler utility for periodic tasks
 */

const cron = require('node-cron');
const synchronizationService = require('../services/synchronization');
const dataRetentionService = require('../services/dataRetention');

// Task definitions
const tasks = {
  syncBlockchain: {
    schedule: '*/5 * * * *', // Run every 5 minutes
    enabled: true,
    handler: async () => {
      console.log('Running scheduled blockchain synchronization...');
      try {
        const result = await synchronizationService.runFullSynchronization();
        console.log(`Blockchain sync completed: ${result.syncedGames} games synced`);
        return result;
      } catch (error) {
        console.error('Scheduled blockchain sync error:', error);
        return { success: false, error: error.message };
      }
    }
  },
  dataRetention: {
    schedule: '0 3 * * *', // Run at 3 AM every day
    enabled: true,
    handler: async () => {
      console.log('Running scheduled data retention process...');
      try {
        const result = await dataRetentionService.runDataRetention();
        console.log(`Data retention completed: ${result.archivedGames} games archived, ${result.purgedGameStates} game states purged`);
        return result;
      } catch (error) {
        console.error('Scheduled data retention error:', error);
        return { success: false, error: error.message };
      }
    }
  }
};

/**
 * Initialize all scheduled tasks
 */
const initScheduler = () => {
  // Skip scheduling in test environment
  if (process.env.NODE_ENV === 'test') {
    console.log('Skipping scheduler initialization in test environment');
    return;
  }

  // Start each enabled task
  Object.keys(tasks).forEach(taskName => {
    const task = tasks[taskName];
    if (task.enabled) {
      cron.schedule(task.schedule, task.handler);
      console.log(`Scheduled task '${taskName}' with schedule: ${task.schedule}`);
    }
  });
};

/**
 * Run a specific task immediately
 * @param {string} taskName - Name of the task to run
 * @returns {Promise} - Result of the task execution
 */
const runTaskNow = async (taskName) => {
  const task = tasks[taskName];
  if (!task) {
    throw new Error(`Task '${taskName}' not found`);
  }
  return await task.handler();
};

module.exports = {
  initScheduler,
  runTaskNow,
  tasks
}; 