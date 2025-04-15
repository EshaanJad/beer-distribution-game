const { ethers } = require("hardhat");

async function main() {
  console.log("Starting short delay test (with fixed contracts)...");

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
  
  console.log("Using addresses:");
  console.log("Deployer:", deployer.address);
  console.log("Retailer:", player1.address);
  console.log("Wholesaler:", player2.address);
  console.log("Distributor:", player3.address);
  console.log("Factory:", player4.address);
  
  console.log("\nRegistering players...");
  
  async function registerPlayerIfNeeded(signer, username) {
    try {
      // Check if player is registered using a simpler approach
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
  
  await registerPlayerIfNeeded(player1, "Alice");
  await registerPlayerIfNeeded(player2, "Bob");
  await registerPlayerIfNeeded(player3, "Charlie");
  await registerPlayerIfNeeded(player4, "Dave");

  // Create a game with short delays
  console.log("\nCreating a new game with SHORT DELAYS...");
  const timestamp = Math.floor(Date.now() / 1000);
  const gameId = `QUICK_${timestamp}`;
  const orderDelay = 0;  // 0-week order delay
  const shippingDelay = 1;  // 1-week shipping delay
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
  
  // Display initial state
  console.log("\n===== Initial Game State =====");
  await displayGameState(gameInstance, gameId);
  
  // Simulate gameplay for 8 weeks
  for (let week = 0; week < 8; week++) {
    console.log(`\n===== WEEK ${week} =====`);
    
    // Process customer order (retail demand)
    await gameInstance.processCustomerOrder(await gameInstance.currentWeek());
    console.log("Processed customer order");
    
    // Place orders using safety stock algorithm
    // Retailer -> Wholesaler
    const retailerState = await gameInstance.getPlayerState(1);
    const retailerOrderAmount = calculateOrderAmount(retailerState[0], retailerState[2], 8);
    if (retailerOrderAmount > 0) {
      await placeOrder(gameInstance, player1, 1, 2, retailerOrderAmount);
    } else {
      console.log("Retailer does not need to order (sufficient inventory)");
    }
    
    // Wholesaler -> Distributor
    const wholesalerState = await gameInstance.getPlayerState(2);
    const wholesalerOrderAmount = calculateOrderAmount(wholesalerState[0], wholesalerState[2], 8);
    if (wholesalerOrderAmount > 0) {
      await placeOrder(gameInstance, player2, 2, 3, wholesalerOrderAmount);
    } else {
      console.log("Wholesaler does not need to order (sufficient inventory)");
    }
    
    // Distributor -> Factory
    const distributorState = await gameInstance.getPlayerState(3);
    const distributorOrderAmount = calculateOrderAmount(distributorState[0], distributorState[2], 8);
    if (distributorOrderAmount > 0) {
      await placeOrder(gameInstance, player3, 3, 4, distributorOrderAmount);
    } else {
      console.log("Distributor does not need to order (sufficient inventory)");
    }
    
    // Display state after orders
    console.log("\nState after placing orders:");
    await displayGameState(gameInstance, gameId);
    
    // Advance to next week
    try {
      await gameInstance.advanceWeek();
      console.log(`\nAdvanced to week ${await gameInstance.currentWeek()}`);
      
      // Display state after advancement
      console.log("\nState after advancing to next week:");
      await displayGameState(gameInstance, gameId);
    } catch (error) {
      console.error("Error advancing week:", error.message);
      break;
    }
    
    // Display pipeline information
    console.log("\nOrder and Shipment Pipelines:");
    await displayPipelines(gameInstance);
  }

  console.log("\nShort delay test completed!");
}

// Safety stock ordering algorithm
function calculateOrderAmount(currentInventory, incomingOrders, safetyStock = 8) {
  // Order enough to maintain safety stock plus cover incoming orders
  // But cap the order to avoid overflow errors
  const desiredInventory = Math.min(safetyStock + incomingOrders, 20); // Cap at 20 units (reduced from 30)
  const orderAmount = Math.max(0, desiredInventory - currentInventory);
  return Math.min(orderAmount, 10); // Cap orders at 10 units max (reduced from 20)
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

async function displayPipelines(gameInstance) {
  // Try to get order pipeline information
  try {
    const retailerOrderPipeline = await gameInstance.getIncomingOrdersPipeline(1);
    const wholesalerOrderPipeline = await gameInstance.getIncomingOrdersPipeline(2);
    const distributorOrderPipeline = await gameInstance.getIncomingOrdersPipeline(3);
    const factoryOrderPipeline = await gameInstance.getIncomingOrdersPipeline(4);
    
    console.log("Order Pipelines:");
    console.log("  Retailer Orders:", retailerOrderPipeline.toString());
    console.log("  Wholesaler Orders:", wholesalerOrderPipeline.toString());
    console.log("  Distributor Orders:", distributorOrderPipeline.toString());
    console.log("  Factory Orders:", factoryOrderPipeline.toString());
  } catch (error) {
    console.log("Could not retrieve order pipelines:", error.message);
  }
  
  // Try to get shipment pipeline information
  try {
    const retailerShipmentPipeline = await gameInstance.getIncomingShipmentsPipeline(1);
    const wholesalerShipmentPipeline = await gameInstance.getIncomingShipmentsPipeline(2);
    const distributorShipmentPipeline = await gameInstance.getIncomingShipmentsPipeline(3);
    const factoryShipmentPipeline = await gameInstance.getIncomingShipmentsPipeline(4);
    
    console.log("Shipment Pipelines:");
    console.log("  Retailer Shipments:", retailerShipmentPipeline.toString());
    console.log("  Wholesaler Shipments:", wholesalerShipmentPipeline.toString());
    console.log("  Distributor Shipments:", distributorShipmentPipeline.toString());
    console.log("  Factory Shipments:", factoryShipmentPipeline.toString());
  } catch (error) {
    console.log("Could not retrieve shipment pipelines:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 