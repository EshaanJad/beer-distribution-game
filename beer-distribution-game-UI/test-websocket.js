/**
 * WebSocket Connection Test Script
 * 
 * This script tests WebSocket connectivity to the Beer Distribution Game backend server.
 * Run this script with Node.js to verify your WebSocket connection is working correctly.
 */

const WebSocket = require('ws');

// Set the WebSocket server URL
const WS_URL = process.env.WEBSOCKET_URL || 'ws://localhost:5001';

console.log('WebSocket Connection Tester');
console.log('==========================');
console.log(`Connecting to: ${WS_URL}`);

// Create a WebSocket client
const ws = new WebSocket(WS_URL);

// Connection opened
ws.on('open', () => {
  console.log('✅ Connection established successfully!');
  
  // Send a test message
  const testMessage = {
    type: 'ping',
    data: {
      timestamp: new Date().toISOString(),
      client: 'test-script'
    }
  };
  
  console.log('Sending test message:', JSON.stringify(testMessage));
  ws.send(JSON.stringify(testMessage));
  
  // Set a timeout to close the connection if no response
  setTimeout(() => {
    console.log('No response received within timeout period.');
    console.log('This may be normal if the server doesn\'t respond to ping messages.');
    ws.close();
  }, 5000);
});

// Listen for messages
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('✅ Received response:', message);
  } catch (error) {
    console.log('✅ Received non-JSON response:', data.toString());
  }
  
  // Close the connection after receiving a message
  setTimeout(() => {
    ws.close();
  }, 1000);
});

// Error handling
ws.on('error', (error) => {
  console.error('❌ Connection error:', error.message);
  process.exit(1);
});

// Connection closed
ws.on('close', (code, reason) => {
  console.log(`Connection closed: Code ${code}${reason ? ', Reason: ' + reason : ''}`);
  process.exit(0);
});

// Handle termination
process.on('SIGINT', () => {
  console.log('Test interrupted, closing connection...');
  ws.close();
  process.exit(0);
}); 