const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log("🪙 Token Transfer Tool\n");

  // Get deployment info
  const deploymentPath = path.join(__dirname, 'deployments', 'localhost-latest.json');
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const tokenAddress = deployment.tokenAddress;

  const Token = await hre.ethers.getContractAt("IERC20", tokenAddress);
  const [deployer] = await hre.ethers.getSigners();

  // Get wallet address
  const walletAddress = await question('Enter wallet address (0x...): ');
  
  // Check current balance
  const currentBalance = await Token.balanceOf(walletAddress);
  console.log("\n📊 Current balance:", hre.ethers.formatUnits(currentBalance, 18), "tokens\n");

  // Get amount to transfer
  const amount = await question('Enter amount to transfer: ');
  
  console.log("\n💸 Transferring", amount, "tokens...");
  console.log("From:", deployer.address);
  console.log("To:", walletAddress);

  // Transfer
  const amountInWei = hre.ethers.parseUnits(amount, 18);
  const tx = await Token.connect(deployer).transfer(walletAddress, amountInWei);
  
  console.log("\n⏳ Waiting for confirmation...");
  await tx.wait();
  
  // Check new balance
  const newBalance = await Token.balanceOf(walletAddress);
  
  console.log("\n✅ Transfer successful!");
  console.log("📊 New balance:", hre.ethers.formatUnits(newBalance, 18), "tokens\n");
  
  rl.close();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    rl.close();
    process.exit(1);
  });
