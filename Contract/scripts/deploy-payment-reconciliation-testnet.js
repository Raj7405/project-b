const hre = require("hardhat");
require('dotenv').config();
const fs = require('fs');
const path = require('path');

/**
 * Deploy PaymentReconciliation Contract to BSC Testnet
 * 
 * This contract uses:
 * - USDT (BEP-20) for fees/payments
 * - BNB (native token) for gas fees
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-payment-reconciliation-testnet.js --network bscTestnet
 * 
 * Required Environment Variables:
 *   - DEPLOYER_PRIVATE_KEY: Private key of deployer account
 *   - COMPANY_WALLET: Company wallet address
 *   - BACKEND_WALLET: Backend wallet address
 *   - USDT_TOKEN_ADDRESS: (Optional) USDT token address on testnet
 *                        If not provided, will deploy mock token
 */
async function main() {
  console.log("\n🚀 Deploying PaymentReconciliation to BSC Testnet (USDT Fees, BNB Gas)...\n");
  
  // Check if .env file exists
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error("❌ Error: .env file not found!");
    console.error("   Expected location:", envPath);
    console.error("\n   Please create a .env file in the Contract/ directory with:");
    console.error("   DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE");
    console.error("   COMPANY_WALLET=0xYOUR_COMPANY_WALLET");
    console.error("   BACKEND_WALLET=0xYOUR_BACKEND_WALLET");
    console.error("   USDT_TOKEN_ADDRESS=  (optional - leave empty to deploy mock token)");
    process.exit(1);
  }
  
  // Validate private key
  let privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey || privateKey === "0xYOUR_PRIVATE_KEY_HERE" || privateKey === "") {
    console.error("❌ Error: DEPLOYER_PRIVATE_KEY not set in .env file!");
    console.error("\n   Please add your private key to Contract/.env:");
    console.error("   DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE");
    console.error("\n   ⚠️  Security: Never commit your private key to version control!");
    process.exit(1);
  }
  
  // Auto-fix: Add 0x prefix if missing
  if (!privateKey.startsWith("0x")) {
    console.log("⚠️  Warning: Private key missing '0x' prefix, adding it automatically...");
    privateKey = "0x" + privateKey;
    process.env.DEPLOYER_PRIVATE_KEY = privateKey;
  }
  
  // Validate private key format
  if (privateKey.length !== 66 || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    console.error("❌ Error: Invalid private key format!");
    console.error("   Private key must be 66 characters (0x + 64 hex characters)");
    process.exit(1);
  }
  
  // Show environment status
  console.log("📋 Environment Configuration:");
  console.log("   ✅ DEPLOYER_PRIVATE_KEY: Set (" + privateKey.substring(0, 6) + "..." + privateKey.substring(privateKey.length - 4) + ")");
  console.log("   " + (process.env.COMPANY_WALLET ? "✅" : "⚠️ ") + " COMPANY_WALLET:", process.env.COMPANY_WALLET || "Not set (will use deployer address)");
  console.log("   " + (process.env.BACKEND_WALLET ? "✅" : "⚠️ ") + " BACKEND_WALLET:", process.env.BACKEND_WALLET || "Not set (will use deployer address)");
  console.log("   " + (process.env.USDT_TOKEN_ADDRESS ? "✅" : "ℹ️ ") + " USDT_TOKEN_ADDRESS:", process.env.USDT_TOKEN_ADDRESS || "Not set (will deploy mock token)");
  console.log("");
  
  // Check network
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 97n) {
    console.error("❌ Error: Not connected to BSC Testnet (Chain ID: 97)!");
    console.error("   Current Chain ID:", network.chainId.toString());
    console.error("   Expected Chain ID: 97");
    console.error("\n   Please use: npx hardhat run scripts/deploy-payment-reconciliation-testnet.js --network bscTestnet");
    process.exit(1);
  }
  
  // Get signers
  const signers = await hre.ethers.getSigners();
  if (!signers || signers.length === 0) {
    console.error("❌ Error: No signers available!");
    console.error("   Check that your .env file has DEPLOYER_PRIVATE_KEY set");
    process.exit(1);
  }
  
  const deployer = signers[0];
  console.log("📝 Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceInBNB = hre.ethers.formatEther(balance);
  console.log("💰 Account balance:", balanceInBNB, "BNB");
  
  if (parseFloat(balanceInBNB) < 0.01) {
    console.error("\n❌ Error: Insufficient BNB balance!");
    console.error("   You need at least 0.01 BNB for deployment (gas fees).");
    console.error("   Get testnet BNB from: https://testnet.binance.org/faucet-smart");
    process.exit(1);
  }
  
  console.log("✅ Sufficient balance for deployment\n");
  
  // Step 1: Get or deploy USDT token
  let usdtTokenAddress = process.env.USDT_TOKEN_ADDRESS;
  let isMockToken = false;
  
  // BSC Testnet USDT address (if using real USDT)
  const BSC_TESTNET_USDT = "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd"; // BUSD on testnet (commonly used)
  
  if (!usdtTokenAddress || usdtTokenAddress === "" || usdtTokenAddress === "0xYOUR_USDT_ADDRESS") {
    console.log("📝 Step 1: Deploying Mock USDT Token...");
    const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
    const token = await ERC20Mock.deploy(
      "Mock USDT",
      "USDT",
      deployer.address,
      hre.ethers.parseUnits("1000000", 18) // 1M USDT with 18 decimals
    );
    await token.waitForDeployment();
    usdtTokenAddress = await token.getAddress();
    isMockToken = true;
    console.log("✅ Mock USDT Token deployed to:", usdtTokenAddress);
    console.log("   ⚠️  This is a MOCK token for testing only!");
    console.log("   💡 For production, use real USDT address:", BSC_TESTNET_USDT);
  } else {
    console.log("📝 Step 1: Using existing USDT token:", usdtTokenAddress);
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
    } catch (e) {
      console.log("   ⚠️  Warning: Could not verify token contract, but will proceed");
    }
  }
  
  // Step 2: Get wallet addresses
  const companyWallet = process.env.COMPANY_WALLET || deployer.address;
  const backendWallet = process.env.BACKEND_WALLET || deployer.address;
  
  if (!companyWallet || companyWallet === "0xYOUR_COMPANY_WALLET_ADDRESS" || companyWallet === "") {
    console.error("\n❌ Error: COMPANY_WALLET not set in .env file!");
    console.error("   Please set COMPANY_WALLET in your .env file");
    process.exit(1);
  }
  
  if (!backendWallet || backendWallet === "0xYOUR_BACKEND_WALLET_ADDRESS" || backendWallet === "") {
    console.error("\n❌ Error: BACKEND_WALLET not set in .env file!");
    console.error("   Please set BACKEND_WALLET in your .env file");
    process.exit(1);
  }
  
  console.log("\n📝 Step 2: Wallet Configuration:");
  console.log("   Company Wallet:", companyWallet);
  console.log("   Backend Wallet:", backendWallet);
  
  // Step 3: Deploy PaymentReconciliation
  console.log("\n📝 Step 3: Deploying PaymentReconciliation Contract...");
  console.log("   This may take 30-60 seconds...\n");
  
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
    await deploymentTx.wait(3);
  }
  
  // Get contract configuration
  const entryPrice = await contract.entryPrice();
  const retopupPrice = await contract.retopupPrice();
  const tokenDecimals = await contract.tokenDecimals();
  
  console.log("\n📋 Contract Configuration:");
  console.log("   Entry Price:", hre.ethers.formatUnits(entryPrice, tokenDecimals), "USDT");
  console.log("   Retopup Price:", hre.ethers.formatUnits(retopupPrice, tokenDecimals), "USDT");
  console.log("   Token Decimals:", tokenDecimals.toString());
  
  // Step 4: Save deployment info
  console.log("\n📝 Step 4: Saving deployment information...");
  
  const deploymentInfo = {
    network: "bscTestnet",
    chainId: "97",
    contractName: "PaymentReconciliation",
    contractAddress: contractAddress,
    usdtTokenAddress: usdtTokenAddress,
    isMockToken: isMockToken,
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
  
  const deploymentFile = `${deploymentsDir}/bscTestnet-payment-reconciliation-${Date.now()}.json`;
  const latestFile = `${deploymentsDir}/bscTestnet-payment-reconciliation-latest.json`;
  
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("✅ Deployment info saved to:", deploymentFile);
  console.log("✅ Latest deployment saved to:", latestFile);
  
  // Step 5: Display results
  console.log("\n" + "=".repeat(80));
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(80));
  
  console.log("\n📋 Contract Addresses:");
  console.log("   PaymentReconciliation:", contractAddress);
  console.log("   USDT Token Address:", usdtTokenAddress, isMockToken ? "(Mock Token)" : "");
  console.log("   Company Wallet:", companyWallet);
  console.log("   Backend Wallet:", backendWallet);
  
  console.log("\n🔍 View on BSCScan Testnet:");
  console.log("   Contract:", `https://testnet.bscscan.com/address/${contractAddress}`);
  console.log("   Token:", `https://testnet.bscscan.com/address/${usdtTokenAddress}`);
  if (deploymentTx) {
    console.log("   Transaction:", `https://testnet.bscscan.com/tx/${deploymentTx.hash}`);
  }
  
  // Configuration output
  console.log("\n" + "=".repeat(80));
  console.log("📋 BACKEND CONFIGURATION (backend-express/.env)");
  console.log("=".repeat(80));
  console.log("\n# Contract Configuration");
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`TOKEN_ADDRESS=${usdtTokenAddress}`);
  console.log(`USDT_TOKEN_ADDRESS=${usdtTokenAddress}`);
  console.log(`BACKEND_PRIVATE_KEY=<private_key_of_backend_wallet>`);
  console.log(`COMPANY_WALLET_ADDRESS=${companyWallet}\n`);
  
  console.log("# Network Configuration");
  console.log("BSC_RPC_URL=https://rpc.ankr.com/bsc_testnet");
  console.log("BSC_WS_RPC_URL=wss://rpc.ankr.com/bsc_testnet/ws\n");
  
  console.log("# Important Notes:");
  console.log("# - Gas fees are paid in BNB (native token)");
  console.log("# - Payments/fees are in USDT (BEP-20 token)");
  console.log("# - Users need to approve contract to spend USDT");
  console.log("# - Backend needs BNB for gas fees\n");
  
  console.log("=".repeat(80));
  console.log("📋 FRONTEND CONFIGURATION (Frontend/.env.local)");
  console.log("=".repeat(80));
  console.log("\n# Contract Addresses");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`NEXT_PUBLIC_TOKEN_ADDRESS=${usdtTokenAddress}`);
  console.log(`NEXT_PUBLIC_USDT_TOKEN_ADDRESS=${usdtTokenAddress}\n`);
  
  console.log("# Network Configuration");
  console.log("NEXT_PUBLIC_RPC_URL=https://rpc.ankr.com/bsc_testnet");
  console.log("NEXT_PUBLIC_CHAIN_ID=97");
  console.log("NEXT_PUBLIC_NETWORK_NAME=BSC Testnet\n");
  
  console.log("=".repeat(80));
  console.log("🔐 Verify Contract on BSCScan:");
  console.log("   npx hardhat verify --network bscTestnet \\");
  console.log(`     ${contractAddress} \\`);
  console.log(`     ${usdtTokenAddress} \\`);
  console.log(`     ${companyWallet} \\`);
  console.log(`     ${backendWallet}`);
  
  if (isMockToken) {
    console.log("\n" + "=".repeat(80));
    console.log("⚠️  IMPORTANT: MOCK TOKEN DEPLOYED");
    console.log("=".repeat(80));
    console.log("1. You deployed a MOCK USDT token for testing");
    console.log("2. To mint test tokens, call the mint() function on the token contract");
    console.log("3. For production, use the real USDT token address");
    console.log("4. BSC Testnet USDT/BUSD:", BSC_TESTNET_USDT);
    console.log("\n" + "=".repeat(80));
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("📝 NEXT STEPS");
  console.log("=".repeat(80));
  console.log("\n1. ✅ Copy backend configuration to backend-express/.env");
  console.log("2. ✅ Copy frontend configuration to Frontend/.env.local");
  console.log("3. 🔍 Verify contract on BSCScan (optional but recommended)");
  console.log("4. 🧪 Test contract functions on testnet");
  console.log("5. 💰 Ensure backend wallet has BNB for gas fees");
  console.log("6. 💰 Ensure users have USDT tokens for payments");
  console.log("7. 🚀 Start backend: npm run dev");
  console.log("8. 🌐 Start frontend: npm run dev");
  console.log("9. ⚠️  Test thoroughly before mainnet deployment\n");
  
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    
    if (error.message.includes("insufficient funds")) {
      console.error("\n💡 Tip: Get testnet BNB from: https://testnet.binance.org/faucet-smart");
    }
    
    if (error.message.includes("nonce")) {
      console.error("\n💡 Tip: Wait a few seconds and try again (nonce issue)");
    }
    
    if (error.message.includes("network")) {
      console.error("\n💡 Tip: Check your BSC_TESTNET_RPC URL in .env file");
    }
    
    process.exit(1);
  });

