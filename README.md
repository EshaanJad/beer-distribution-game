# Beer Distribution Game

An interactive simulation platform for the Beer Distribution Game, which demonstrates supply chain management principles and the bullwhip effect.

## Project Overview

The Beer Distribution Game is a classic simulation developed at MIT that demonstrates how small fluctuations in retail demand can create large variations in production and inventory throughout a supply chain network - known as the "bullwhip effect".

This implementation includes:
- A modern web-based UI for playing the game 
- A backend server for game coordination and data management
- Real-time updates using WebSockets
- Optional blockchain integration for transaction verification
- Analytics dashboard for performance monitoring

## Repository Structure

- `/beer-distribution-game-UI` - Frontend application built with Next.js
- `/backend` - Node.js/Express backend server with MongoDB integration
- `/docs` - Documentation and design files
- `/integration_test.js` - Integration testing script

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MongoDB (for backend persistence)

### Quick Start

For convenience, a startup script is provided that will start both the frontend and backend services:

```bash
# Make the script executable
chmod +x start.sh

# Run the script
./start.sh
```

This script automatically:
- Checks if MongoDB is installed and running
- Creates necessary environment files if they don't exist
- Installs dependencies if needed
- Starts both the backend and frontend servers

### Manual Setup

#### Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with:
   ```
   PORT=5001
   MONGODB_URI=mongodb://localhost:27017/beer-distribution-game
   JWT_SECRET=your_jwt_secret_here
   FRONTEND_URL=http://localhost:3000
   ```

4. Start the backend server:
   ```bash
   node server.js
   ```

#### Frontend
1. Navigate to the frontend directory:
   ```bash
   cd beer-distribution-game-UI
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5001/api
   NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:5001
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Testing

For detailed testing instructions, see [TESTING_GUIDE.md](TESTING_GUIDE.md).

## Documentation

- [Backend Integration](INTEGRATION.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- The original Beer Distribution Game developed at MIT Sloan School of Management
- The system dynamics concepts developed by Jay Forrester 