const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GameFactory Contract", function () {
  let playerRegistry;
  let gameFactory;
  let owner;
  let player1;
  let player2;
  
  beforeEach(async function () {
    // Get test accounts
    [owner, player1, player2] = await ethers.getSigners();
    
    // Deploy PlayerRegistry
    const PlayerRegistry = await ethers.getContractFactory("PlayerRegistry");
    playerRegistry = await PlayerRegistry.deploy();
    await playerRegistry.deployed();
    
    // Deploy GameFactory
    const GameFactory = await ethers.getContractFactory("GameFactory");
    gameFactory = await GameFactory.deploy(playerRegistry.address);
    await gameFactory.deployed();
  });
  
  describe("Initialization", function () {
    it("Should initialize with correct player registry address", async function () {
      expect(await gameFactory.playerRegistry()).to.equal(playerRegistry.address);
    });
    
    it("Should start with 0 games", async function () {
      expect(await gameFactory.getGameCount()).to.equal(0);
    });
  });
  
  describe("Game Creation", function () {
    it("Should create a new game instance", async function () {
      // Create a game
      const tx = await gameFactory.createGame(
        "game1",
        2, // orderDelay
        2, // shippingDelay
        0, // demandPattern (constant)
        12 // initialInventory
      );
      
      // Wait for transaction
      const receipt = await tx.wait();
      
      // Find the GameCreated event
      const event = receipt.events.find(e => e.event === 'GameCreated');
      expect(event).to.not.be.undefined;
      
      // Check game count increased
      expect(await gameFactory.getGameCount()).to.equal(1);
      
      // Check game can be retrieved
      const gameAddress = await gameFactory.getGameAddress("game1");
      expect(gameAddress).to.not.equal(ethers.constants.AddressZero);
    });
    
    it("Should not allow duplicate game IDs", async function () {
      // Create first game
      await gameFactory.createGame("game1", 2, 2, 0, 12);
      
      // Try to create another game with same ID
      await expect(
        gameFactory.createGame("game1", 2, 2, 0, 12)
      ).to.be.revertedWith("Game ID already exists");
    });
  });
  
  describe("Game Status Management", function () {
    beforeEach(async function () {
      // Create a game
      await gameFactory.createGame("game1", 2, 2, 0, 12);
    });
    
    it("Should allow setting game status", async function () {
      // Get game info
      const gameInfo = await gameFactory.games("game1");
      expect(gameInfo.active).to.be.true;
      
      // Set inactive
      await gameFactory.setGameStatus("game1", false);
      
      // Check updated status
      const updatedGameInfo = await gameFactory.games("game1");
      expect(updatedGameInfo.active).to.be.false;
    });
    
    it("Should not allow non-creators to set game status", async function () {
      // Try to set status as non-creator
      await expect(
        gameFactory.connect(player1).setGameStatus("game1", false)
      ).to.be.revertedWith("Only creator or game contract can update status");
    });
    
    it("Should return active games correctly", async function () {
      // Create another game
      await gameFactory.createGame("game2", 2, 2, 0, 12);
      
      // Set game1 inactive
      await gameFactory.setGameStatus("game1", false);
      
      // Get active games
      const activeGames = await gameFactory.getActiveGames(0, 10);
      
      // Should only include game2
      expect(activeGames.length).to.equal(1);
      expect(activeGames[0]).to.equal("game2");
    });
  });
}); 