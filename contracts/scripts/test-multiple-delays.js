const { ethers } = require("hardhat");

async function main() {
  console.log("Starting test with multiple shipping delays...");

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
  
  // Register players just once
  console.log("\nRegistering players...");
  await registerPlayers(playerRegistry, player1, player2, player3, player4);
  console.log("Players registered");

  // Test with different shipping delays
  await testWithDelay(gameFactory, playerRegistry, 2, deployer, player1, player2, player3, player4);
  await testWithDelay(gameFactory, playerRegistry, 3, deployer, player1, player2, player3, player4);
  await testWithDelay(gameFactory, playerRegistry, 4, deployer, player1, player2, player3, player4);

  console.log("\nAll tests completed successfully!");
}

async function registerPlayers(playerRegistry, player1, player2, player3, player4) {
  async function registerPlayerIfNeeded(signer, username) {
    try {
      const tx = await playerRegistry.connect(signer).registerPlayer(username);
      await tx.wait();
      console.log(`${username} registered successfully`);
    } catch (error) {
      // Check if the error is because the player is already registered
      if (error.message.includes("Player already registered")) {
        console.log(`${username} already registered`);
      } else {
        console.log(`Error registering ${username}: ${error.message}`);
      }
    }
  }
  
  await registerPlayerIfNeeded(player1, "Retailer");
  await registerPlayerIfNeeded(player2, "Wholesaler");
  await registerPlayerIfNeeded(player3, "Distributor");
  await registerPlayerIfNeeded(player4, "Factory");
}

async function testWithDelay(gameFactory, playerRegistry, shippingDelay, deployer, player1, player2, player3, player4) {
  console.log(`\n=========================================`);
  console.log(`TESTING WITH SHIPPING DELAY OF ${shippingDelay} WEEKS`);
  console.log(`=========================================`);
  
  // Create a game with specified delays
  const timestamp = Math.floor(Date.now() / 1000);
  const gameId = `DELAY${shippingDelay}_${timestamp}`;
  const orderDelay = 0;  // Always 0 week order delay
  const demandPattern = 0;  // Constant demand
  const initialInventory = 12;
  
  console.log(`\nCreating a game with shipping delay ${shippingDelay} and order delay 0...`);
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
  
  // Run for 3 weeks (enough to test shipping pipeline)
  for (let week = 0; week < 3; week++) {
    console.log(`\n----- Week ${week} -----`);
    
    // Process customer order
    await gameInstance.processCustomerOrder(await gameInstance.currentWeek());
    console.log("Customer order processed");
    
    // Place orders between roles (small quantities to avoid any issues)
    await gameInstance.connect(player1).placeOrder(1, 2, 4); // Retailer -> Wholesaler
    await gameInstance.connect(player2).placeOrder(2, 3, 3); // Wholesaler -> Distributor
    await gameInstance.connect(player3).placeOrder(3, 4, 2); // Distributor -> Factory
    console.log("Orders placed");
    
    // Display state before advance
    console.log("\nState before advancing week:");
    await displayGameState(gameInstance);
    
    // Try to advance the week - this is the crucial test
    try {
      const advanceTx = await gameInstance.advanceWeek();
      await advanceTx.wait();
      console.log(`\nSuccessfully advanced to week ${await gameInstance.currentWeek()}`);
      
      // Display state after advancement
      console.log("State after advancing week:");
      await displayGameState(gameInstance);
      await displayPipelines(gameInstance, shippingDelay);
    } catch (error) {
      console.error(`ERROR: Failed to advance week with shipping delay ${shippingDelay}:`, error.message);
      throw error; // Stop the test if there's an error
    }
  }
  
  console.log(`\nTest completed successfully for shipping delay ${shippingDelay}!`);
}

async function displayGameState(gameInstance) {
  const currentWeek = await gameInstance.currentWeek();
  const customerDemand = await gameInstance.getCurrentCustomerDemand();
  
  console.log(`Current Week: ${currentWeek}, Customer Demand: ${customerDemand}`);
  
  // Display player states in a compact format
  const roles = ["Retailer", "Wholesaler", "Distributor", "Factory"];
  
  for (let i = 1; i <= 4; i++) {
    const [inventory, backlog, incomingOrders, outgoingOrders, totalCost] = 
      await gameInstance.getPlayerState(i);
    
    console.log(`${roles[i-1]}: Inv=${inventory}, BL=${backlog}, In=${incomingOrders}, Out=${outgoingOrders}, Cost=${totalCost}`);
  }
}

async function displayPipelines(gameInstance, shippingDelay) {
  try {
    console.log("\nShipment Pipelines:");
    for (let i = 1; i <= 4; i++) {
      const pipeline = await gameInstance.getIncomingShipmentsPipeline(i);
      const roleName = ["Retailer", "Wholesaler", "Distributor", "Factory"][i-1];
      console.log(`  ${roleName}: ${pipeline.join(', ')}`);
    }
  } catch (error) {
    console.log("Could not retrieve shipment pipelines:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Test failed with error:", error);
    process.exit(1);
  }); 