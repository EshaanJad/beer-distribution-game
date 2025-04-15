/**
 * Direct Test Script for Beer Distribution Game
 * 
 * This script tests basic connectivity to MongoDB and API endpoints.
 */

const mongoose = require('mongoose');
const fetch = require('node-fetch');

// Configuration
const MONGODB_URI = 'mongodb+srv://beergameadmin:Koenigsegg15@beergamecluster.5lqneem.mongodb.net/?retryWrites=true&w=majority&appName=BeerGameCluster';
const API_URL = 'http://localhost:5001/api';

// Test MongoDB connection
async function testMongoDB() {
  console.log('🔶 Testing MongoDB Connection...');
  
  try {
    await mongoose.connect(MONGODB_URI, {
      autoIndex: true,
      socketTimeoutMS: 45000
    });
    
    console.log('✅ MongoDB connection successful!');
    
    // Create a simple model for testing
    const TestModel = mongoose.model('Test', new mongoose.Schema({
      name: String,
      timestamp: { type: Date, default: Date.now }
    }));
    
    // Create a test document
    const doc = await TestModel.create({ name: 'test_' + Date.now() });
    console.log(`✅ Created test document with ID: ${doc._id}`);
    
    // Retrieve the document
    const found = await TestModel.findById(doc._id);
    console.log(`✅ Retrieved document: ${found.name}`);
    
    // Delete the document
    await TestModel.deleteOne({ _id: doc._id });
    console.log('✅ Deleted test document');
    
    // Close connection
    await mongoose.disconnect();
    console.log('✅ MongoDB test completed successfully');
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB Error:', error);
    return false;
  }
}

// Test API endpoint
async function testAPI() {
  console.log('🔶 Testing API Endpoints...');
  
  try {
    // Test the root endpoint
    const response = await fetch(API_URL);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API root endpoint response:', data);
    } else {
      console.log(`⚠️ API returned status ${response.status}`);
    }
    
    console.log('✅ API test completed');
    return true;
  } catch (error) {
    console.error('❌ API Error:', error);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 BEER DISTRIBUTION GAME DIRECT TESTS');
  console.log('=====================================');
  
  let mongoDB = false;
  let api = false;
  
  try {
    // Test MongoDB
    mongoDB = await testMongoDB();
    
    // Test API
    api = await testAPI();
    
    // Print summary
    console.log('\n📊 TEST SUMMARY');
    console.log('=====================================');
    console.log(`MongoDB Connectivity: ${mongoDB ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`API Connectivity: ${api ? '✅ PASS' : '❌ FAIL'}`);
    console.log('=====================================');
    
    if (mongoDB && api) {
      console.log('🎉 All systems are working correctly!');
    } else {
      console.log('⚠️ Some tests failed. See details above.');
    }
  } catch (error) {
    console.error('❌ Test execution error:', error);
  }
}

// Run the tests
runTests(); 