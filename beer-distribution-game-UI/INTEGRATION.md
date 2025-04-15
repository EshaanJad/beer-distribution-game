# Beer Distribution Game - Frontend/Backend Integration Guide

This document provides instructions on integrating the Beer Distribution Game UI with the backend server.

## Overview

The Beer Distribution Game frontend is built with Next.js and connects to the Node.js backend server via:

1. RESTful API calls for data operations
2. WebSocket connections for real-time updates

## Setup Instructions

### 1. Environment Configuration

Create a `.env.local` file in the root of the frontend project with the following variables:

```
# Backend API and WebSocket URLs
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WS_URL=ws://localhost:5000/ws

# Feature flags
NEXT_PUBLIC_ENABLE_BLOCKCHAIN=false
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

Adjust the URLs based on your backend deployment.

### 2. Install Dependencies

Make sure to install all required dependencies:

```bash
npm install
# or
pnpm install
```

If you encounter TypeScript errors, install the required type definitions:

```bash
npm install --save-dev @types/node @types/react @types/react-dom
# or
pnpm add -D @types/node @types/react @types/react-dom
```

### 3. Backend Setup

Ensure your backend server is running and accessible at the configured URLs. The backend server should provide:

- RESTful API endpoints that match the client implementation
- WebSocket server for real-time updates
- Authentication endpoints for user management
- Game state management endpoints

## Key Integration Points

### API Client

The `api-client.ts` file contains all the API functions needed to communicate with the backend:

- Authentication (`auth`)
- Game management (`games`)
- Order processing (`orders`)
- Inventory management (`inventory`)
- Analytics (`analytics`)
- Blockchain integration (`blockchain`)

### WebSocket Connection

The `useWebSocket` hook manages real-time connections with the backend:

- Automatically connects when a game ID is provided
- Reconnects on disconnection
- Provides methods for sending WebSocket messages
- Handles incoming WebSocket events

### Game Provider

The `GameProvider` component serves as the central state manager for the game:

- Loads game state from the backend
- Updates state based on WebSocket events
- Provides game action methods to components
- Handles error states and loading indicators

## Authentication Flow

1. User registers or logs in through the `/auth/login` or `/auth/register` endpoints
2. Backend returns a JWT token
3. Frontend stores token in localStorage
4. All subsequent API requests include the token in the Authorization header
5. WebSocket connections include the token as a URL parameter

## Game Flow

1. **Game Creation**:
   - User configures game settings in frontend
   - Frontend calls `games.create()` with configuration
   - Backend creates game and returns game ID
   - Frontend redirects to game page with game ID

2. **Joining a Game**:
   - User enters game code in frontend
   - Frontend calls `games.join()` with game ID and selected role
   - Backend assigns role and returns game state
   - Frontend loads game UI with assigned role

3. **Placing Orders**:
   - User inputs order quantity in UI
   - Frontend calls `orders.place()` with game ID, roles, and quantity
   - Backend processes order and updates game state
   - WebSocket event notifies all players of the order
   - UI updates to show order status

4. **Advancing Weeks**:
   - User or host triggers week advancement
   - Frontend calls `games.advanceWeek()` with game ID
   - Backend processes all pending actions and updates game state
   - WebSocket event notifies all players of new state
   - UI updates to show new week

## Blockchain Integration

When blockchain features are enabled:

1. Orders can be verified and recorded on the blockchain
2. Transactions are visible in the UI with verification status
3. Supply chain history is immutable and transparent

To enable blockchain features:
- Set `NEXT_PUBLIC_ENABLE_BLOCKCHAIN=true` in `.env.local`
- Ensure the backend has blockchain services configured
- Additional UI elements will appear for blockchain verification

## Troubleshooting

### API Connection Issues

- Check that backend server is running
- Verify API URLs in `.env.local` file
- Check browser console for CORS errors
- Ensure authentication token is valid

### WebSocket Connection Issues

- Check that backend WebSocket server is running
- Verify WebSocket URL in `.env.local` file
- Check browser console for connection errors
- Ensure WebSocket route on backend is properly configured

### Game State Synchronization

- If game state is out of sync, try refreshing the page
- Check for WebSocket disconnection messages
- Verify that all players are connected to the same game

## Development Tips

1. Use the WebSocket debug panel in browser dev tools to monitor events
2. Enable verbose logging in the backend for troubleshooting
3. Test authentication flow thoroughly before other features
4. Consider using mocks for blockchain during development 