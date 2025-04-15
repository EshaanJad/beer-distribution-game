require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

// Test user data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123', // Will be hashed by the pre-save hook in User model
  isAdmin: true // Make this user an admin for full access
};

// MongoDB Connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://beergameadmin:Koenigsegg15@beergamecluster.5lqneem.mongodb.net/?retryWrites=true&w=majority&appName=BeerGameCluster';

console.log('Using MongoDB URI:', MONGODB_URI.substring(0, 20) + '...');

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Check if the user already exists
      const existingUser = await User.findOne({ 
        $or: [{ email: testUser.email }, { username: testUser.username }] 
      });
      
      if (existingUser) {
        console.log('Test user already exists:', {
          id: existingUser._id,
          username: existingUser.username,
          email: existingUser.email
        });
        
        // Update the user's password
        existingUser.password = testUser.password;
        await existingUser.save();
        console.log('Test user password updated');
      } else {
        // Create a new user
        const user = await User.create(testUser);
        console.log('Test user created successfully:', {
          id: user._id,
          username: user.username,
          email: user.email
        });
      }
    } catch (error) {
      console.error('Error creating/updating test user:', error);
    } finally {
      mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  });
