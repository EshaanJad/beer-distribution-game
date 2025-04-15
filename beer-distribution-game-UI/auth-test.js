/**
 * Authentication Testing Script
 * 
 * This script tests the registration and login functionality 
 * of the Beer Distribution Game backend.
 */

const API_URL = 'http://localhost:5001/api';

// Test User Data
const TEST_USER = {
  username: 'testuser_' + Math.floor(Math.random() * 10000),
  email: `test${Math.floor(Math.random() * 10000)}@example.com`,
  password: 'Password123!'
};

// Results collection
const results = {
  registration: {},
  invalidRegistration: {},
  login: {},
  invalidLogin: {},
  currentUser: {}
};

// Helper function to log test results
function logTestResult(testName, success, details) {
  console.log(`\n--- ${testName} ---`);
  console.log(`Status: ${success ? '✅ PASS' : '❌ FAIL'}`);
  if (details) {
    console.log('Details:', details);
  }
}

// 1. Test Valid Registration
async function testRegistration() {
  try {
    console.log(`\nTesting registration with user: ${TEST_USER.username}, email: ${TEST_USER.email}`);
    
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_USER),
    });
    
    results.registration.status = response.status;
    results.registration.data = await response.json();
    
    logTestResult(
      'User Registration', 
      response.ok, 
      results.registration.data
    );
    
    return response.ok;
  } catch (error) {
    console.error('Registration test error:', error);
    results.registration.error = error.message;
    logTestResult('User Registration', false, { error: error.message });
    return false;
  }
}

// 2. Test Invalid Registration (duplicate user)
async function testInvalidRegistration() {
  try {
    console.log('\nTesting registration with duplicate email (should fail)');
    
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_USER), // Same user data should cause a duplicate error
    });
    
    results.invalidRegistration.status = response.status;
    results.invalidRegistration.data = await response.json();
    
    // This should fail, so we expect !response.ok to be true
    logTestResult(
      'Invalid Registration (Duplicate)', 
      !response.ok, 
      results.invalidRegistration.data
    );
    
    return !response.ok;
  } catch (error) {
    console.error('Invalid registration test error:', error);
    results.invalidRegistration.error = error.message;
    logTestResult('Invalid Registration (Duplicate)', false, { error: error.message });
    return false;
  }
}

// 3. Test Valid Login
async function testLogin() {
  try {
    console.log('\nTesting login with valid credentials');
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
      }),
    });
    
    results.login.status = response.status;
    results.login.data = await response.json();
    
    // Check if the token is in the data.token property (new format) or directly in token (old format)
    const token = results.login.data.data && results.login.data.data.token 
      ? results.login.data.data.token 
      : results.login.data.token;
    
    logTestResult(
      'User Login', 
      response.ok, 
      {
        success: results.login.data.success,
        token: token ? 'Token received' : 'No token',
        userId: results.login.data.data ? results.login.data.data.id : results.login.data.userId
      }
    );
    
    // Save token for next tests
    if (token) {
      results.login.data.token = token;
    }
    
    return response.ok && token;
  } catch (error) {
    console.error('Login test error:', error);
    results.login.error = error.message;
    logTestResult('User Login', false, { error: error.message });
    return false;
  }
}

// 4. Test Invalid Login
async function testInvalidLogin() {
  try {
    console.log('\nTesting login with invalid credentials (should fail)');
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: 'WrongPassword123',
      }),
    });
    
    results.invalidLogin.status = response.status;
    results.invalidLogin.data = await response.json();
    
    // This should fail with 401, so we expect !response.ok
    logTestResult(
      'Invalid Login', 
      !response.ok, 
      results.invalidLogin.data
    );
    
    return !response.ok;
  } catch (error) {
    console.error('Invalid login test error:', error);
    results.invalidLogin.error = error.message;
    logTestResult('Invalid Login', false, { error: error.message });
    return false;
  }
}

// 5. Test Get Current User with Auth Token
async function testGetCurrentUser() {
  if (!results.login.data || !results.login.data.token) {
    logTestResult('Get Current User', false, { error: 'No auth token available' });
    return false;
  }
  
  try {
    console.log('\nTesting get current user with auth token');
    
    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${results.login.data.token}`,
      },
    });
    
    results.currentUser.status = response.status;
    results.currentUser.data = await response.json();
    
    logTestResult(
      'Get Current User', 
      response.ok, 
      results.currentUser.data
    );
    
    return response.ok;
  } catch (error) {
    console.error('Get current user test error:', error);
    results.currentUser.error = error.message;
    logTestResult('Get Current User', false, { error: error.message });
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🔍 STARTING AUTHENTICATION TESTING 🔍');
  console.log(`API URL: ${API_URL}`);
  console.log('==================================');
  
  // Run tests sequentially
  const registrationSuccess = await testRegistration();
  await testInvalidRegistration();
  
  if (registrationSuccess) {
    const loginSuccess = await testLogin();
    await testInvalidLogin();
    
    if (loginSuccess) {
      await testGetCurrentUser();
    }
  }
  
  console.log('\n==================================');
  console.log('🏁 AUTHENTICATION TESTING COMPLETE 🏁');
  console.log('Summary:');
  console.log(`- Registration: ${results.registration.status === 201 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`- Invalid Registration: ${results.invalidRegistration.status !== 200 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`- Login: ${results.login.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`- Invalid Login: ${results.invalidLogin.status !== 200 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`- Get Current User: ${results.currentUser.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
}

// Start the tests
runTests().catch(error => {
  console.error('Test runner error:', error);
}); 