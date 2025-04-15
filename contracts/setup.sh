#!/bin/bash

# Set up colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Beer Distribution Game Blockchain Layer Setup${NC}"

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

# Compile contracts
echo -e "${BLUE}Compiling contracts...${NC}"
npx hardhat compile

# Run tests
echo -e "${BLUE}Running tests...${NC}"
npx hardhat test

# Check if tests passed
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Tests passed successfully!${NC}"
    
    # Ask for deployment confirmation
    read -p "Do you want to deploy to Sepolia testnet? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Deploying to Sepolia testnet...${NC}"
        npx hardhat run scripts/deploy.js --network sepolia
    else
        echo -e "${BLUE}Skipping deployment${NC}"
    fi
else
    echo -e "${RED}Tests failed! Please fix the issues before deploying.${NC}"
fi

echo -e "${GREEN}Setup complete!${NC}" 