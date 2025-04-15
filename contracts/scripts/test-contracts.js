const { ethers } = require("hardhat");

async function main() {
  console.log("Starting contract interaction test...");

  // Get signers for different players
  const [deployer, player1, player2, player3, player4] = await ethers.getSigners();
  
  console.log("Using addresses:");
  console.log("Deployer:", deployer.address);
  console.log("Player 1:", player1.address);
  console.log("Player 2:", player2.address);
  console.log("Player 3:", player3.address);
  console.log("Player 4:", player4.address);

  // Connect to deployed contracts
  const playerRegistryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const gameFactoryAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  const PlayerRegistry = await ethers.getContractFactory("PlayerRegistry");
  const playerRegistry = await PlayerRegistry.attach(playerRegistryAddress);
  
  const GameFactory = await ethers.getContractFactory("GameFactory");
  const gameFactory = await GameFactory.attach(gameFactoryAddress);

  console.log("Connected to contracts:");
  console.log("PlayerRegistry:", playerRegistry.address);
  console.log("GameFactory:", gameFactory.address);

  // Register players
  console.log("\nRegistering players...");
  
  async function registerPlayerIfNeeded(signer, username) {
    try {
      const [, , registered] = await playerRegistry.getPlayerDetails(signer.address);
      if (!registered) {
        await playerRegistry.connect(signer).registerPlayer(username);
        console.log(`${username} registered successfully`);
      } else {
        console.log(`${username} already registered`);
      }
    } catch (error) {
      console.error(`Error registering ${username}:`, error.message);
    }
  }
  
  await registerPlayerIfNeeded(player1, "Alice");
  await registerPlayerIfNeeded(player2, "Bob");
  await registerPlayerIfNeeded(player3, "Charlie");
  await registerPlayerIfNeeded(player4, "Dave");

  // Create a game
  console.log("\nCreating a new game...");
  const timestamp = Math.floor(Date.now() / 1000);
  const gameId = `GAME_${timestamp}`;
  const orderDelay = 2;
  const shippingDelay = 2;
  const demandPattern = 0; // Constant demand
  const initialInventory = 12;
  
  const tx = await gameFactory.createGame(
    gameId,
    orderDelay,
    shippingDelay,
    demandPattern,
    initialInventory
  );
  
  const receipt = await tx.wait();
  console.log("Game created with ID:", gameId);
  
  // Get game instance address from event logs
  const gameCreatedEvent = receipt.events.find(e => e.event === "GameCreated");
  console.log("GameCreated event:", gameCreatedEvent.args);
  const gameInstanceAddress = gameCreatedEvent.args.gameAddress;
  console.log("Game instance address:", gameInstanceAddress);

  // Assign roles to players
  console.log("\nAssigning roles to players...");
  
  await playerRegistry.assignRole(gameId, player1.address, 1); // Retailer
  console.log("Player 1 assigned as Retailer");
  
  await playerRegistry.assignRole(gameId, player2.address, 2); // Wholesaler
  console.log("Player 2 assigned as Wholesaler");
  
  await playerRegistry.assignRole(gameId, player3.address, 3); // Distributor
  console.log("Player 3 assigned as Distributor");
  
  await playerRegistry.assignRole(gameId, player4.address, 4); // Factory
  console.log("Player 4 assigned as Factory");
  
  // Verify all roles are assigned
  const allRolesAssigned = await playerRegistry.allRolesAssigned(gameId);
  console.log("\nAll roles assigned:", allRolesAssigned);

  // Connect to the game instance
  const GameInstance = await ethers.getContractFactory("GameInstance");
  const gameInstance = await GameInstance.attach(gameInstanceAddress);
  
  // Start the game
  console.log("\nStarting the game...");
  await gameInstance.startGame();
  console.log("Game started!");
  
  // Get current week
  const currentWeek = await gameInstance.currentWeek();
  console.log("Current week:", currentWeek.toString());
  
  // Get customer demand
  const customerDemand = await gameInstance.getCurrentCustomerDemand();
  console.log("Customer demand:", customerDemand.toString());
  
  console.log("\nTest complete!");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 