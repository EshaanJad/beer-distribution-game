# Beer Distribution Game - Local Testing Guide

This guide will help you set up, run, and test the complete Beer Distribution Game application locally on your system.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Running the Backend](#running-the-backend)
- [Running the Frontend](#running-the-frontend)
- [Testing the Integration](#testing-the-integration)
- [Common Issues and Troubleshooting](#common-issues-and-troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Git
- npm or yarn

## Quick Start

For convenience, a startup script is provided that will:
1. Check if MongoDB is installed and running
2. Create necessary environment files if they don't exist
3. Install dependencies if needed
4. Start both the backend and frontend servers

To use this script:

```bash
# Make the script executable (if not already)
chmod +x start.sh

# Run the script
./start.sh
```

The script will display information about the services as they start and provide URLs to access them.

Press `Ctrl+C` to stop all services when you're done.

## Running the Backend

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the backend directory with the following variables:
   ```
   PORT=5001
   MONGO_URI=mongodb://localhost:27017/beer-distribution-game
   JWT_SECRET=your_jwt_secret_here
   FRONTEND_URL=http://localhost:3000
   NODE_ENV=development
   BLOCKCHAIN_ENABLED=false
   ```

4. **Start MongoDB** (if not running already):
   ```bash
   mongod --dbpath /path/to/data/db
   ```

5. **Start the backend server**:
   ```bash
   node server.js
   ```
   You should see output indicating that the server is running on port 5001 and has connected to MongoDB.

## Running the Frontend

1. **Navigate to the frontend directory**:
   ```bash
   cd beer-distribution-game-UI
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env.local` file in the frontend directory with the following variables:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5001/api
   NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:5001
   NEXT_PUBLIC_BLOCKCHAIN_ENABLED=false
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   The frontend should now be running on http://localhost:3000.

## Testing the Integration

### 1. Registration and Login

1. Open your browser and navigate to http://localhost:3000/auth/register
2. Create a new account with a username, email, and password
3. After successful registration, you'll be automatically logged in and redirected to the dashboard

### 2. Creating a Game

1. Navigate to http://localhost:3000/create-game
2. Configure the game settings:
   - Set demand pattern (Constant, Step, or Random)
   - Set initial inventory (default: 12)
   - Set order delay period (default: 2)
   - Set shipping delay period (default: 2)
   - Enable/disable blockchain features
3. Click "Create Game"
4. After successful creation, you'll see a game code/ID that can be shared with other players

### 3. Joining a Game

1. Navigate to http://localhost:3000/join-game
2. Enter the game code/ID shared by the host
3. Enter your name
4. Select an available role (Retailer, Wholesaler, Distributor, or Factory)
5. Click "Join Game"
6. Wait for all players to join and the host to start the game

### 4. Playing the Game

1. Once the game starts, you'll be redirected to the game board
2. Each week, you'll need to:
   - Review your current inventory
   - Place orders to your supplier
   - Process incoming orders from your customer
3. After all players have taken their actions, the week will advance automatically
4. Continue playing until the game is completed (typically after 20-30 weeks)

### 5. Viewing Analytics

1. After the game is completed, navigate to the analytics dashboard
2. View performance metrics including:
   - Inventory levels over time
   - Order quantities
   - Backlog
   - Cost analysis
3. Compare your performance with other players

## Common Issues and Troubleshooting

### Backend Issues

1. **MongoDB Connection Errors**:
   - Ensure MongoDB is running
   - Check the MONGO_URI in your .env file
   - Verify network connectivity

2. **Port Already in Use**:
   - Change the PORT variable in your .env file
   - Kill the process using the port: `lsof -i :5001` then `kill -9 PID`

### Frontend Issues

1. **API Connection Errors**:
   - Ensure the backend server is running
   - Check the NEXT_PUBLIC_API_URL in your .env.local file
   - Look for CORS errors in your browser's console

2. **WebSocket Connection Issues**:
   - Verify the NEXT_PUBLIC_WEBSOCKET_URL is correct
   - Check browser console for connection errors
   - Ensure the backend server has Socket.io properly configured

3. **Type Errors**:
   - Run `npm install` again to ensure all dependencies are properly installed
   - Check for any missing type definitions

### WebSocket Connection Issues

1. **InvalidStateError: Failed to execute 'send' on 'WebSocket': Still in CONNECTING state**:
   - This error occurs when trying to send a message before the WebSocket connection is fully established
   - Solutions:
     - Ensure the backend server is running and accessible
     - Check that the WebSocket URL in `.env.local` is correct (should be `NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:5001`)
     - Verify that your backend is properly configured for WebSocket connections

2. **Testing WebSocket Connection**:
   ```bash
   cd beer-distribution-game-UI
   node test-websocket.js
   ```
   This script will attempt to connect to the WebSocket server and send a test message. Check the output for any errors.

3. **WebSocket Doesn't Connect**:
   - Ensure the backend server is running
   - Check for CORS issues - the backend should allow WebSocket connections from your frontend's origin
   - Verify network connectivity and that no firewalls are blocking the connection
   - Check browser console for detailed error messages

4. **Game Updates Not Received**:
   - Ensure the WebSocket connection shows as "connected" before taking actions
   - Check that the game ID is correctly passed to the WebSocket hook
   - Verify that the event handlers in the WebSocket service are properly set up

### Game Logic Issues

1. **Players Can't Join Game**:
   - Ensure the correct game ID is being used
   - Verify the backend is running and accessible
   - Check that the role is not already taken

2. **Game Not Advancing**:
   - Ensure all players have placed their orders for the current week
   - Check WebSocket connections for disconnections
   - Verify if any actions are pending in the game state

3. **Inconsistent Game State**:
   - Refresh the page to get the latest state from the server
   - Check network requests for any failed API calls
   - Look for error messages in both frontend and backend logs

For any other issues, check the console logs on both frontend and backend for specific error messages. 