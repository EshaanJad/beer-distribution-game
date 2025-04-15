# Beer Distribution Game Backend Server

Backend server for the Beer Distribution Game, providing REST API and WebSocket endpoints for game management, player interactions, and blockchain integration.

## Setup

### Prerequisites

- Node.js (v14+)
- MongoDB
- Ethereum wallet with testnet ETH (Sepolia network)
- Deployed PlayerRegistry and GameFactory smart contracts

### Installation

1. Clone the repository and navigate to the backend directory:

```bash
git clone <repository_url>
cd <repository_dir>/backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example` and update the values:

```bash
cp .env.example .env
```

4. Update the following values in your `.env` file:

- `MONGODB_URI`: Connection string for your MongoDB database
- `JWT_SECRET`: Secret key for JWT token generation (random string)
- `RPC_URL`: Ethereum RPC URL (e.g., Infura or Alchemy endpoint)
- `PLAYER_REGISTRY_ADDRESS`: Address of the deployed PlayerRegistry contract
- `GAME_FACTORY_ADDRESS`: Address of the deployed GameFactory contract
- `PRIVATE_KEY`: Private key for your Ethereum wallet

### Running the Server

For development (with auto-reload):

```bash
npm run dev
```

For production:

```bash
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/wallet` - Authenticate with wallet signature
- `GET /api/auth/me` - Get authenticated user details

### Games

- `POST /api/games/create` - Create a new game
- `POST /api/games/join` - Join an existing game
- `POST /api/games/:gameId/start` - Start a game
- `POST /api/games/:gameId/advance` - Advance to next week
- `GET /api/games` - Get all games for the authenticated user
- `GET /api/games/:gameId` - Get a specific game
- `GET /api/games/:gameId/state/:week` - Get game state for a specific week

### Orders

- `POST /api/orders/place` - Place an order
- `GET /api/orders/game/:gameId` - Get all orders for a game
- `GET /api/orders/game/:gameId/week/:week` - Get orders for a specific week
- `GET /api/orders/game/:gameId/role/:role` - Get orders for a specific role

### Inventory

- `GET /api/inventory/:gameId/:role` - Get inventory for a specific role
- `GET /api/inventory/:gameId/:role/history` - Get inventory history for a role
- `GET /api/inventory/:gameId` - Get inventory for all roles

### Analytics

- `GET /api/analytics/gameHistory/:gameId` - Get historical data for a game
- `GET /api/analytics/performance/:gameId` - Get performance metrics for a game

## WebSocket Events

### Client to Server

- `authenticate` - Authenticate a socket connection
- `joinGame` - Join a game room
- `leaveGame` - Leave a game room
- `placeOrder` - Notify about placing an order

### Server to Client

- `gameUpdate` - Game state updates
- `notification` - Individual notifications
- `blockchainTransaction` - Blockchain transaction results
- `gameStateUpdated` - Game state updates
- `weekAdvanced` - Week advancement updates
- `playerJoined` - When a player joins the game
- `playerLeft` - When a player leaves the game
- `playerDisconnected` - When a player disconnects
- `orderPlaced` - When an order is placed

## Blockchain Integration

The backend integrates with Ethereum smart contracts for:

- Player registration
- Game creation and management
- Order placement
- Role assignments
- Week advancement

Blockchain transactions are optional and can be enabled/disabled through the game configuration.

## Environment Variables

| Variable | Description |
|----------|-------------|
| PORT | Server port (default: 5000) |
| NODE_ENV | Environment (development/production) |
| MONGODB_URI | MongoDB connection string |
| JWT_SECRET | Secret for JWT tokens |
| JWT_EXPIRE | JWT token expiration |
| RPC_URL | Ethereum RPC URL |
| CHAIN_ID | Ethereum chain ID |
| PLAYER_REGISTRY_ADDRESS | PlayerRegistry contract address |
| GAME_FACTORY_ADDRESS | GameFactory contract address |
| PRIVATE_KEY | Ethereum wallet private key |
| FRONTEND_URL | Frontend application URL for CORS | 