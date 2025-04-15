const { ethers } = require('ethers');
const crypto = require('crypto');

/**
 * Generate a random wallet for an AI agent
 * @returns {Object} - Wallet info including address and private key
 */
const generateAgentWallet = () => {
  // Create a new wallet with a random private key
  const wallet = ethers.Wallet.createRandom();
  
  return {
    address: wallet.address,
    privateKey: wallet.privateKey
  };
};

/**
 * Deterministically generate a wallet from a seed
 * @param {string} seed - Seed string to generate wallet from
 * @returns {Object} - Wallet info including address and private key
 */
const generateDeterministicWallet = (seed) => {
  // Create a deterministic private key based on the seed
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  const privateKey = '0x' + hash;
  
  // Create a wallet from the private key
  const wallet = new ethers.Wallet(privateKey);
  
  return {
    address: wallet.address,
    privateKey: privateKey
  };
};

module.exports = {
  generateAgentWallet,
  generateDeterministicWallet
}; 