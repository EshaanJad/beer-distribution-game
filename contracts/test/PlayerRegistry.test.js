const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PlayerRegistry Contract", function () {
  let playerRegistry;
  let owner;
  let player1;
  let player2;
  
  // Role enum from contract
  const Role = {
    None: 0,
    Retailer: 1,
    Wholesaler: 2,
    Distributor: 3,
    Factory: 4
  };
  
  beforeEach(async function () {
    // Get test accounts
    [owner, player1, player2] = await ethers.getSigners();
    
    // Deploy PlayerRegistry
    const PlayerRegistry = await ethers.getContractFactory("PlayerRegistry");
    playerRegistry = await PlayerRegistry.deploy();
    await playerRegistry.deployed();
  });
  
  describe("Player Registration", function () {
    it("Should register a new player", async function () {
      await playerRegistry.connect(player1).registerPlayer("Player1");
      
      const playerDetails = await playerRegistry.getPlayerDetails(player1.address);
      expect(playerDetails.username).to.equal("Player1");
      expect(playerDetails.gamesPlayed).to.equal(0);
      expect(playerDetails.registered).to.be.true;
    });
    
    it("Should not allow duplicate registrations", async function () {
      await playerRegistry.connect(player1).registerPlayer("Player1");
      
      await expect(
        playerRegistry.connect(player1).registerPlayer("Player1Again")
      ).to.be.revertedWith("Player already registered");
    });
  });
  
  describe("Role Assignment", function () {
    const gameId = "game1";
    
    beforeEach(async function () {
      // Register players
      await playerRegistry.connect(player1).registerPlayer("Player1");
      await playerRegistry.connect(player2).registerPlayer("Player2");
    });
    
    it("Should assign a role to a player", async function () {
      await playerRegistry.assignRole(gameId, player1.address, Role.Retailer);
      
      const role = await playerRegistry.getPlayerRole(gameId, player1.address);
      expect(role).to.equal(Role.Retailer);
      
      const playerByRole = await playerRegistry.getPlayerByRole(gameId, Role.Retailer);
      expect(playerByRole).to.equal(player1.address);
    });
    
    it("Should increment games played counter", async function () {
      await playerRegistry.assignRole(gameId, player1.address, Role.Retailer);
      
      const playerDetails = await playerRegistry.getPlayerDetails(player1.address);
      expect(playerDetails.gamesPlayed).to.equal(1);
    });
    
    it("Should not allow assigning a role to an unregistered player", async function () {
      const unregisteredPlayer = owner; // Owner hasn't registered as a player
      
      await expect(
        playerRegistry.assignRole(gameId, unregisteredPlayer.address, Role.Retailer)
      ).to.be.revertedWith("Player not registered");
    });
    
    it("Should not allow assigning Role.None", async function () {
      await expect(
        playerRegistry.assignRole(gameId, player1.address, Role.None)
      ).to.be.revertedWith("Invalid role");
    });
    
    it("Should not allow assigning a role that's already taken", async function () {
      await playerRegistry.assignRole(gameId, player1.address, Role.Retailer);
      
      await expect(
        playerRegistry.assignRole(gameId, player2.address, Role.Retailer)
      ).to.be.revertedWith("Role already assigned");
    });
    
    it("Should not allow a player to have multiple roles", async function () {
      await playerRegistry.assignRole(gameId, player1.address, Role.Retailer);
      
      await expect(
        playerRegistry.assignRole(gameId, player1.address, Role.Wholesaler)
      ).to.be.revertedWith("Player already has a role");
    });
  });
  
  describe("Role Revocation", function () {
    const gameId = "game1";
    
    beforeEach(async function () {
      // Register players and assign roles
      await playerRegistry.connect(player1).registerPlayer("Player1");
      await playerRegistry.assignRole(gameId, player1.address, Role.Retailer);
    });
    
    it("Should revoke a player's role", async function () {
      await playerRegistry.revokeRole(gameId, player1.address);
      
      const role = await playerRegistry.getPlayerRole(gameId, player1.address);
      expect(role).to.equal(Role.None);
      
      const playerByRole = await playerRegistry.getPlayerByRole(gameId, Role.Retailer);
      expect(playerByRole).to.equal(ethers.constants.AddressZero);
    });
    
    it("Should not allow revoking a role from a player without one", async function () {
      // Register player2 but don't assign a role
      await playerRegistry.connect(player2).registerPlayer("Player2");
      
      await expect(
        playerRegistry.revokeRole(gameId, player2.address)
      ).to.be.revertedWith("Player has no role");
    });
  });
  
  describe("Role Verification", function () {
    const gameId = "game1";
    
    beforeEach(async function () {
      // Register players and assign roles
      await playerRegistry.connect(player1).registerPlayer("Player1");
      await playerRegistry.connect(player2).registerPlayer("Player2");
      await playerRegistry.assignRole(gameId, player1.address, Role.Retailer);
      await playerRegistry.assignRole(gameId, player2.address, Role.Wholesaler);
    });
    
    it("Should correctly identify if all roles are assigned", async function () {
      // Only 2 of 4 roles are assigned so far
      expect(await playerRegistry.allRolesAssigned(gameId)).to.be.false;
      
      // Register more players and assign remaining roles
      const [, , player3, player4] = await ethers.getSigners();
      await playerRegistry.connect(player3).registerPlayer("Player3");
      await playerRegistry.connect(player4).registerPlayer("Player4");
      await playerRegistry.assignRole(gameId, player3.address, Role.Distributor);
      await playerRegistry.assignRole(gameId, player4.address, Role.Factory);
      
      // Now all roles should be assigned
      expect(await playerRegistry.allRolesAssigned(gameId)).to.be.true;
    });
  });
}); 