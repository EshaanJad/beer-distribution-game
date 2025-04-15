/**
 * MongoDB connection checker
 * Utility to check MongoDB connection and display database information
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Check MongoDB connection
 */
async function checkConnection() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ MongoDB connection successful!');
    
    // Get connection information
    const admin = mongoose.connection.db.admin();
    
    // Get database stats
    const stats = await mongoose.connection.db.stats();
    console.log('\nDatabase Stats:');
    console.log('----------------');
    console.log(`Database name: ${mongoose.connection.db.databaseName}`);
    console.log(`Collections: ${stats.collections}`);
    console.log(`Documents: ${stats.objects}`);
    console.log(`Storage size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Get collection information
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nCollections:');
    console.log('------------');
    for (const collection of collections) {
      const collStats = await mongoose.connection.db.collection(collection.name).stats();
      console.log(`- ${collection.name}: ${collStats.count} documents`);
    }
    
    console.log('\nConnection Parameters:');
    console.log('---------------------');
    console.log(`Host: ${mongoose.connection.host}`);
    console.log(`Port: ${mongoose.connection.port}`);
    console.log(`Connected to: ${mongoose.connection.name}`);
    
    // Get server status
    const serverStatus = await admin.serverStatus();
    console.log('\nServer Status:');
    console.log('-------------');
    console.log(`MongoDB version: ${serverStatus.version}`);
    console.log(`Uptime: ${(serverStatus.uptime / 3600).toFixed(2)} hours`);
    console.log(`Connections: ${serverStatus.connections.current} (current) / ${serverStatus.connections.available} (available)`);
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\nConnection closed');
  }
}

// Run the check
checkConnection().catch(console.error);

module.exports = { checkConnection }; 