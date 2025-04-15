const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  // Get the network
  const network = await ethers.provider.getNetwork();
  console.log(`Deploying to ${network.name} (chainId: ${network.chainId})`);

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);

  const balance = await deployer.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance)} ETH`);

  // Deploy PlayerRegistry
  console.log("Deploying PlayerRegistry...");
  const PlayerRegistry = await ethers.getContractFactory("PlayerRegistry");
  const playerRegistry = await PlayerRegistry.deploy();
  await playerRegistry.deployed();
  console.log(`PlayerRegistry deployed to: ${playerRegistry.address}`);

  // Deploy GameFactory
  console.log("Deploying GameFactory...");
  const GameFactory = await ethers.getContractFactory("GameFactory");
  const gameFactory = await GameFactory.deploy(playerRegistry.address);
  await gameFactory.deployed();
  console.log(`GameFactory deployed to: ${gameFactory.address}`);
  
  console.log("GameInstance will be created by GameFactory when a new game is created");

  // Save deployment information to a file
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    playerRegistry: playerRegistry.address,
    gameFactory: gameFactory.address,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  const deploymentPath = `deployment-${network.name}.json`;
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment information saved to ${deploymentPath}`);

  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log(`PlayerRegistry: ${playerRegistry.address}`);
  console.log(`GameFactory: ${gameFactory.address}`);
  
  // Wait a bit for the blockchain to process transactions
  console.log("\nWaiting for 5 block confirmations for contract verification...");
  await playerRegistry.deployTransaction.wait(5);
  await gameFactory.deployTransaction.wait(5);
  
  // Verification instructions
  console.log("\nTo verify contracts on Etherscan:");
  console.log("----------------------------------");
  console.log(`npx hardhat verify --network ${network.name} ${playerRegistry.address}`);
  console.log(`npx hardhat verify --network ${network.name} ${gameFactory.address} ${playerRegistry.address}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 