const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const User = require('../models/User');

describe('Auth Middleware', () => {
  let mockRequest;
  let mockResponse;
  let nextFunction;
  let user;
  let token;

  beforeEach(async () => {
    // Create a mock user
    user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });

    // Generate a valid token
    token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Setup request, response, and next function mocks
    mockRequest = {
      headers: {},
      get: jest.fn().mockImplementation((header) => {
        return mockRequest.headers[header.toLowerCase()];
      })
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    nextFunction = jest.fn();
  });

  it('should call next() when a valid token is provided', async () => {
    // Set a valid authorization header
    mockRequest.headers.authorization = `Bearer ${token}`;

    // Call the middleware
    await protect(mockRequest, mockResponse, nextFunction);

    // Expect next to have been called
    expect(nextFunction).toHaveBeenCalled();
    
    // Expect user to be set on request
    expect(mockRequest.user).toBeDefined();
    expect(mockRequest.user._id.toString()).toBe(user._id.toString());
    expect(mockRequest.user.username).toBe(user.username);
  });

  it('should return 401 when no token is provided', async () => {
    // Call the middleware with no authorization header
    await protect(mockRequest, mockResponse, nextFunction);

    // Expect response.status to have been called with 401
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: 'Not authorized to access this route'
    });
    
    // Expect next to not have been called
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 when an invalid token is provided', async () => {
    // Set an invalid authorization header
    mockRequest.headers.authorization = 'Bearer invalid_token';

    // Call the middleware
    await protect(mockRequest, mockResponse, nextFunction);

    // Expect response.status to have been called with 401
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: 'Not authorized to access this route'
    });
    
    // Expect next to not have been called
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 when user in token does not exist', async () => {
    // Create a token with a non-existent user ID
    const invalidToken = jwt.sign(
      { id: new mongoose.Types.ObjectId(), username: 'nonexistent' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Set the token in the authorization header
    mockRequest.headers.authorization = `Bearer ${invalidToken}`;

    // Call the middleware
    await protect(mockRequest, mockResponse, nextFunction);

    // Expect response.status to have been called with 401
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: 'User not found'
    });
    
    // Expect next to not have been called
    expect(nextFunction).not.toHaveBeenCalled();
  });
}); 