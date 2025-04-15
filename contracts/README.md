# Beer Distribution Game Contracts

This repository contains the smart contracts for the Beer Distribution Game, a supply chain simulation game implemented on the Ethereum blockchain.

## Prerequisites

- Node.js and npm
- Hardhat

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy the `.env.example` file to `.env` and fill in your values:
   ```
   cp .env.example .env
   ```

## Contracts

The system consists of the following contracts:

- **PlayerRegistry**: Manages player identities and role assignments
- **GameFactory**: Creates and manages game instances
- **GameInstance**: Implements the logic for a single game

## Deployment

### Local Deployment

To deploy to the local Hardhat network, start the network first:

```
npm run node
```

Then in a separate terminal, deploy the contracts:

```
npm run deploy
```

### Testnet Deployment

To deploy to the Sepolia testnet, make sure your `.env` file is set up with your Sepolia URL and private key, then run:

```
npm run deploy:testnet
```

## Testing

To run the test scripts:

```
npx hardhat run scripts/test-contracts.js --network localhost
npx hardhat run scripts/test-gameplay.js --network localhost
```

## Game Rules

1. Players take on roles in a supply chain: Retailer, Wholesaler, Distributor, and Factory
2. Each week, customer demand generates orders to the Retailer
3. Each role decides how much to order from their supplier
4. Orders and shipments take time to be delivered (specified by order and shipping delays)
5. The goal is to minimize inventory holding costs and backlog costs

## Contract Parameters

When creating a new game, you need to specify:

- **gameId**: A unique identifier for the game
- **orderDelay**: The number of weeks it takes for an order to be received
- **shippingDelay**: The number of weeks it takes for a shipment to be delivered
- **demandPattern**: The pattern of customer demand (0=Constant, 1=Step, 2=Random)
- **initialInventory**: The starting inventory for all players 