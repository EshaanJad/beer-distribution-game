require('dotenv').config({ path: __dirname + '/../.env' });
const axios = require('axios');

// API endpoint
const API_URL = 'http://localhost:5001/api';

// Test users
const testUsers = [
  {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123'
  },
  {
    username: 'demouser',
    email: 'demo@example.com',
    password: 'password123'
  }
];

async function testLogin(user) {
  console.log(`Testing login for ${user.username} (${user.email})...`);
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: user.email,
      password: user.password
    });
    
    if (response.data && response.data.success) {
      console.log(`✅ Login successful for ${user.username}`);
      console.log(`Token: ${response.data.data.token.substring(0, 20)}...`);
      return true;
    } else {
      console.log(`❌ Login failed for ${user.username}: ${response.data ? response.data.error : 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Login error for ${user.username}:`, error.response ? error.response.data : error.message);
    return false;
  }
}

async function testRegistration(user) {
  console.log(`Testing registration for ${user.username} (${user.email})...`);
  
  try {
    const response = await axios.post(`${API_URL}/auth/register`, {
      username: user.username + '_new',
      email: user.email.replace('@', '_new@'),
      password: user.password
    });
    
    if (response.data && response.data.success) {
      console.log(`✅ Registration successful for ${user.username}_new`);
      console.log(`Token: ${response.data.data.token.substring(0, 20)}...`);
      return true;
    } else {
      console.log(`❌ Registration failed for ${user.username}_new: ${response.data ? response.data.error : 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Registration error for ${user.username}_new:`, error.response ? error.response.data : error.message);
    return false;
  }
}

async function runTests() {
  // Test login for each user
  console.log('\n=== TESTING LOGIN ===');
  for (const user of testUsers) {
    await testLogin(user);
  }
  
  // Test registration (with modified usernames to avoid conflicts)
  console.log('\n=== TESTING REGISTRATION ===');
  for (const user of testUsers) {
    await testRegistration(user);
  }
}

// Run the tests
console.log('🚀 Starting authentication tests...');
runTests().then(() => console.log('✨ Tests completed')); 