const hre = require("hardhat");
require('dotenv').config();
const fs = require('fs');

/**
 * Helper script to approve tokens for a user account
 * This simulates what the frontend should do before registration
 */
async function main() {
  console.log("\n🔓 Approving tokens for user account...\n");

  // Get deployment info
  let contractAddress, tokenAddress;
  try {
    const deploymentFile = './deployments/localhost-crypto-mlm.json';
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    contractAddress = deploymentInfo.contractAddress;
    tokenAddress = deploymentInfo.tokenAddress;
    console.log("📋 Using addresses from deployment:");
    console.log("   Contract:", contractAddress);
    console.log("   Token:", tokenAddress);
  } catch (e) {
    console.error("❌ Could not read deployment file. Make sure contracts are deployed.");
    process.exit(1);
  }

  // Get accounts
  const accounts = await hre.ethers.getSigners();
  
  // Use account #1 as the user (or specify which account to use via ACCOUNT_INDEX env var)
  const userAccountIndex = process.env.ACCOUNT_INDEX ? parseInt(process.env.ACCOUNT_INDEX) : 1;
  const userAccount = accounts[userAccountIndex];
  
  if (!userAccount) {
    console.error(`❌ Account #${userAccountIndex} not found`);
    process.exit(1);
  }

  console.log(`\n👤 User Account #${userAccountIndex}:`, userAccount.address);

  // Connect to token contract
  const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
  const token = ERC20Mock.attach(tokenAddress);

  // Get current balance and allowance
  const balance = await token.balanceOf(userAccount.address);
  const currentAllowance = await token.allowance(userAccount.address, contractAddress);
  const decimals = await token.decimals();
  const symbol = await token.symbol();

  console.log(`\n💰 Current Status:`);
  console.log(`   Balance: ${hre.ethers.formatUnits(balance, decimals)} ${symbol}`);
  console.log(`   Current Allowance: ${hre.ethers.formatUnits(currentAllowance, decimals)} ${symbol}`);

  // Get entry price from contract
  const CryptoMLMTransactions = await hre.ethers.getContractFactory("CryptoMLMTransactions");
  const contract = CryptoMLMTransactions.attach(contractAddress);
  const entryPrice = await contract.entryPrice();
  
  console.log(`   Entry Price: ${hre.ethers.formatUnits(entryPrice, decimals)} ${symbol}`);

  // Check if balance is sufficient
  if (balance < entryPrice) {
    console.error(`\n❌ Insufficient balance! Need ${hre.ethers.formatUnits(entryPrice, decimals)} ${symbol}`);
    console.error(`   Current balance: ${hre.ethers.formatUnits(balance, decimals)} ${symbol}`);
    process.exit(1);
  }

  // Check if already approved enough
  if (currentAllowance >= entryPrice) {
    console.log(`\n✅ Already approved! Allowance (${hre.ethers.formatUnits(currentAllowance, decimals)} ${symbol}) is sufficient.`);
    return;
  }

  // Approve tokens (approve a large amount for convenience - 500 tokens)
  const approveAmount = hre.ethers.parseUnits("500", decimals);
  
  console.log(`\n📝 Approving ${hre.ethers.formatUnits(approveAmount, decimals)} ${symbol} for contract...`);
  
  try {
    const tx = await token.connect(userAccount).approve(contractAddress, approveAmount);
    console.log(`⏳ Transaction hash: ${tx.hash}`);
    console.log(`   Waiting for confirmation...`);
    
    const receipt = await tx.wait();
    console.log(`✅ Approval successful! Block: ${receipt.blockNumber}`);
    
    // Verify approval
    const newAllowance = await token.allowance(userAccount.address, contractAddress);
    console.log(`\n✅ New Allowance: ${hre.ethers.formatUnits(newAllowance, decimals)} ${symbol}`);
    
    console.log(`\n🎉 Token approval complete!`);
    console.log(`\n💡 Now you can register this user via the backend API:`);
    console.log(`   POST /api/auth/register-user`);
    console.log(`   Body: { "walletAddress": "${userAccount.address}", "uplineId": "..." }`);
    
  } catch (error) {
    console.error(`\n❌ Approval failed:`, error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

