const { ethers } = require("hardhat");

async function main() {
  console.log("Starting simple test...");

  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log("Using deployer:", deployer.address);

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

  // Create a game with short delays
  console.log("\nCreating a new game with SHORT DELAYS...");
  const timestamp = Math.floor(Date.now() / 1000);
  const gameId = `QUICK_${timestamp}`;
  const orderDelay = 0;  // 0-week order delay
  const shippingDelay = 1;  // 1-week shipping delay
  const demandPattern = 0;  // Constant demand
  const initialInventory = 12;
  
  // Create the game - the address is returned directly from the function
  const gameInstanceAddress = await gameFactory.callStatic.createGame(
    gameId,
    orderDelay,
    shippingDelay,
    demandPattern,
    initialInventory
  );
  
  console.log("Game instance address (from callStatic):", gameInstanceAddress);
  
  // Now actually create the game
  const tx = await gameFactory.createGame(
    gameId,
    orderDelay,
    shippingDelay,
    demandPattern,
    initialInventory
  );
  
  const receipt = await tx.wait();
  console.log("Game created with ID:", gameId);
  
  // Try to extract the address from the event
  if (receipt.events && receipt.events.length > 0) {
    for (const event of receipt.events) {
      console.log("Event:", event.event);
      if (event.event === "GameCreated" && event.args) {
        console.log("Game address from event:", event.args.gameAddress);
      }
    }
  }
  
  // Print the raw logs for analysis
  console.log("\nTransaction logs:");
  receipt.logs.forEach((log, index) => {
    console.log(`Log ${index}:`, log);
  });
  
  // Connect to the game instance using the address we got from callStatic
  const GameInstance = await ethers.getContractFactory("GameInstance");
  const gameInstance = await GameInstance.attach(gameInstanceAddress);
  
  console.log("\nGame instance connected at:", gameInstance.address);
  
  // Test if we can interact with the game
  try {
    const currentWeek = await gameInstance.currentWeek();
    console.log("Current week:", currentWeek.toString());
    
    // If we can get the current week, the game instance is working
    console.log("Game instance is valid and accessible!");
  } catch (error) {
    console.error("Failed to interact with game instance:", error.message);
  }
  
  console.log("\nSimple test completed!");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 