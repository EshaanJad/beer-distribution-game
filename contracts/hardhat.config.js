require('dotenv').config();
require('@nomiclabs/hardhat-ethers');

// Load environment variables
const SEPOLIA_URL = process.env.SEPOLIA_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Define networks config
const networks = {
  hardhat: {},
  localhost: {
    url: "http://127.0.0.1:8545"
  }
};

// Only add Sepolia if the environment variables are properly set
if (SEPOLIA_URL && PRIVATE_KEY && PRIVATE_KEY.length === 64) {
  networks.sepolia = {
    url: SEPOLIA_URL,
    accounts: [PRIVATE_KEY]
  };
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000
      }
    }
  },
  networks,
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
}; 