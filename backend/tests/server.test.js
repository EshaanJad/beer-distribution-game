const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');

describe('Server', () => {
  it('should respond with a welcome message at the root route', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('message', 'Beer Distribution Game API');
  });
}); 