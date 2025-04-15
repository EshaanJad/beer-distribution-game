# Beer Distribution Game UI

This repository contains the frontend UI for the Beer Distribution Game, a simulation that demonstrates key principles of supply chain management.

## Features

- Interactive game interface for all supply chain roles
- Real-time game state updates
- Blockchain verification capabilities
- Analytics dashboard with performance metrics
- Multi-player support through WebSocket connections

## Technology Stack

- **Framework**: Next.js
- **UI Components**: Custom components with Radix UI and Tailwind CSS
- **State Management**: React Context API
- **API Communication**: Fetch API with custom client
- **Real-time Updates**: WebSocket
- **Optional Blockchain Integration**: Ethereum-compatible networks

## Setup and Installation

### Prerequisites

- Node.js (v18 or later)
- Backend server (see [Backend Repository](https://github.com/your-org/beer-distribution-game-backend))
- npm or pnpm

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-org/beer-distribution-game-UI.git
cd beer-distribution-game-UI
```

2. Install dependencies:

```bash
npm install
# or
pnpm install
```

3. Create a `.env.local` file with the following variables:

```
# Backend API and WebSocket URLs
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WS_URL=ws://localhost:5000/ws

# Feature flags
NEXT_PUBLIC_ENABLE_BLOCKCHAIN=false
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

4. Start the development server:

```bash
npm run dev
# or
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Backend Integration

This UI is designed to work with the Beer Distribution Game backend server. For full functionality, make sure the backend server is running and accessible at the URLs specified in the `.env.local` file.

See the [INTEGRATION.md](./INTEGRATION.md) file for detailed instructions on connecting the frontend to the backend.

## Game Instructions

### Creating a Game

1. Navigate to the "Create Game" page
2. Configure game settings:
   - Demand pattern
   - Delay periods
   - Initial inventory
   - Blockchain options
3. Click "Create Game" to generate a game code
4. Share the game code with other players

### Joining a Game

1. Navigate to the "Join Game" page
2. Enter the game code
3. Select an available role (Retailer, Wholesaler, Distributor, or Factory)
4. Click "Join Game" to enter the game session

### Playing the Game

1. View your current inventory and incoming orders
2. Place orders to your upstream supplier
3. Process outgoing orders to downstream customers
4. Track costs and performance metrics
5. Optimize your ordering strategy to minimize costs

## Blockchain Integration

When blockchain features are enabled:

1. Each order can be verified on the blockchain
2. Players can view transaction details and verification status
3. The game history is immutable and transparent

To enable blockchain features, set `NEXT_PUBLIC_ENABLE_BLOCKCHAIN=true` in your `.env.local` file and ensure the backend has blockchain services configured.

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- The original Beer Distribution Game developed at MIT's Sloan School of Management
- All contributors to the project 