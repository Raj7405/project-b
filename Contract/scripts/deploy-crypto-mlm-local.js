const hre = require("hardhat");
require('dotenv').config();
const fs = require('fs');

async function main() {
  console.log("\n🚀 Deploying CryptoMLMTransactions Contract (Backend-Controlled)...\n");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "BNB\n");

  // Step 1: Get or deploy token
  let tokenAddress = process.env.TOKEN_ADDRESS;
  
  if (!tokenAddress || tokenAddress === "0xYOUR_TOKEN_ADDRESS") {
    console.log("📝 Deploying Mock Token...");
    const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
    const token = await ERC20Mock.deploy("Test WBNB", "TWBNB", deployer.address, hre.ethers.parseUnits("1000000", 18));
    await token.waitForDeployment();
    tokenAddress = await token.getAddress();
    console.log("✅ Token deployed to:", tokenAddress);
  } else {
    console.log("📝 Using existing token:", tokenAddress);
  }

  // Step 2: Get wallet addresses
  const companyWallet = process.env.COMPANY_WALLET || deployer.address;
  const backendWallet = process.env.BACKEND_WALLET || deployer.address;
  
  console.log("\n📝 Wallets:");
  console.log("   Company:", companyWallet);
  console.log("   Backend:", backendWallet);

  // Step 3: Deploy CryptoMLMTransactions
  console.log("\n📝 Deploying CryptoMLMTransactions...");
  const CryptoMLMTransactions = await hre.ethers.getContractFactory("CryptoMLMTransactions");
  const contract = await CryptoMLMTransactions.deploy(tokenAddress, companyWallet, backendWallet);
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log("✅ CryptoMLMTransactions deployed to:", contractAddress);

  // Verify deployment
  const entryPrice = await contract.entryPrice();
  const retopupPrice = await contract.retopupPrice();
  console.log("\n📋 Configuration:");
  console.log("   Entry Price:", hre.ethers.formatEther(entryPrice), "BNB");
  console.log("   Retopup Price:", hre.ethers.formatEther(retopupPrice), "BNB");

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress,
    tokenAddress,
    companyWallet,
    backendWallet,
    entryPrice: entryPrice.toString(),
    retopupPrice: retopupPrice.toString(),
    timestamp: new Date().toISOString()
  };
  
  const deploymentsDir = './deployments';
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  fs.writeFileSync(
    `${deploymentsDir}/${hre.network.name}-crypto-mlm.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n" + "=".repeat(80));
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(80));
  console.log("\n📋 Update your backend .env file:\n");
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`BACKEND_PRIVATE_KEY=<private_key_of_backend_wallet>`);
  console.log(`COMPANY_WALLET_ADDRESS=${companyWallet}`);
  console.log("\n" + "=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
