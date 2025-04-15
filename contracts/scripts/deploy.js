// Deployment script for Beer Distribution Game contracts
const hre = require("hardhat");

async function main() {
  console.log("Starting deployment process...");
  
  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);
  
  // Deploy PlayerRegistry first
  console.log("Deploying PlayerRegistry...");
  const PlayerRegistry = await hre.ethers.getContractFactory("PlayerRegistry");
  const playerRegistry = await PlayerRegistry.deploy();
  await playerRegistry.deployed();
  console.log(`PlayerRegistry deployed to: ${playerRegistry.address}`);
  
  // Deploy GameFactory with reference to PlayerRegistry
  console.log("Deploying GameFactory...");
  const GameFactory = await hre.ethers.getContractFactory("GameFactory");
  const gameFactory = await GameFactory.deploy(playerRegistry.address);
  await gameFactory.deployed();
  console.log(`GameFactory deployed to: ${gameFactory.address}`);
  
  // GameInstance is not deployed directly, it's created by GameFactory
  console.log("GameInstance will be created by GameFactory when a new game is created");
  
  // Output deployment information
  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log(`PlayerRegistry: ${playerRegistry.address}`);
  console.log(`GameFactory: ${gameFactory.address}`);
  
  // Verify contracts on Etherscan if not on a local network
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\nWaiting for block confirmation before verifying...");
    await playerRegistry.deployTransaction.wait(5);
    await gameFactory.deployTransaction.wait(5);
    
    console.log("\nVerifying contracts on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: playerRegistry.address,
        constructorArguments: [],
      });
      
      await hre.run("verify:verify", {
        address: gameFactory.address,
        constructorArguments: [playerRegistry.address],
      });
      
      console.log("Contracts verified on Etherscan");
    } catch (error) {
      console.error("Error verifying contracts:", error);
    }
  }
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 