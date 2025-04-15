#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}  Beer Distribution Game Launcher   ${NC}"
echo -e "${BLUE}====================================${NC}"

# Check for MongoDB
echo -e "\n${YELLOW}Checking MongoDB...${NC}"
if command -v mongod &> /dev/null; then
    echo -e "${GREEN}MongoDB found!${NC}"
else
    echo -e "${RED}MongoDB not found. Please install MongoDB before proceeding.${NC}"
    exit 1
fi

# Check if MongoDB is running
echo -e "\n${YELLOW}Checking if MongoDB is running...${NC}"
if pgrep mongod > /dev/null; then
    echo -e "${GREEN}MongoDB is running.${NC}"
else
    echo -e "${YELLOW}MongoDB is not running. Attempting to start...${NC}"
    mongod --fork --logpath /tmp/mongodb.log
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}MongoDB started successfully.${NC}"
    else
        echo -e "${RED}Failed to start MongoDB. Please start it manually.${NC}"
        exit 1
    fi
fi

# Create necessary environment files if they don't exist
echo -e "\n${YELLOW}Checking environment files...${NC}"

# Backend .env
if [ ! -f "./backend/.env" ]; then
    echo -e "${YELLOW}Creating backend .env file...${NC}"
    cat > ./backend/.env << EOL
PORT=5001
MONGODB_URI=mongodb://localhost:27017/beer-distribution-game
JWT_SECRET=beer_distribution_game_secret_token
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
BLOCKCHAIN_ENABLED=false
ENABLE_AGENT_SYSTEM=true
EOL
    echo -e "${GREEN}Backend .env file created.${NC}"
else
    echo -e "${GREEN}Backend .env file already exists.${NC}"
fi

# Frontend .env.local
if [ ! -f "./beer-distribution-game-UI/.env.local" ]; then
    echo -e "${YELLOW}Creating frontend .env.local file...${NC}"
    cat > ./beer-distribution-game-UI/.env.local << EOL
NEXT_PUBLIC_API_URL=http://localhost:5001/api
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:5001
NEXT_PUBLIC_BLOCKCHAIN_ENABLED=false
EOL
    echo -e "${GREEN}Frontend .env.local file created.${NC}"
else
    echo -e "${GREEN}Frontend .env.local file already exists.${NC}"
fi

# Install dependencies if needed
echo -e "\n${YELLOW}Checking backend dependencies...${NC}"
if [ ! -d "./backend/node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    (cd backend && npm install)
    echo -e "${GREEN}Backend dependencies installed.${NC}"
else
    echo -e "${GREEN}Backend dependencies already installed.${NC}"
fi

echo -e "\n${YELLOW}Checking frontend dependencies...${NC}"
if [ ! -d "./beer-distribution-game-UI/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    (cd beer-distribution-game-UI && npm install)
    echo -e "${GREEN}Frontend dependencies installed.${NC}"
else
    echo -e "${GREEN}Frontend dependencies already installed.${NC}"
fi

# Function to stop background processes on exit
function cleanup {
    echo -e "\n${YELLOW}Stopping services...${NC}"
    if [ ! -z "$backend_pid" ]; then
        echo -e "${YELLOW}Stopping backend server (PID: $backend_pid)${NC}"
        kill -TERM $backend_pid 2>/dev/null
    fi
    if [ ! -z "$frontend_pid" ]; then
        echo -e "${YELLOW}Stopping frontend server (PID: $frontend_pid)${NC}"
        kill -TERM $frontend_pid 2>/dev/null
    fi
    echo -e "${GREEN}All services stopped.${NC}"
}

# Start backend server
echo -e "\n${YELLOW}Starting backend server...${NC}"
(cd backend && node server.js) &
backend_pid=$!
echo -e "${GREEN}Backend server started with PID: $backend_pid${NC}"

# Wait a bit for backend to initialize
sleep 3

# Start frontend development server
echo -e "\n${YELLOW}Starting frontend development server...${NC}"
(cd beer-distribution-game-UI && npm run dev) &
frontend_pid=$!
echo -e "${GREEN}Frontend development server started with PID: $frontend_pid${NC}"

# Register the cleanup function for when the script is terminated
trap cleanup EXIT

# Wait for user input to stop the servers
echo -e "\n${GREEN}All services are running!${NC}"
echo -e "${BLUE}====================================${NC}"
echo -e "${YELLOW}Backend:${NC} http://localhost:5001"
echo -e "${YELLOW}Frontend:${NC} http://localhost:3000"
echo -e "${BLUE}====================================${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Keep the script running until terminated
wait 