const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GameInstance Contract", function () {
  let playerRegistry;
  let gameFactory;
  let gameInstance;
  let gameInstanceAddress;
  let owner;
  let retailer;
  let wholesaler;
  let distributor;
  let factory;
  
  // Role enum from contract
  const Role = {
    None: 0,
    Retailer: 1,
    Wholesaler: 2,
    Distributor: 3,
    Factory: 4
  };
  
  // Game parameters
  const gameId = "game1";
  const orderDelay = 2;
  const shippingDelay = 2;
  const demandPattern = 0; // Constant
  const initialInventory = 12;
  
  beforeEach(async function () {
    // Get test accounts
    [owner, retailer, wholesaler, distributor, factory] = await ethers.getSigners();
    
    // Deploy PlayerRegistry
    const PlayerRegistry = await ethers.getContractFactory("PlayerRegistry");
    playerRegistry = await PlayerRegistry.deploy();
    await playerRegistry.deployed();
    
    // Register players
    await playerRegistry.connect(retailer).registerPlayer("Retailer");
    await playerRegistry.connect(wholesaler).registerPlayer("Wholesaler");
    await playerRegistry.connect(distributor).registerPlayer("Distributor");
    await playerRegistry.connect(factory).registerPlayer("Factory");
    
    // Deploy GameFactory
    const GameFactory = await ethers.getContractFactory("GameFactory");
    gameFactory = await GameFactory.deploy(playerRegistry.address);
    await gameFactory.deployed();
    
    // Create a game
    await gameFactory.createGame(
      gameId,
      orderDelay,
      shippingDelay,
      demandPattern,
      initialInventory
    );
    
    // Get game instance address
    gameInstanceAddress = await gameFactory.getGameAddress(gameId);
    
    // Get GameInstance contract
    const GameInstance = await ethers.getContractFactory("GameInstance");
    gameInstance = await GameInstance.attach(gameInstanceAddress);
    
    // Assign roles
    await playerRegistry.assignRole(gameId, retailer.address, Role.Retailer);
    await playerRegistry.assignRole(gameId, wholesaler.address, Role.Wholesaler);
    await playerRegistry.assignRole(gameId, distributor.address, Role.Distributor);
    await playerRegistry.assignRole(gameId, factory.address, Role.Factory);
  });
  
  describe("Game Initialization", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await gameInstance.gameId()).to.equal(gameId);
      expect(await gameInstance.creator()).to.equal(owner.address);
      expect(await gameInstance.orderDelay()).to.equal(orderDelay);
      expect(await gameInstance.shippingDelay()).to.equal(shippingDelay);
      expect(await gameInstance.demandPattern()).to.equal(demandPattern);
      expect(await gameInstance.initialInventory()).to.equal(initialInventory);
      expect(await gameInstance.currentWeek()).to.equal(0);
      expect(await gameInstance.gameStarted()).to.be.false;
      expect(await gameInstance.gameEnded()).to.be.false;
    });
    
    it("Should initialize player states correctly", async function () {
      const retailerState = await gameInstance.getPlayerState(Role.Retailer);
      expect(retailerState.inventory).to.equal(initialInventory);
      expect(retailerState.backlog).to.equal(0);
      
      const wholesalerState = await gameInstance.getPlayerState(Role.Wholesaler);
      expect(wholesalerState.inventory).to.equal(initialInventory);
      expect(wholesalerState.backlog).to.equal(0);
      
      const distributorState = await gameInstance.getPlayerState(Role.Distributor);
      expect(distributorState.inventory).to.equal(initialInventory);
      expect(distributorState.backlog).to.equal(0);
      
      const factoryState = await gameInstance.getPlayerState(Role.Factory);
      expect(factoryState.inventory).to.equal(initialInventory);
      expect(factoryState.backlog).to.equal(0);
    });
    
    it("Should initialize customer demand based on pattern", async function () {
      // For constant pattern (0), week 0 demand should be 4
      const demand = await gameInstance.getCurrentCustomerDemand();
      expect(demand).to.equal(4);
    });
  });
  
  describe("Game Flow", function () {
    beforeEach(async function () {
      // Start the game
      await gameInstance.startGame();
    });
    
    it("Should start the game", async function () {
      expect(await gameInstance.gameStarted()).to.be.true;
      expect(await gameInstance.gameEnded()).to.be.false;
      
      // All players should be active
      const retailerState = await gameInstance.playerStates(Role.Retailer);
      expect(retailerState.active).to.be.true;
    });
    
    it("Should not allow non-creator to start the game", async function () {
      // Reset game instance for this test
      await gameFactory.createGame(
        "game2",
        orderDelay,
        shippingDelay,
        demandPattern,
        initialInventory
      );
      
      const game2Address = await gameFactory.getGameAddress("game2");
      const game2Instance = await ethers.getContractFactory("GameInstance").then(f => f.attach(game2Address));
      
      // Assign roles for game2
      await playerRegistry.assignRole("game2", retailer.address, Role.Retailer);
      await playerRegistry.assignRole("game2", wholesaler.address, Role.Wholesaler);
      await playerRegistry.assignRole("game2", distributor.address, Role.Distributor);
      await playerRegistry.assignRole("game2", factory.address, Role.Factory);
      
      // Try to start as non-creator
      await expect(
        game2Instance.connect(retailer).startGame()
      ).to.be.revertedWith("Only creator can start game");
    });
    
    it("Should allow placing orders", async function () {
      // Retailer places order to Wholesaler
      const tx = await gameInstance.connect(retailer).placeOrder(
        Role.Retailer,
        Role.Wholesaler,
        5 // quantity
      );
      
      // Check event emitted
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'OrderPlaced');
      expect(event).to.not.be.undefined;
      expect(event.args.sender).to.equal(Role.Retailer);
      expect(event.args.recipient).to.equal(Role.Wholesaler);
      expect(event.args.quantity).to.equal(5);
      
      // Check order was added to weekly orders
      const orderIds = await gameInstance.getWeeklyOrderIds(0);
      expect(orderIds.length).to.equal(1);
      
      // Check order details
      const orderDetails = await gameInstance.getOrderDetails(orderIds[0]);
      expect(orderDetails.sender).to.equal(Role.Retailer);
      expect(orderDetails.quantity).to.equal(5);
      
      // Check player state updated
      const retailerState = await gameInstance.getPlayerState(Role.Retailer);
      expect(retailerState.outgoingOrders).to.equal(5);
    });
    
    it("Should not allow invalid order flow", async function () {
      // Try to place order from Wholesaler to Retailer (wrong direction)
      await expect(
        gameInstance.connect(wholesaler).placeOrder(
          Role.Wholesaler,
          Role.Retailer,
          5
        )
      ).to.be.revertedWith("Invalid order flow");
    });
    
    it("Should process customer orders", async function () {
      // Process customer order (demand is 4 in week 0)
      await gameInstance.processCustomerOrder(0);
      
      // Check retailer inventory decreased
      const retailerState = await gameInstance.getPlayerState(Role.Retailer);
      expect(retailerState.inventory).to.equal(initialInventory - 4);
      expect(retailerState.incomingOrders).to.equal(4);
    });
    
    it("Should advance the week", async function () {
      // Place orders
      await gameInstance.connect(retailer).placeOrder(Role.Retailer, Role.Wholesaler, 5);
      await gameInstance.connect(wholesaler).placeOrder(Role.Wholesaler, Role.Distributor, 6);
      await gameInstance.connect(distributor).placeOrder(Role.Distributor, Role.Factory, 7);
      
      // Process customer demand
      await gameInstance.processCustomerOrder(0);
      
      // Advance week
      await gameInstance.advanceWeek();
      
      // Week should be incremented
      expect(await gameInstance.currentWeek()).to.equal(1);
      
      // Get updated player states (costs should have increased)
      const retailerState = await gameInstance.getPlayerState(Role.Retailer);
      expect(retailerState.totalCost).to.be.gt(0);
    });
    
    it("Should end the game", async function () {
      await gameInstance.endGame();
      
      expect(await gameInstance.gameEnded()).to.be.true;
      
      // Should not allow further actions
      await expect(
        gameInstance.advanceWeek()
      ).to.be.revertedWith("Game not active");
    });
  });
  
  describe("Full Game Simulation", function () {
    it("Should simulate a full game flow", async function () {
      // Start the game
      await gameInstance.startGame();
      
      // Simulate 3 weeks of play
      for (let week = 0; week < 3; week++) {
        // Current week is 'week'
        expect(await gameInstance.currentWeek()).to.equal(week);
        
        // Get customer demand for this week
        const customerDemand = await gameInstance.getCurrentCustomerDemand();
        
        // Process customer order
        await gameInstance.processCustomerOrder(week);
        
        // Players place orders
        await gameInstance.connect(retailer).placeOrder(Role.Retailer, Role.Wholesaler, 5);
        await gameInstance.connect(wholesaler).placeOrder(Role.Wholesaler, Role.Distributor, 6);
        await gameInstance.connect(distributor).placeOrder(Role.Distributor, Role.Factory, 7);
        
        // Advance week
        await gameInstance.advanceWeek();
      }
      
      // Check final week
      expect(await gameInstance.currentWeek()).to.equal(3);
      
      // Check costs were incurred
      const retailerState = await gameInstance.getPlayerState(Role.Retailer);
      const wholesalerState = await gameInstance.getPlayerState(Role.Wholesaler);
      const distributorState = await gameInstance.getPlayerState(Role.Distributor);
      const factoryState = await gameInstance.getPlayerState(Role.Factory);
      
      expect(retailerState.totalCost).to.be.gt(0);
      expect(wholesalerState.totalCost).to.be.gt(0);
      expect(distributorState.totalCost).to.be.gt(0);
      expect(factoryState.totalCost).to.be.gt(0);
      
      // End the game
      await gameInstance.endGame();
      expect(await gameInstance.gameEnded()).to.be.true;
    });
  });
}); 