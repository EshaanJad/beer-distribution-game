/**
 * Test MongoDB Connection Script
 * 
 * This script tests the connection to MongoDB Atlas
 * and verifies basic CRUD operations are working.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// MongoDB URI from .env file
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ No MongoDB URI found. Please set MONGODB_URI in .env file.');
  process.exit(1);
}

console.log('🔍 Testing MongoDB Connection');
console.log(`URI: ${MONGODB_URI}`);

// Create a simple schema for testing
const TestSchema = new mongoose.Schema({
  name: String,
  value: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Test = mongoose.model('TestCollection', TestSchema);

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  autoIndex: true,
  socketTimeoutMS: 45000,
  keepAlive: true,
  keepAliveInitialDelay: 300000,
  w: 1,
  connectTimeoutMS: 30000,
})
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas successfully!');
    
    try {
      // Test document creation
      console.log('📝 Testing document creation...');
      const testDoc = new Test({
        name: 'test_' + Date.now(),
        value: Math.floor(Math.random() * 100)
      });
      
      await testDoc.save();
      console.log(`✅ Document created with ID: ${testDoc._id}`);
      
      // Test document retrieval
      console.log('🔍 Testing document retrieval...');
      const retrievedDoc = await Test.findById(testDoc._id);
      console.log(`✅ Retrieved document: ${retrievedDoc.name}, Value: ${retrievedDoc.value}`);
      
      // Test document update
      console.log('📝 Testing document update...');
      retrievedDoc.value = 999;
      await retrievedDoc.save();
      
      const updatedDoc = await Test.findById(testDoc._id);
      console.log(`✅ Updated document value: ${updatedDoc.value}`);
      
      // Test document deletion
      console.log('🗑️ Testing document deletion...');
      await Test.deleteOne({ _id: testDoc._id });
      
      const deletedDoc = await Test.findById(testDoc._id);
      if (!deletedDoc) {
        console.log('✅ Document successfully deleted');
      } else {
        console.log('❌ Document deletion failed');
      }
      
      // Test collection operations
      console.log('📊 Testing collection operations...');
      
      // Create multiple documents
      await Test.insertMany([
        { name: 'batch_test_1', value: 1 },
        { name: 'batch_test_2', value: 2 },
        { name: 'batch_test_3', value: 3 }
      ]);
      
      // Test aggregation
      const aggregationResult = await Test.aggregate([
        { $match: { name: { $regex: 'batch_test_' } } },
        { $group: { _id: null, total: { $sum: '$value' } } }
      ]);
      
      console.log(`✅ Aggregation result: ${JSON.stringify(aggregationResult)}`);
      
      // Clean up all test documents
      await Test.deleteMany({ name: { $regex: 'batch_test_' } });
      console.log('🧹 Cleaned up test documents');
      
      console.log('\n✅ All MongoDB operations completed successfully!');
      console.log('📊 Connection to MongoDB Atlas is working correctly.');
      
    } catch (error) {
      console.error('❌ Error during MongoDB operations:', error);
    } finally {
      // Close the connection
      await mongoose.disconnect();
      console.log('👋 MongoDB connection closed');
    }
  })
  .catch(error => {
    console.error('❌ Failed to connect to MongoDB:', error);
  }); 