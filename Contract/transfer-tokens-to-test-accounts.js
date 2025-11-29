const hre = require("hardhat");
require('dotenv').config();

/**
 * Helper script to transfer tokens to test accounts
 * This is useful when you want to test with accounts other than the deployer
 */
async function main() {
  console.log("\n🔄 Transferring tokens to test accounts...\n");

  // Get token address from deployment or env
  const deploymentsDir = './deployments';
  let tokenAddress;
  
  try {
    // Try crypto-mlm deployment first
    const deploymentFile = `${deploymentsDir}/localhost-crypto-mlm.json`;
    const deploymentInfo = JSON.parse(require('fs').readFileSync(deploymentFile, 'utf8'));
    tokenAddress = deploymentInfo.tokenAddress;
    console.log("📋 Found token address from crypto-mlm deployment:", tokenAddress);
  } catch (e) {
    try {
      // Fallback to other deployment file
      const deploymentFile = `${deploymentsDir}/localhost-latest.json`;
      const deploymentInfo = JSON.parse(require('fs').readFileSync(deploymentFile, 'utf8'));
      tokenAddress = deploymentInfo.tokenAddress;
      console.log("📋 Found token address from deployment:", tokenAddress);
    } catch (e2) {
      tokenAddress = process.env.TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
      if (!tokenAddress) {
        throw new Error("❌ Token address not found. Please deploy contracts first or set TOKEN_ADDRESS in .env");
      }
      console.log("📋 Using token address from .env:", tokenAddress);
    }
  }

  // Get all test accounts
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[0];
  
  console.log("Deployer account:", deployer.address);
  console.log("Total test accounts:", accounts.length, "\n");

  // Connect to token contract
  const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
  const token = ERC20Mock.attach(tokenAddress);

  // Get deployer balance
  const deployerBalance = await token.balanceOf(deployer.address);
  const tokenDecimals = await token.decimals();
  console.log(`💰 Deployer balance: ${hre.ethers.formatUnits(deployerBalance, tokenDecimals)} tokens\n`);

  // Amount to transfer to each test account (500 tokens - enough for testing)
  const transferAmount = hre.ethers.parseUnits("500", tokenDecimals);
  
  // Minimum balance needed (enough for registration + retopup)
  const minBalance = hre.ethers.parseUnits("100", tokenDecimals);

  // Transfer tokens to first 5 test accounts (accounts 1-5, skipping deployer)
  console.log("📤 Transferring tokens to test accounts...\n");
  const accountsToFund = Math.min(5, accounts.length - 1);
  
  for (let i = 1; i <= accountsToFund; i++) {
    const account = accounts[i];
    const currentBalance = await token.balanceOf(account.address);
    
    if (currentBalance < minBalance) {
      try {
        console.log(`💰 Transferring 500 tokens to account #${i} (${account.address})...`);
        const tx = await token.transfer(account.address, transferAmount);
        await tx.wait();
        const newBalance = await token.balanceOf(account.address);
        console.log(`✅ Account #${i} now has ${hre.ethers.formatUnits(newBalance, tokenDecimals)} tokens\n`);
      } catch (error) {
        console.error(`❌ Failed to transfer to account #${i}:`, error.message);
      }
    } else {
      const balanceFormatted = hre.ethers.formatUnits(currentBalance, tokenDecimals);
      console.log(`⏭️  Account #${i} already has sufficient balance: ${balanceFormatted} tokens\n`);
    }
  }

  console.log("\n✅ Token distribution complete!\n");
  
  // Show final balances
  console.log("📊 Final balances:");
  for (let i = 0; i < Math.min(accounts.length, 5); i++) {
    const balance = await token.balanceOf(accounts[i].address);
    console.log(`Account #${i} (${accounts[i].address}): ${hre.ethers.formatUnits(balance, tokenDecimals)} tokens`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Token transfer failed:");
    console.error(error);
    process.exit(1);
  });

