/**
 * Run Integration Tests for Beer Distribution Game
 * 
 * This script runs the integration tests with the appropriate environment setup.
 */

const { exec } = require('child_process');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Configuration
const TEST_FILE = path.join(__dirname, 'tests', 'integration.test.js');
const MONGO_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5001;

// Verify MongoDB connection string
if (!MONGO_URI) {
  console.error('❌ Missing MONGODB_URI environment variable');
  console.error('Please set MONGODB_URI in your .env file');
  process.exit(1);
}

// Check if test file exists
if (!fs.existsSync(TEST_FILE)) {
  console.error(`❌ Test file not found: ${TEST_FILE}`);
  process.exit(1);
}

// Print test environment information
console.log('🧪 Beer Distribution Game Integration Tests');
console.log('==========================================');
console.log(`📊 Using MongoDB: ${MONGO_URI}`);
console.log(`🌐 Server port: ${PORT}`);
console.log(`📝 Running test: ${path.basename(TEST_FILE)}`);
console.log('==========================================');

// Run Jest with the specified test file
const command = `npx jest ${TEST_FILE} --detectOpenHandles --forceExit`;

console.log(`⏳ Running command: ${command}`);
console.log('==========================================');

// Execute test command
const child = exec(command);

// Forward stdout and stderr
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);

// Handle process exit
child.on('exit', (code) => {
  if (code === 0) {
    console.log('==========================================');
    console.log('✅ Integration tests completed successfully!');
  } else {
    console.log('==========================================');
    console.log(`❌ Integration tests failed with code ${code}`);
  }
  process.exit(code);
}); 