const { ethers } = require("hardhat");

async function main() {
  console.log("Starting minimal test...");

  // Get signers
  const [deployer, player1, player2, player3, player4] = await ethers.getSigners();
  console.log("Using deployer:", deployer.address);

  // Connect to deployed contracts
  const playerRegistryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const gameFactoryAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  const PlayerRegistry = await ethers.getContractFactory("PlayerRegistry");
  const playerRegistry = await PlayerRegistry.attach(playerRegistryAddress);
  
  const GameFactory = await ethers.getContractFactory("GameFactory");
  const gameFactory = await GameFactory.attach(gameFactoryAddress);

  console.log("Connected to contracts");

  // Create a game with zero delays to simplify testing
  console.log("\nCreating a minimal test game...");
  const timestamp = Math.floor(Date.now() / 1000);
  const gameId = `MIN_${timestamp}`;
  const orderDelay = 0;  // 0-week order delay
  const shippingDelay = 0;  // 0-week shipping delay
  const demandPattern = 0;  // Constant demand
  const initialInventory = 12;
  
  // Create the game
  const gameInstanceAddress = await gameFactory.callStatic.createGame(
    gameId,
    orderDelay,
    shippingDelay,
    demandPattern,
    initialInventory
  );
  
  const tx = await gameFactory.createGame(
    gameId,
    orderDelay,
    shippingDelay,
    demandPattern,
    initialInventory
  );
  
  await tx.wait();
  console.log("Game created with ID:", gameId);
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
  
  // Process customer order
  console.log("\nProcessing customer order...");
  await gameInstance.processCustomerOrder(0);
  console.log("Customer order processed");
  
  // Place a single small order
  console.log("\nPlacing a small order...");
  await gameInstance.connect(player1).placeOrder(1, 2, 1); // Retailer -> Wholesaler, just 1 unit
  console.log("Order placed");
  
  // Directly view pipelines before advancing
  try {
    console.log("\nChecking pipeline state before advancing week...");
    if (orderDelay === 0) {
      const wholesalerOrders = await gameInstance.orderPipeline(0, 2, 0);
      console.log("Wholesaler pending orders at index 0:", wholesalerOrders.toString());
    }
    
    if (shippingDelay === 0) {
      const retailerShipments = await gameInstance.shipmentPipeline(0, 1, 0);
      console.log("Retailer pending shipments at index 0:", retailerShipments.toString());
    }
  } catch (error) {
    console.log("Error checking pipelines:", error.message);
  }
  
  // Try to advance the week with special error handling
  console.log("\nAdvancing the week...");
  try {
    const advanceTx = await gameInstance.advanceWeek();
    const receipt = await advanceTx.wait();
    console.log("Week advanced successfully");
    console.log("Gas used:", receipt.gasUsed.toString());
    
    const currentWeek = await gameInstance.currentWeek();
    console.log("New week:", currentWeek.toString());
  } catch (error) {
    console.log("Failed to advance week:", error.message);
    
    // Try to debug the specific issue
    console.log("\nDiagnostic information:");
    try {
      // Check current state
      const retailerState = await gameInstance.getPlayerState(1);
      console.log("Retailer state:", retailerState.map(v => v.toString()));
      
      const wholesalerState = await gameInstance.getPlayerState(2);
      console.log("Wholesaler state:", wholesalerState.map(v => v.toString()));
    } catch (innerError) {
      console.log("Error getting additional diagnostic info:", innerError.message);
    }
  }
  
  console.log("\nMinimal test completed");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1);
  }); 