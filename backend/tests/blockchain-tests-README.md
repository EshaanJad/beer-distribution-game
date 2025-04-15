# Blockchain Service Integration Tests

This directory contains integration tests that verify the backend's correct interaction with Ethereum smart contracts for the Beer Distribution Game. 

## Prerequisites

1. A running local Ethereum node (like Hardhat or Ganache)
2. Deployed versions of the following contracts:
   - `PlayerRegistry`
   - `GameFactory`
   - `GameInstance` (will be deployed by the GameFactory)

## Setup Instructions

### 1. Run a Local Ethereum Node 

From the `/contracts` directory, run:

```bash
npx hardhat node
```

This will start a local Ethereum node with predefined accounts and private keys.

### 2. Deploy Contracts

In another terminal, still in the `/contracts` directory, run:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Take note of the deployed contract addresses for `PlayerRegistry` and `GameFactory`.

### 3. Set Environment Variables

Create a `.env.test` file in the `backend` directory with the following variables:

```
TEST_RPC_URL=http://localhost:8545
TEST_CHAIN_ID=1337
TEST_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
TEST_PLAYER_REGISTRY_ADDRESS=0x... # From deployment
TEST_GAME_FACTORY_ADDRESS=0x...    # From deployment
RUN_BLOCKCHAIN_TESTS=true
```

Notes:
- The `TEST_PRIVATE_KEY` is the default first account private key in Hardhat's local node
- Set `RUN_BLOCKCHAIN_TESTS=true` only when you want to run blockchain integration tests
- Make sure to update the contract addresses with the ones from your deployment

## Running the Tests

Run the blockchain integration tests from the `backend` directory:

```bash
# Run blockchain service tests
npm test -- -t "Blockchain Service Integration" 

# Run synchronization service tests
npm test -- -t "Synchronization Service Integration"

# Run both
npm test -- -t "Blockchain|Synchronization"
```

## Test Coverage

The tests verify the following functionality:

### Blockchain Service Tests
1. Initialization of the blockchain service
2. Registration of a player
3. Creation of a game
4. Assigning roles to players
5. Starting a game
6. Placing orders
7. Advancing weeks
8. Getting player roles and current week
9. Event processing and database updates

### Synchronization Service Tests
1. Synchronizing game data with the blockchain
2. Synchronizing orders with the blockchain
3. Running full synchronization 
4. Counting pending orders

## Troubleshooting

- If tests fail with "transaction underpriced", try increasing the gas price in your RPC calls
- If events aren't being processed, ensure you've allowed enough time with `setTimeout`
- Verify that your contract ABIs in the `services/blockchain/abis` directory match your deployed contracts
- Check that your `TEST_PRIVATE_KEY` has enough ETH for transactions
- Verify network connectivity to your local Ethereum node 