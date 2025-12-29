const hre = require("hardhat");
require('dotenv').config();
const fs = require('fs');
const path = require('path');

/**
 * Deploy PaymentReconciliation Contract to BSC Mainnet
 * 
 * ⚠️  WARNING: This deploys to MAINNET - Real money involved!
 * 
 * This contract uses:
 * - USDT (BEP-20) for fees/payments
 * - BNB (native token) for gas fees
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-payment-reconciliation-mainnet.js --network bscMainnet
 * 
 * Required Environment Variables:
 *   - DEPLOYER_PRIVATE_KEY: Private key of deployer account
 *   - COMPANY_WALLET: Company wallet address
 *   - BACKEND_WALLET: Backend wallet address
 *   - USDT_TOKEN_ADDRESS: USDT token address on BSC Mainnet
 *                        (0x55d398326f99059fF775485246999027B3197955)
 */
async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("⚠️  WARNING: MAINNET DEPLOYMENT");
  console.log("=".repeat(80));
  console.log("You are about to deploy to BSC MAINNET.");
  console.log("This involves REAL MONEY and REAL TOKENS.");
  console.log("Make sure you have:");
  console.log("  1. Tested thoroughly on testnet");
  console.log("  2. Reviewed all contract code");
  console.log("  3. Verified wallet addresses are correct");
  console.log("  4. Have sufficient BNB for gas fees");
  console.log("  5. Confirmed USDT token address is correct");
  console.log("=".repeat(80));
  console.log("\n");
  
  // Check if .env file exists
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error("❌ Error: .env file not found!");
    process.exit(1);
  }
  
  // Validate private key
  let privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey || privateKey === "0xYOUR_PRIVATE_KEY_HERE" || privateKey === "") {
    console.error("❌ Error: DEPLOYER_PRIVATE_KEY not set in .env file!");
    process.exit(1);
  }
  
  if (!privateKey.startsWith("0x")) {
    privateKey = "0x" + privateKey;
  }
  
  if (privateKey.length !== 66 || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    console.error("❌ Error: Invalid private key format!");
    process.exit(1);
  }
  
  // Check network
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 56n) {
    console.error("❌ Error: Not connected to BSC Mainnet (Chain ID: 56)!");
    console.error("   Current Chain ID:", network.chainId.toString());
    console.error("   Expected Chain ID: 56");
    console.error("\n   Please use: npx hardhat run scripts/deploy-payment-reconciliation-mainnet.js --network bscMainnet");
    process.exit(1);
  }
  
  // Get signers
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  console.log("📝 Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceInBNB = hre.ethers.formatEther(balance);
  console.log("💰 Account balance:", balanceInBNB, "BNB");
  
  if (parseFloat(balanceInBNB) < 0.1) {
    console.error("\n❌ Error: Insufficient BNB balance!");
    console.error("   You need at least 0.1 BNB for mainnet deployment.");
    process.exit(1);
  }
  
  // BSC Mainnet USDT address
  const BSC_MAINNET_USDT = "0x55d398326f99059fF775485246999027B3197955";
  
  // Step 1: Get USDT token address
  let usdtTokenAddress = process.env.USDT_TOKEN_ADDRESS || BSC_MAINNET_USDT;
  
  if (!usdtTokenAddress || usdtTokenAddress === "0xYOUR_USDT_ADDRESS") {
    console.log("📝 Step 1: Using BSC Mainnet USDT:", BSC_MAINNET_USDT);
    usdtTokenAddress = BSC_MAINNET_USDT;
  } else {
    console.log("📝 Step 1: Using provided USDT token:", usdtTokenAddress);
  }
  
  // Verify token
  try {
    const tokenAbi = [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)"
    ];
    const token = await hre.ethers.getContractAt(tokenAbi, usdtTokenAddress);
    const name = await token.name();
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    console.log("   Token Name:", name);
    console.log("   Token Symbol:", symbol);
    console.log("   Token Decimals:", decimals.toString());
    
    if (symbol !== "USDT" && symbol !== "BUSD") {
      console.log("   ⚠️  Warning: Token symbol is not USDT or BUSD!");
    }
  } catch (e) {
    console.error("   ❌ Error: Could not verify token contract!");
    console.error("   Please verify the USDT token address is correct.");
    process.exit(1);
  }
  
  // Step 2: Get wallet addresses
  const companyWallet = process.env.COMPANY_WALLET;
  const backendWallet = process.env.BACKEND_WALLET;
  
  if (!companyWallet || companyWallet === "0xYOUR_COMPANY_WALLET_ADDRESS") {
    console.error("\n❌ Error: COMPANY_WALLET not set in .env file!");
    process.exit(1);
  }
  
  if (!backendWallet || backendWallet === "0xYOUR_BACKEND_WALLET_ADDRESS") {
    console.error("\n❌ Error: BACKEND_WALLET not set in .env file!");
    process.exit(1);
  }
  
  console.log("\n📝 Step 2: Wallet Configuration:");
  console.log("   Company Wallet:", companyWallet);
  console.log("   Backend Wallet:", backendWallet);
  
  // Final confirmation
  console.log("\n" + "=".repeat(80));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(80));
  console.log("   Network: BSC Mainnet (Chain ID: 56)");
  console.log("   Contract: PaymentReconciliation");
  console.log("   USDT Token:", usdtTokenAddress);
  console.log("   Company Wallet:", companyWallet);
  console.log("   Backend Wallet:", backendWallet);
  console.log("   Deployer:", deployer.address);
  console.log("=".repeat(80));
  console.log("\n⚠️  Are you sure you want to proceed? (This is MAINNET!)");
  console.log("   Press Ctrl+C to cancel, or wait 10 seconds to continue...\n");
  
  // Wait 10 seconds for user to cancel
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Step 3: Deploy PaymentReconciliation
  console.log("\n📝 Step 3: Deploying PaymentReconciliation Contract...");
  console.log("   This may take 1-2 minutes on mainnet...\n");
  
  const PaymentReconciliation = await hre.ethers.getContractFactory("PaymentReconciliation");
  const contract = await PaymentReconciliation.deploy(
    usdtTokenAddress,
    companyWallet,
    backendWallet
  );
  
  console.log("   ⏳ Waiting for transaction confirmation...");
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log("✅ PaymentReconciliation deployed to:", contractAddress);
  
  // Wait for block confirmations
  console.log("   ⏳ Waiting for block confirmations...");
  const deploymentTx = contract.deploymentTransaction();
  if (deploymentTx) {
    await deploymentTx.wait(5); // Wait for 5 confirmations on mainnet
  }
  
  // Get contract configuration
  const entryPrice = await contract.entryPrice();
  const retopupPrice = await contract.retopupPrice();
  const tokenDecimals = await contract.tokenDecimals();
  
  console.log("\n📋 Contract Configuration:");
  console.log("   Entry Price:", hre.ethers.formatUnits(entryPrice, tokenDecimals), "USDT");
  console.log("   Retopup Price:", hre.ethers.formatUnits(retopupPrice, tokenDecimals), "USDT");
  console.log("   Token Decimals:", tokenDecimals.toString());
  
  // Save deployment info
  const deploymentInfo = {
    network: "bscMainnet",
    chainId: "56",
    contractName: "PaymentReconciliation",
    contractAddress: contractAddress,
    usdtTokenAddress: usdtTokenAddress,
    isMockToken: false,
    deployer: deployer.address,
    companyWallet: companyWallet,
    backendWallet: backendWallet,
    entryPrice: entryPrice.toString(),
    retopupPrice: retopupPrice.toString(),
    tokenDecimals: tokenDecimals.toString(),
    deploymentTxHash: deploymentTx?.hash || "unknown",
    timestamp: new Date().toISOString()
  };
  
  const deploymentsDir = './deployments';
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  const deploymentFile = `${deploymentsDir}/bscMainnet-payment-reconciliation-${Date.now()}.json`;
  const latestFile = `${deploymentsDir}/bscMainnet-payment-reconciliation-latest.json`;
  
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("✅ Deployment info saved to:", deploymentFile);
  
  // Display results
  console.log("\n" + "=".repeat(80));
  console.log("🎉 MAINNET DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(80));
  
  console.log("\n📋 Contract Addresses:");
  console.log("   PaymentReconciliation:", contractAddress);
  console.log("   USDT Token Address:", usdtTokenAddress);
  console.log("   Company Wallet:", companyWallet);
  console.log("   Backend Wallet:", backendWallet);
  
  console.log("\n🔍 View on BSCScan:");
  console.log("   Contract:", `https://bscscan.com/address/${contractAddress}`);
  console.log("   Token:", `https://bscscan.com/address/${usdtTokenAddress}`);
  if (deploymentTx) {
    console.log("   Transaction:", `https://bscscan.com/tx/${deploymentTx.hash}`);
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("📋 BACKEND CONFIGURATION (backend-express/.env)");
  console.log("=".repeat(80));
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`TOKEN_ADDRESS=${usdtTokenAddress}`);
  console.log(`USDT_TOKEN_ADDRESS=${usdtTokenAddress}`);
  console.log(`BACKEND_PRIVATE_KEY=<private_key_of_backend_wallet>`);
  console.log(`COMPANY_WALLET_ADDRESS=${companyWallet}`);
  console.log("BSC_RPC_URL=https://rpc.ankr.com/bsc");
  console.log("BSC_WS_RPC_URL=wss://rpc.ankr.com/bsc/ws");
  
  console.log("\n" + "=".repeat(80));
  console.log("🔐 Verify Contract on BSCScan:");
  console.log("   npx hardhat verify --network bscMainnet \\");
  console.log(`     ${contractAddress} \\`);
  console.log(`     ${usdtTokenAddress} \\`);
  console.log(`     ${companyWallet} \\`);
  console.log(`     ${backendWallet}`);
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ NEXT STEPS");
  console.log("=".repeat(80));
  console.log("1. ✅ Verify contract on BSCScan (IMPORTANT!)");
  console.log("2. ✅ Update backend .env with contract address");
  console.log("3. ✅ Update frontend .env with contract address");
  console.log("4. ✅ Test all functions on mainnet");
  console.log("5. ✅ Monitor contract for any issues");
  console.log("6. ✅ Ensure backend wallet has BNB for gas");
  console.log("7. ✅ Ensure users have USDT tokens");
  console.log("\n" + "=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

