const { ethers } = require("hardhat");

async function main() {
  console.log("Starting gameplay test...");

  // Get signers for different players
  const [deployer, player1, player2, player3, player4] = await ethers.getSigners();
  
  console.log("Using addresses:");
  console.log("Deployer:", deployer.address);
  console.log("Retailer:", player1.address);
  console.log("Wholesaler:", player2.address);
  console.log("Distributor:", player3.address);
  console.log("Factory:", player4.address);

  // Connect to deployed contracts
  const playerRegistryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const gameFactoryAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  const PlayerRegistry = await ethers.getContractFactory("PlayerRegistry");
  const playerRegistry = await PlayerRegistry.attach(playerRegistryAddress);
  
  const GameFactory = await ethers.getContractFactory("GameFactory");
  const gameFactory = await GameFactory.attach(gameFactoryAddress);

  // Get the most recent game
  const gameCount = await gameFactory.getGameCount();
  const lastGameId = await gameFactory.gameIds(gameCount - 1);
  console.log("Most recent game ID:", lastGameId);
  
  const gameInfo = await gameFactory.games(lastGameId);
  const gameInstanceAddress = gameInfo.contractAddress;
  console.log("Game instance address:", gameInstanceAddress);
  
  // Connect to the GameInstance contract
  const GameInstance = await ethers.getContractFactory("GameInstance");
  const gameInstance = await GameInstance.attach(gameInstanceAddress);
  
  // Display initial state
  console.log("\n===== Initial Game State =====");
  await displayGameState(gameInstance, lastGameId);
  
  // Simulate gameplay for 3 weeks
  for (let week = 0; week < 3; week++) {
    console.log(`\n===== WEEK ${week} =====`);
    
    // Process customer order (retail demand)
    await gameInstance.processCustomerOrder(await gameInstance.currentWeek());
    console.log("Processed customer order");
    
    // Place orders
    // Retailer -> Wholesaler
    await placeOrder(gameInstance, player1, 1, 2, 5);
    
    // Wholesaler -> Distributor
    await placeOrder(gameInstance, player2, 2, 3, 7);
    
    // Distributor -> Factory
    await placeOrder(gameInstance, player3, 3, 4, 10);
    
    // Display state after orders
    console.log("\nState after placing orders:");
    await displayGameState(gameInstance, lastGameId);
    
    // Advance to next week
    await gameInstance.advanceWeek();
    console.log(`\nAdvanced to week ${await gameInstance.currentWeek()}`);
    
    // Display state after advancement
    await displayGameState(gameInstance, lastGameId);
  }

  console.log("\nGameplay test completed!");
}

async function placeOrder(gameInstance, player, senderRole, recipientRole, quantity) {
  const tx = await gameInstance.connect(player).placeOrder(senderRole, recipientRole, quantity);
  const receipt = await tx.wait();
  const event = receipt.events.find(e => e.event === "OrderPlaced");
  console.log(`Order placed: ${senderRole} -> ${recipientRole}, quantity: ${quantity}, Order ID: ${event.args.orderId}`);
  return event.args.orderId;
}

async function displayGameState(gameInstance, gameId) {
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
    console.error(error);
    process.exit(1);
  }); 