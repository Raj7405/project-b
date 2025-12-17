const hre = require("hardhat");
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("\n🚀 Deploying CryptoMLMTransactions to BSC Testnet...\n");
  
  // Check if .env file exists
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error("❌ Error: .env file not found!");
    console.error("   Expected location:", envPath);
    console.error("\n   Please create a .env file in the Contract/ directory with:");
    console.error("   DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE");
    console.error("   COMPANY_WALLET=0xYOUR_COMPANY_WALLET");
    console.error("   BACKEND_WALLET=0xYOUR_BACKEND_WALLET");
    console.error("   TOKEN_ADDRESS=  (optional - leave empty to deploy mock token)");
    process.exit(1);
  }
  
  // Check if private key is set
  let privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey || privateKey === "0xYOUR_PRIVATE_KEY_HERE" || privateKey === "") {
    console.error("❌ Error: DEPLOYER_PRIVATE_KEY not set in .env file!");
    console.error("\n   Please add your private key to Contract/.env:");
    console.error("   DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE");
    console.error("\n   ⚠️  Security: Never commit your private key to version control!");
    console.error("   Make sure .env is in .gitignore");
    process.exit(1);
  }
  
  // Auto-fix: Add 0x prefix if missing
  if (!privateKey.startsWith("0x")) {
    console.log("⚠️  Warning: Private key missing '0x' prefix, adding it automatically...");
    privateKey = "0x" + privateKey;
    process.env.DEPLOYER_PRIVATE_KEY = privateKey;
  }
  
  // Validate private key format
  if (privateKey.length !== 66) {
    console.error("❌ Error: Invalid private key format!");
    console.error("   Private key must be 66 characters (0x + 64 hex characters)");
    console.error("   Your key length:", privateKey.length);
    console.error("   Expected length: 66");
    if (privateKey.length === 64) {
      console.error("\n   💡 Tip: Your key is missing the '0x' prefix");
    }
    process.exit(1);
  }
  
  // Validate it's a valid hex string
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    console.error("❌ Error: Invalid private key format!");
    console.error("   Private key must be a valid hexadecimal string");
    console.error("   Your key starts with:", privateKey.substring(0, 10) + "...");
    process.exit(1);
  }
  
  // Show environment status (without revealing private key)
  console.log("📋 Environment Configuration:");
  console.log("   ✅ DEPLOYER_PRIVATE_KEY: Set (" + privateKey.substring(0, 6) + "..." + privateKey.substring(privateKey.length - 4) + ")");
  console.log("   " + (process.env.COMPANY_WALLET ? "✅" : "⚠️ ") + " COMPANY_WALLET:", process.env.COMPANY_WALLET || "Not set (will use deployer address)");
  console.log("   " + (process.env.BACKEND_WALLET ? "✅" : "⚠️ ") + " BACKEND_WALLET:", process.env.BACKEND_WALLET || "Not set (will use deployer address)");
  console.log("   " + (process.env.TOKEN_ADDRESS ? "✅" : "ℹ️ ") + " TOKEN_ADDRESS:", process.env.TOKEN_ADDRESS || "Not set (will deploy mock token)");
  console.log("   " + (process.env.BSC_TESTNET_RPC ? "✅" : "ℹ️ ") + " BSC_TESTNET_RPC:", process.env.BSC_TESTNET_RPC || "Using default");
  console.log("");
  
  // Check network
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 97n) {
    console.error("❌ Error: Not connected to BSC Testnet (Chain ID: 97)!");
    console.error("   Current Chain ID:", network.chainId.toString());
    console.error("   Expected Chain ID: 97");
    console.error("\n   Please use: npx hardhat run scripts/deploy-crypto-mlm-testnet.js --network bscTestnet");
    process.exit(1);
  }
  
  // Get signers
  const signers = await hre.ethers.getSigners();
  if (!signers || signers.length === 0) {
    console.error("❌ Error: No signers available!");
    console.error("   This usually means DEPLOYER_PRIVATE_KEY is not configured correctly in hardhat.config.js");
    console.error("   Check that your .env file has DEPLOYER_PRIVATE_KEY set");
    process.exit(1);
  }
  
  const deployer = signers[0];
  if (!deployer || !deployer.address) {
    console.error("❌ Error: Deployer account not available!");
    process.exit(1);
  }
  
  console.log("📝 Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceInBNB = hre.ethers.formatEther(balance);
  console.log("💰 Account balance:", balanceInBNB, "BNB");
  
  if (parseFloat(balanceInBNB) < 0.01) {
    console.error("\n❌ Error: Insufficient BNB balance!");
    console.error("   You need at least 0.01 BNB for deployment.");
    console.error("   Get testnet BNB from: https://testnet.binance.org/faucet-smart");
    process.exit(1);
  }
  
  console.log("✅ Sufficient balance for deployment\n");
  
  // Step 1: Get or deploy token
  let tokenAddress = process.env.TOKEN_ADDRESS;
  let isMockToken = false;
  
  if (!tokenAddress || tokenAddress === "" || tokenAddress === "0xYOUR_TOKEN_ADDRESS") {
    console.log("📝 Step 1: Deploying Mock BEP-20 Token...");
    const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
    const token = await ERC20Mock.deploy(
      "Test WBNB",
      "TWBNB",
      deployer.address,
      hre.ethers.parseUnits("1000000", 18)
    );
    await token.waitForDeployment();
    tokenAddress = await token.getAddress();
    isMockToken = true;
    console.log("✅ Mock Token deployed to:", tokenAddress);
    console.log("   ⚠️  This is a MOCK token for testing only!");
  } else {
    console.log("📝 Step 1: Using existing token:", tokenAddress);
    try {
      const tokenAbi = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)"
      ];
      const token = await hre.ethers.getContractAt(tokenAbi, tokenAddress);
      try {
        const name = await token.name();
        const symbol = await token.symbol();
        const decimals = await token.decimals();
        console.log("   Token Name:", name);
        console.log("   Token Symbol:", symbol);
        console.log("   Token Decimals:", decimals.toString());
      } catch (e) {
        console.log("   (Token info not available - using provided address)");
      }
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
  
  // Step 3: Deploy CryptoMLMTransactions
  console.log("\n📝 Step 3: Deploying CryptoMLMTransactions Contract...");
  console.log("   This may take 30-60 seconds...\n");
  
  const CryptoMLMTransactions = await hre.ethers.getContractFactory("CryptoMLMTransactions");
  const contract = await CryptoMLMTransactions.deploy(
    tokenAddress,
    companyWallet,
    backendWallet
  );
  
  console.log("   ⏳ Waiting for transaction confirmation...");
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log("✅ CryptoMLMTransactions deployed to:", contractAddress);
  
  // Wait for block confirmations
  console.log("   ⏳ Waiting for block confirmations...");
  const deploymentTx = contract.deploymentTransaction();
  if (deploymentTx) {
    await deploymentTx.wait(3);
  }
  
  // Get contract configuration
  const entryPrice = await contract.entryPrice();
  const retopupPrice = await contract.retopupPrice();
  
  console.log("\n📋 Contract Configuration:");
  console.log("   Entry Price:", hre.ethers.formatEther(entryPrice), "BNB");
  console.log("   Retopup Price:", hre.ethers.formatEther(retopupPrice), "BNB");
  
  // Step 4: Save deployment info
  console.log("\n📝 Step 4: Saving deployment information...");
  
  const deploymentInfo = {
    network: "bscTestnet",
    chainId: "97",
    contractAddress: contractAddress,
    tokenAddress: tokenAddress,
    isMockToken: isMockToken,
    deployer: deployer.address,
    companyWallet: companyWallet,
    backendWallet: backendWallet,
    entryPrice: entryPrice.toString(),
    retopupPrice: retopupPrice.toString(),
    deploymentTxHash: deploymentTx?.hash || "unknown",
    timestamp: new Date().toISOString()
  };
  
  const deploymentsDir = './deployments';
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  const deploymentFile = `${deploymentsDir}/bscTestnet-${Date.now()}.json`;
  const latestFile = `${deploymentsDir}/bscTestnet-latest.json`;
  
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("✅ Deployment info saved to:", deploymentFile);
  console.log("✅ Latest deployment saved to:", latestFile);
  
  // Step 5: Display results
  console.log("\n" + "=".repeat(80));
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(80));
  
  console.log("\n📋 Contract Addresses:");
  console.log("   CryptoMLMTransactions:", contractAddress);
  console.log("   Token Address:", tokenAddress, isMockToken ? "(Mock Token)" : "");
  console.log("   Company Wallet:", companyWallet);
  console.log("   Backend Wallet:", backendWallet);
  
  console.log("\n🔍 View on BSCScan Testnet:");
  console.log("   Contract:", `https://testnet.bscscan.com/address/${contractAddress}`);
  console.log("   Token:", `https://testnet.bscscan.com/address/${tokenAddress}`);
  if (deploymentTx) {
    console.log("   Transaction:", `https://testnet.bscscan.com/tx/${deploymentTx.hash}`);
  }
  
  // ✅ UPDATED: Different RPC URLs for Backend and Frontend
  console.log("\n" + "=".repeat(80));
  console.log("📋 BACKEND CONFIGURATION (backend-express/.env)");
  console.log("=".repeat(80));
  console.log("\n# ⚠️  IMPORTANT: Use a better RPC provider to avoid rate limits!");
  console.log("# Recommended: Ankr (free, no signup required)\n");
  
  console.log("# Option 1: Ankr (Free, Better Rate Limits) ⭐ RECOMMENDED");
  console.log("BSC_RPC_URL=https://rpc.ankr.com/bsc_testnet");
  console.log("BSC_RPC_WS_URL=wss://rpc.ankr.com/bsc_testnet/ws\n");
  
  console.log("# Option 2: Binance Public (Free, but strict rate limits)");
  console.log("# BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/");
  console.log("# BSC_RPC_WS_URL=wss://bsc-testnet-rpc.publicnode.com\n");
  
  console.log("# Contract Configuration");
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`BACKEND_PRIVATE_KEY=<private_key_of_backend_wallet>`);
  console.log(`COMPANY_WALLET_ADDRESS=${companyWallet}\n`);
  
  console.log("# Listener Configuration (fast polling for good RPC)");
  console.log("START_BLOCK=0");
  console.log("FAST_POLLING_INTERVAL=3000           # 3 seconds");
  console.log("MAX_BLOCKS_PER_QUERY=20              # Process 20 blocks per chunk");
  console.log("DELAY_BETWEEN_EVENT_TYPES=500        # 0.5 second delay");
  console.log("MAX_CATCHUP_BLOCKS=5000              # Catch up last 5000 blocks max\n");
  
  console.log("# Database");
  console.log("DATABASE_URL=postgresql://user:password@localhost:5432/crypto_mlm\n");
  
  console.log("# Redis");
  console.log("REDIS_URL=redis://localhost:6379\n");
  
  console.log("=".repeat(80));
  console.log("📋 FRONTEND CONFIGURATION (Frontend/.env.local)");
  console.log("=".repeat(80));
  console.log("\n# Contract Addresses");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`NEXT_PUBLIC_TOKEN_ADDRESS=${tokenAddress}\n`);
  
  console.log("# Network Configuration");
  console.log("# Option 1: Ankr (Free, Fast) ⭐ RECOMMENDED");
  console.log("NEXT_PUBLIC_RPC_URL=https://rpc.ankr.com/bsc_testnet\n");
  
  console.log("# Option 2: Binance Public RPC");
  console.log("# NEXT_PUBLIC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/\n");
  
  console.log("NEXT_PUBLIC_CHAIN_ID=97");
  console.log("NEXT_PUBLIC_NETWORK_NAME=BSC Testnet\n");
  
  console.log("# API Configuration");
  console.log("NEXT_PUBLIC_API_URL=http://localhost:8080  # Your backend URL\n");
  
  console.log("=".repeat(80));
  console.log("📝 RPC PROVIDER RECOMMENDATIONS");
  console.log("=".repeat(80));
  console.log("\n🌟 BEST OPTIONS (No Rate Limit Issues):\n");
  
  console.log("1. Ankr (FREE - No Signup Required) ⭐ RECOMMENDED");
  console.log("   HTTP:  https://rpc.ankr.com/bsc_testnet");
  console.log("   WS:    wss://rpc.ankr.com/bsc_testnet/ws");
  console.log("   Rate:  Much better than Binance public");
  console.log("   Cost:  FREE\n");
  
  console.log("2. QuickNode (FREE Tier - 5 min signup)");
  console.log("   Sign up: https://www.quicknode.com/");
  console.log("   Rate:    10M requests/month");
  console.log("   Speed:   Very Fast");
  console.log("   Cost:    FREE tier available\n");
  
  console.log("3. GetBlock (FREE Tier)");
  console.log("   Sign up: https://getblock.io/");
  console.log("   Rate:    40K requests/day");
  console.log("   Cost:    FREE tier available\n");
  
  console.log("⚠️  AVOID: Binance Public RPC (Very strict rate limits)");
  console.log("   - Only use for quick testing");
  console.log("   - Will block you after 10-20 requests");
  console.log("   - Not suitable for production or development\n");
  
  console.log("=".repeat(80));
  
  console.log("\n🔐 Verify Contract on BSCScan:");
  console.log("   npx hardhat verify --network bscTestnet \\");
  console.log(`     ${contractAddress} \\`);
  console.log(`     ${tokenAddress} \\`);
  console.log(`     ${companyWallet} \\`);
  console.log(`     ${backendWallet}`);
  
  if (isMockToken) {
    console.log("\n" + "=".repeat(80));
    console.log("⚠️  IMPORTANT: MOCK TOKEN DEPLOYED");
    console.log("=".repeat(80));
    console.log("1. You deployed a MOCK token for testing");
    console.log("2. To mint test tokens, call the mint() function on the token contract");
    console.log("3. For production, use the real WBNB token address");
    console.log("4. WBNB Testnet Address: 0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd");
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("📝 NEXT STEPS");
  console.log("=".repeat(80));
  console.log("\n1. ⭐ USE ANKR RPC (Immediate Fix):");
  console.log("   Update backend-express/.env:");
  console.log("   BSC_RPC_URL=https://rpc.ankr.com/bsc_testnet");
  console.log("   BSC_RPC_WS_URL=wss://rpc.ankr.com/bsc_testnet/ws\n");
  
  console.log("2. ✅ Copy backend configuration to backend-express/.env");
  console.log("3. ✅ Copy frontend configuration to Frontend/.env.local");
  console.log("4. 🔍 Verify contract on BSCScan (optional but recommended)");
  console.log("5. 🧪 Test contract functions on testnet");
  console.log("6. 🚀 Start backend: npm run dev");
  console.log("7. 🌐 Start frontend: npm run dev");
  console.log("8. ⚠️  Test thoroughly before mainnet deployment\n");
  
  console.log("=".repeat(80));
  console.log("💡 TROUBLESHOOTING");
  console.log("=".repeat(80));
  console.log("\nIf you see 'Rate Limit' or 'Too Many Requests' errors:");
  console.log("1. Switch to Ankr RPC (see configuration above)");
  console.log("2. Or sign up for QuickNode (free tier)");
  console.log("3. Or test locally with Hardhat node (unlimited requests)\n");
  
  console.log("For local testing:");
  console.log("   Terminal 1: npx hardhat node");
  console.log("   Terminal 2: Update .env with BSC_RPC_URL=http://127.0.0.1:8545");
  console.log("   Terminal 3: npm run dev\n");
  
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