const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

describe('User Model', () => {
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123'
  };

  it('should create a new user with hashed password', async () => {
    const newUser = await User.create(testUser);

    expect(newUser).toBeTruthy();
    expect(newUser.username).toBe(testUser.username);
    expect(newUser.email).toBe(testUser.email);
    
    // Password should be hashed, not plain text
    expect(newUser.password).not.toBe(testUser.password);
    
    // Verify the hashed password matches the original
    const isMatch = await bcrypt.compare(testUser.password, newUser.password);
    expect(isMatch).toBe(true);
  });

  it('should not save a user with duplicate email', async () => {
    // First create a user
    await User.create(testUser);
    
    // Try to create another user with same email
    try {
      await User.create({
        username: 'anotheruser',
        email: testUser.email, // same email
        password: 'anotherpassword'
      });
      
      // If we get here, test fails
      fail('Should not allow duplicate email');
    } catch (error) {
      expect(error).toBeTruthy();
      expect(error.name).toBe('MongoServerError');
      expect(error.code).toBe(11000); // Duplicate key error
    }
  });

  it('should not save a user with duplicate username', async () => {
    // First create a user
    await User.create(testUser);
    
    // Try to create another user with same username
    try {
      await User.create({
        username: testUser.username, // same username
        email: 'another@example.com',
        password: 'anotherpassword'
      });
      
      // If we get here, test fails
      fail('Should not allow duplicate username');
    } catch (error) {
      expect(error).toBeTruthy();
      expect(error.name).toBe('MongoServerError');
      expect(error.code).toBe(11000); // Duplicate key error
    }
  });

  it('should generate a JWT token', async () => {
    const user = await User.create(testUser);
    
    // Generate token
    const token = user.getSignedJwtToken();
    
    // Verify it's a valid token
    expect(token).toBeTruthy();
    
    // Decode the token and verify its contents
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded).toBeTruthy();
    expect(decoded.id.toString()).toBe(user._id.toString());
    expect(decoded.username).toBe(user.username);
  });

  it('should match passwords correctly', async () => {
    const user = await User.create(testUser);
    
    // Test with correct password
    const isMatchCorrect = await user.matchPassword(testUser.password);
    expect(isMatchCorrect).toBe(true);
    
    // Test with incorrect password
    const isMatchIncorrect = await user.matchPassword('wrongpassword');
    expect(isMatchIncorrect).toBe(false);
  });

  it('should update password hash when password is changed', async () => {
    const user = await User.create(testUser);
    const originalPasswordHash = user.password;
    
    // Change the password
    user.password = 'newpassword123';
    await user.save();
    
    // Verify hash changed
    expect(user.password).not.toBe(originalPasswordHash);
    
    // Verify new password matches
    const isMatch = await bcrypt.compare('newpassword123', user.password);
    expect(isMatch).toBe(true);
  });

  it('should not hash password again if password is not modified', async () => {
    const user = await User.create(testUser);
    const originalPasswordHash = user.password;
    
    // Update non-password field
    user.username = 'updatedusername';
    await user.save();
    
    // Password hash should not change
    expect(user.password).toBe(originalPasswordHash);
  });
}); 