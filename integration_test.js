/**
 * Beer Distribution Game Integration Test Script
 * 
 * This script tests the connectivity between the frontend and backend
 * services to ensure they are properly communicating.
 */

const fetch = require('node-fetch');
const WebSocket = require('ws');
const readline = require('readline');

// Configure endpoints
const API_URL = process.env.API_URL || 'http://localhost:5001/api';
const WEBSOCKET_URL = process.env.WEBSOCKET_URL || 'ws://localhost:5001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Create readline interface for interactive usage
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Test backend API connectivity
 */
async function testApiConnectivity() {
  try {
    console.log('Testing backend API connectivity...');
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend API is accessible');
      console.log(`Status: ${data.status}`);
      console.log(`Time: ${data.timestamp}`);
      console.log(`Environment: ${data.environment}`);
      return true;
    } else {
      console.error(`❌ Backend API returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to connect to backend API:', error.message);
    console.log('Make sure the backend server is running on the correct port.');
    return false;
  }
}

/**
 * Test WebSocket connectivity
 */
function testWebSocketConnectivity() {
  return new Promise((resolve) => {
    console.log('Testing WebSocket connectivity...');
    
    const ws = new WebSocket(WEBSOCKET_URL);
    let timeoutId;
    
    ws.on('open', () => {
      console.log('✅ WebSocket connection established');
      clearTimeout(timeoutId);
      
      // Send a test message
      ws.send(JSON.stringify({ type: 'ping', data: { timestamp: new Date().toISOString() } }));
      
      // Close after 5 seconds if no response
      setTimeout(() => {
        console.log('ℹ️ No WebSocket response received (this might be normal if no handler for ping)');
        ws.close();
        resolve(true);
      }, 5000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('✅ Received WebSocket response:', message);
        ws.close();
        resolve(true);
      } catch (error) {
        console.log('ℹ️ Received non-JSON WebSocket message:', data.toString());
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
      clearTimeout(timeoutId);
      resolve(false);
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
    
    // Set a timeout for the connection attempt
    timeoutId = setTimeout(() => {
      console.error('❌ WebSocket connection timeout');
      ws.close();
      resolve(false);
    }, 10000);
  });
}

/**
 * Test frontend accessibility
 */
async function testFrontendAccessibility() {
  try {
    console.log('Testing frontend accessibility...');
    const response = await fetch(FRONTEND_URL, {
      method: 'GET'
    });
    
    if (response.ok) {
      console.log('✅ Frontend is accessible');
      return true;
    } else {
      console.error(`❌ Frontend returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to connect to frontend:', error.message);
    console.log('Make sure the frontend server is running on the correct port.');
    return false;
  }
}

/**
 * Main function to run all tests
 */
async function runIntegrationTests() {
  console.log('======================================');
  console.log('Beer Distribution Game Integration Test');
  console.log('======================================');
  console.log(`API URL: ${API_URL}`);
  console.log(`WebSocket URL: ${WEBSOCKET_URL}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log('--------------------------------------');
  
  const apiSuccess = await testApiConnectivity();
  console.log('--------------------------------------');
  
  const wsSuccess = await testWebSocketConnectivity();
  console.log('--------------------------------------');
  
  const frontendSuccess = await testFrontendAccessibility();
  console.log('--------------------------------------');
  
  console.log('Integration Test Results:');
  console.log(`API Connectivity: ${apiSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`WebSocket Connectivity: ${wsSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Frontend Accessibility: ${frontendSuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  if (apiSuccess && wsSuccess && frontendSuccess) {
    console.log('\n✅ All tests passed! The system is properly integrated.');
    return true;
  } else {
    console.log('\n❌ Some tests failed. Please check the configuration and ensure all services are running.');
    return false;
  }
}

// Interactive mode
function interactiveMode() {
  console.clear();
  console.log('===========================================');
  console.log('Beer Distribution Game - Integration Tester');
  console.log('===========================================');
  
  const menu = `
Choose an option:
1. Run all integration tests
2. Test API connectivity only
3. Test WebSocket connectivity only
4. Test frontend accessibility only
5. Exit
`;
  
  rl.question(menu + '\nEnter your choice (1-5): ', async (answer) => {
    switch(answer.trim()) {
      case '1':
        await runIntegrationTests();
        promptToContinue();
        break;
      case '2':
        await testApiConnectivity();
        promptToContinue();
        break;
      case '3':
        await testWebSocketConnectivity();
        promptToContinue();
        break;
      case '4':
        await testFrontendAccessibility();
        promptToContinue();
        break;
      case '5':
        console.log('Exiting...');
        rl.close();
        break;
      default:
        console.log('Invalid choice. Please try again.');
        promptToContinue();
    }
  });
}

function promptToContinue() {
  rl.question('\nPress Enter to continue...', () => {
    interactiveMode();
  });
}

// Check if running in interactive mode
if (process.argv.includes('--interactive') || process.argv.includes('-i')) {
  interactiveMode();
} else {
  runIntegrationTests().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Error running tests:', error);
    process.exit(1);
  });
} 