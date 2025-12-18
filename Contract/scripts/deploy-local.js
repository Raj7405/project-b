const hre = require("hardhat");
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("\n🚀 Deploying CryptoMLMTransactions to Local Hardhat Network...\n");
  
  // Get signers (Hardhat node provides 20 accounts with 10000 ETH each)
  const signers = await hre.ethers.getSigners();
  if (!signers || signers.length === 0) {
    console.error("❌ Error: No signers available!");
    console.error("   Make sure Hardhat node is running: npx hardhat node");
    process.exit(1);
  }
  
  const deployer = signers[0];
  const companyWallet = signers[1];
  const backendWallet = signers[2];
  
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Deployer balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("🏢 Company Wallet:", companyWallet.address);
  console.log("🔧 Backend Wallet:", backendWallet.address);
  
  // Step 1: Deploy Mock Token
  console.log("\n📝 Step 1: Deploying Mock BEP-20 Token...");
  const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
  const token = await ERC20Mock.deploy(
    "Test WBNB",
    "TWBNB",
    deployer.address,
    hre.ethers.parseUnits("1000000", 18)
  );
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ Mock Token deployed to:", tokenAddress);
  
  // Step 2: Deploy CryptoMLMTransactions
  console.log("\n📝 Step 2: Deploying CryptoMLMTransactions Contract...");
  const CryptoMLMTransactions = await hre.ethers.getContractFactory("CryptoMLMTransactions");
  const contract = await CryptoMLMTransactions.deploy(
    tokenAddress,
    companyWallet.address,
    backendWallet.address
  );
  
  console.log("   ⏳ Waiting for transaction confirmation...");
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log("✅ CryptoMLMTransactions deployed to:", contractAddress);
  
  // Get contract configuration
  const entryPrice = await contract.entryPrice();
  const retopupPrice = await contract.retopupPrice();
  
  console.log("\n📋 Contract Configuration:");
  console.log("   Entry Price:", hre.ethers.formatEther(entryPrice), "tokens");
  console.log("   Retopup Price:", hre.ethers.formatEther(retopupPrice), "tokens");
  
  // Step 3: Save deployment info
  console.log("\n📝 Step 3: Saving deployment information...");
  
  const deploymentInfo = {
    network: "localhost",
    chainId: "1337",
    contractAddress: contractAddress,
    tokenAddress: tokenAddress,
    isMockToken: true,
    deployer: deployer.address,
    companyWallet: companyWallet.address,
    backendWallet: backendWallet.address,
    entryPrice: entryPrice.toString(),
    retopupPrice: retopupPrice.toString(),
    timestamp: new Date().toISOString()
  };
  
  const deploymentsDir = './deployments';
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  const deploymentFile = `${deploymentsDir}/localhost-${Date.now()}.json`;
  const latestFile = `${deploymentsDir}/localhost-latest.json`;
  
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("✅ Deployment info saved to:", deploymentFile);
  console.log("✅ Latest deployment saved to:", latestFile);
  
  // Step 4: Display results
  console.log("\n" + "=".repeat(80));
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(80));
  
  console.log("\n📋 Contract Addresses:");
  console.log("   CryptoMLMTransactions:", contractAddress);
  console.log("   Token Address:", tokenAddress, "(Mock Token)");
  console.log("   Company Wallet:", companyWallet.address);
  console.log("   Backend Wallet:", backendWallet.address);
  
  console.log("\n" + "=".repeat(80));
  console.log("📋 BACKEND CONFIGURATION (backend-express/.env)");
  console.log("=".repeat(80));
  console.log("\n# Local Hardhat Network Configuration");
  console.log("BSC_RPC_URL=http://127.0.0.1:8545");
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`BACKEND_PRIVATE_KEY=<private_key_of_account_2>`);
  console.log(`COMPANY_WALLET_ADDRESS=${companyWallet.address}\n`);
  
  console.log("# Available Test Accounts (from Hardhat node):");
  console.log("# Account 0 (Deployer):", deployer.address);
  console.log("# Account 1 (Company):", companyWallet.address);
  console.log("# Account 2 (Backend):", backendWallet.address);
  console.log("# Account 3-19: Available for testing\n");
  
  console.log("=".repeat(80));
  console.log("📋 FRONTEND CONFIGURATION (Frontend/.env.local)");
  console.log("=".repeat(80));
  console.log("\n# Contract Addresses");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`NEXT_PUBLIC_TOKEN_ADDRESS=${tokenAddress}\n`);
  
  console.log("# Network Configuration");
  console.log("NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545");
  console.log("NEXT_PUBLIC_CHAIN_ID=1337");
  console.log("NEXT_PUBLIC_NETWORK_NAME=Hardhat Local\n");
  
  console.log("=".repeat(80));
  console.log("📝 NEXT STEPS");
  console.log("=".repeat(80));
  console.log("\n1. ✅ Copy backend configuration to backend-express/.env");
  console.log("2. ✅ Copy frontend configuration to Frontend/.env.local");
  console.log("3. 🔄 Restart backend server");
  console.log("4. 🔄 Restart frontend server");
  console.log("5. 🧪 Test registration - all gas fees are FREE!\n");
  
  console.log("💡 TIP: Hardhat node provides unlimited free ETH for testing!");
  console.log("   No need to fund wallets or pay gas fees.\n");
  
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

