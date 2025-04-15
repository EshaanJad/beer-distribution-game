/**
 * Test WebSocket Connection Script
 * 
 * This script tests the WebSocket connection to the Beer Distribution Game server.
 * It authenticates a user and attempts to connect to the WebSocket server.
 */

const { io } = require('socket.io-client');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const API_BASE_URL = `http://localhost:${process.env.PORT || 5001}/api`;
const WS_URL = `http://localhost:${process.env.PORT || 5001}`;
const WS_PATH = '/ws';

// Test user credentials
const TEST_USER = {
  username: 'wstest_user',
  email: 'wstest@example.com',
  password: 'Password123!'
};

// States
let authToken = null;
let socketConnected = false;
let messageReceived = false;

// Main function
async function testWebSocketConnection() {
  console.log('🧪 WebSocket Connection Testing');
  console.log('==================================');
  console.log(`🔌 Testing connection to: ${WS_URL}${WS_PATH}`);
  
  try {
    // Step 1: Register a test user (if they don't exist)
    console.log('👤 Creating test user...');
    
    try {
      const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_USER)
      });
      
      const registerData = await registerResponse.json();
      
      if (registerResponse.ok) {
        console.log('✅ Test user created successfully');
        if (registerData.data && registerData.data.token) {
          authToken = registerData.data.token;
          console.log('✅ Obtained auth token from registration');
        }
      } else {
        console.log('ℹ️ User may already exist, trying to login...');
      }
    } catch (err) {
      console.log('ℹ️ Registration error, will try login');
    }
    
    // Step 2: Login to get a token (if needed)
    if (!authToken) {
      console.log('🔑 Logging in to get auth token...');
      
      const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_USER.email,
          password: TEST_USER.password
        })
      });
      
      const loginData = await loginResponse.json();
      
      if (loginResponse.ok && loginData.data && loginData.data.token) {
        authToken = loginData.data.token;
        console.log('✅ Obtained auth token from login');
      } else {
        throw new Error('Failed to get auth token');
      }
    }
    
    // Step 3: Connect to WebSocket
    console.log('🔌 Connecting to WebSocket server...');
    
    const socket = io(WS_URL, {
      path: WS_PATH,
      auth: { token: authToken },
      reconnection: true,
      reconnectionAttempts: 5
    });
    
    // Set up event handlers
    socket.on('connect', () => {
      socketConnected = true;
      console.log('✅ Connected to WebSocket server!');
      console.log(`🆔 Socket ID: ${socket.id}`);
      
      // Emit a ping message to test bidirectional communication
      console.log('📤 Sending ping message...');
      socket.emit('message', { type: 'ping', timestamp: new Date() });
    });
    
    socket.on('connect_error', (err) => {
      console.error('❌ WebSocket connection error:', err.message);
    });
    
    socket.on('disconnect', (reason) => {
      console.log(`WebSocket disconnected: ${reason}`);
    });
    
    socket.on('message', (data) => {
      messageReceived = true;
      console.log('📨 Received message:', data);
    });
    
    // Wait for connection and message
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check connection status
    if (socketConnected) {
      console.log('✅ WebSocket connection test PASSED');
    } else {
      console.log('❌ WebSocket connection test FAILED');
    }
    
    // Check message reception
    if (messageReceived) {
      console.log('✅ WebSocket message test PASSED');
    } else {
      console.log('⚠️ No WebSocket messages received within timeout period');
    }
    
    // Clean up
    socket.disconnect();
    console.log('🔌 Disconnected from WebSocket server');
    
  } catch (error) {
    console.error('❌ WebSocket testing error:', error);
  }
}

// Run the test
console.log('Starting WebSocket connection test...');
testWebSocketConnection().then(() => {
  console.log('WebSocket testing completed');
}); 