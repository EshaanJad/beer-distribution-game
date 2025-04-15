# Beer Distribution Game Backend Tests

This directory contains tests for the Beer Distribution Game backend API and services.

## Setup

The tests use Jest as the test runner and Supertest for API testing. The database is mocked using mongodb-memory-server, which creates an in-memory MongoDB instance for testing.

## Running Tests

To run the tests, use the following command from the root directory:

```bash
npm test
```

To run tests in watch mode (for development):

```bash
npm run test:watch
```

## Test Structure

- **setup.js**: Sets up the MongoDB memory server, creates a test environment, and mocks external services.
- **server.test.js**: Tests the basic server setup and the root route.
- **auth.test.js**: Tests the authentication endpoints (register, login, wallet authentication).
- **games.test.js**: Tests game creation, joining, and starting.
- **orders.test.js**: Tests order placement and retrieval.

## Mocked Services

The following services are mocked for testing:

- **blockchain**: The blockchain service is mocked to simulate blockchain interactions without requiring an actual blockchain connection.
- **socket.io**: WebSocket connections are mocked to simulate real-time communications without requiring a real socket server.

## Adding New Tests

When adding new tests, follow these patterns:

1. Create a new test file in the `tests/` directory using the pattern `*.test.js`.
2. Import the necessary modules and the app.
3. Setup test data and authentication tokens in the `beforeEach` hook.
4. Group related tests using `describe` blocks.
5. Use clear, descriptive test names with the pattern `it('should do something', ...)`.
6. Verify both API responses and database changes when testing endpoints.

## Test Environment

Tests run with `NODE_ENV=test` to ensure they use test configuration. A `.env.test` file is automatically created with test settings if it doesn't exist. 