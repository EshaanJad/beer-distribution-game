const { ethers } = require("hardhat");

async function main() {
  console.log("Starting test for the fixed contract...");

  // Deploy fresh contracts for testing
  console.log("Deploying new contracts...");
  
  // Deploy PlayerRegistry first
  const PlayerRegistry = await ethers.getContractFactory("PlayerRegistry");
  const playerRegistry = await PlayerRegistry.deploy();
  await playerRegistry.deployed();
  console.log(`PlayerRegistry deployed to: ${playerRegistry.address}`);
  
  // Deploy GameFactory with reference to PlayerRegistry
  const GameFactory = await ethers.getContractFactory("GameFactory");
  const gameFactory = await GameFactory.deploy(playerRegistry.address);
  await gameFactory.deployed();
  console.log(`GameFactory deployed to: ${gameFactory.address}`);

  // Get signers
  const [deployer, player1, player2, player3, player4] = await ethers.getSigners();
  console.log("Registering players...");
  
  // Register players
  await playerRegistry.connect(player1).registerPlayer("Retailer");
  await playerRegistry.connect(player2).registerPlayer("Wholesaler");
  await playerRegistry.connect(player3).registerPlayer("Distributor");
  await playerRegistry.connect(player4).registerPlayer("Factory");
  console.log("Players registered");

  // Create a game with specified delays
  console.log("\nCreating a game with shipping delay 1 and order delay 0...");
  const timestamp = Math.floor(Date.now() / 1000);
  const gameId = `TEST_${timestamp}`;
  const orderDelay = 0;  // Testing with 0 order delay
  const shippingDelay = 1;  // Testing with 1 shipping delay
  const demandPattern = 0;  // Constant demand
  const initialInventory = 12;
  
  // Create the game
  const tx = await gameFactory.createGame(
    gameId,
    orderDelay,
    shippingDelay,
    demandPattern,
    initialInventory
  );
  
  const receipt = await tx.wait();
  console.log("Game created with ID:", gameId);

  // Get game address from event
  const gameCreatedEvent = receipt.events.find(e => e.event === "GameCreated");
  const gameInstanceAddress = gameCreatedEvent.args.gameAddress;
  console.log("Game instance address:", gameInstanceAddress);

  // Assign roles to players
  console.log("\nAssigning roles to players...");
  
  await playerRegistry.assignRole(gameId, player1.address, 1); // Retailer
  await playerRegistry.assignRole(gameId, player2.address, 2); // Wholesaler
  await playerRegistry.assignRole(gameId, player3.address, 3); // Distributor
  await playerRegistry.assignRole(gameId, player4.address, 4); // Factory
  
  console.log("All roles assigned");

  // Connect to the game instance
  const GameInstance = await ethers.getContractFactory("GameInstance");
  const gameInstance = await GameInstance.attach(gameInstanceAddress);
  
  // Start the game
  console.log("\nStarting the game...");
  await gameInstance.startGame();
  console.log("Game started");
  
  // Process customer order for week 0
  console.log("\nProcessing customer order for week 0...");
  await gameInstance.processCustomerOrder(0);
  console.log("Customer order processed");
  
  // Place orders between roles
  console.log("\nPlacing orders between roles...");
  await gameInstance.connect(player1).placeOrder(1, 2, 5); // Retailer -> Wholesaler
  await gameInstance.connect(player2).placeOrder(2, 3, 6); // Wholesaler -> Distributor
  await gameInstance.connect(player3).placeOrder(3, 4, 7); // Distributor -> Factory
  console.log("Orders placed successfully");

  // Display state before advancing week
  console.log("\n===== State Before Advancing Week =====");
  await displayGameState(gameInstance);
  
  // Try to advance the week
  console.log("\nAdvancing the week...");
  const advanceTx = await gameInstance.advanceWeek();
  const advanceReceipt = await advanceTx.wait();
  console.log("Week advanced successfully! Gas used:", advanceReceipt.gasUsed.toString());
  
  // Display state after advancing week
  console.log("\n===== State After Advancing Week =====");
  await displayGameState(gameInstance);
  
  // Advance another week to make sure everything is still working
  console.log("\nProcessing customer order for week 1...");
  await gameInstance.processCustomerOrder(1);
  console.log("Customer order processed");
  
  // Place more orders
  console.log("\nPlacing more orders...");
  await gameInstance.connect(player1).placeOrder(1, 2, 8); // Retailer -> Wholesaler
  await gameInstance.connect(player2).placeOrder(2, 3, 7); // Wholesaler -> Distributor
  await gameInstance.connect(player3).placeOrder(3, 4, 6); // Distributor -> Factory
  console.log("Orders placed successfully");
  
  // Advance week again
  console.log("\nAdvancing the week again...");
  const advanceTx2 = await gameInstance.advanceWeek();
  const advanceReceipt2 = await advanceTx2.wait();
  console.log("Week advanced a second time! Gas used:", advanceReceipt2.gasUsed.toString());
  
  // Display final state
  console.log("\n===== Final Game State =====");
  await displayGameState(gameInstance);
  
  console.log("\nTest for fixed contract completed successfully!");
}

async function displayGameState(gameInstance) {
  const currentWeek = await gameInstance.currentWeek();
  const customerDemand = await gameInstance.getCurrentCustomerDemand();
  
  console.log("Current Week:", currentWeek.toString());
  console.log("Customer Demand:", customerDemand.toString());
  
  // Display player states
  await displayPlayerState(gameInstance, "Retailer", 1);
  await displayPlayerState(gameInstance, "Wholesaler", 2);
  await displayPlayerState(gameInstance, "Distributor", 3);
  await displayPlayerState(gameInstance, "Factory", 4);
}

async function displayPlayerState(gameInstance, roleName, roleNumber) {
  const [inventory, backlog, incomingOrders, outgoingOrders, totalCost] = 
    await gameInstance.getPlayerState(roleNumber);
  
  console.log(`\n${roleName} State:`);
  console.log(`  Inventory: ${inventory}`);
  console.log(`  Backlog: ${backlog}`);
  console.log(`  Incoming Orders: ${incomingOrders}`);
  console.log(`  Outgoing Orders: ${outgoingOrders}`);
  console.log(`  Total Cost: ${totalCost}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Test failed with error:", error);
    process.exit(1);
  }); 