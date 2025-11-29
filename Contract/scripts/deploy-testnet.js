const hre = require("hardhat");
require('dotenv').config();
const fs = require('fs');

async function main() {
  console.log("\n🚀 Starting BSC Testnet Deployment...");
  console.log("   Network: BSC Testnet (Chain ID: 97)\n");
  
  // Check if we're on the right network
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 97n) {
    console.error("❌ Error: Not connected to BSC Testnet!");
    console.error("   Current Chain ID:", network.chainId.toString());
    console.error("   Expected Chain ID: 97");
    console.error("\n   Please check your hardhat.config.js and ensure you're using:");
    console.error("   npx hardhat run deploy-testnet.js --network bscTestnet");
    process.exit(1);
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  // Check deployer balance
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

  // Step 1: Determine token address
  let tokenAddress = process.env.TOKEN_ADDRESS;
  let isMockToken = false;
  
  if (!tokenAddress || tokenAddress === "0xYOUR_TOKEN_ADDRESS" || tokenAddress === "") {
    // Deploy mock token
    console.log("📝 Step 1: Deploying Mock BEP-20 Token (WBNB simulation)...");
    const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
    const token = await ERC20Mock.deploy(
      "Test WBNB",
      "TWBNB",
      deployer.address,
      hre.ethers.parseUnits("1000000", 18) // 1 million tokens initial supply
    );
    await token.waitForDeployment();
    tokenAddress = await token.getAddress();
    isMockToken = true;
    console.log("✅ Mock BEP-20 Token deployed to:", tokenAddress);
    console.log("   ⚠️  This is a MOCK token for testing only!");
  } else {
    // Use existing token (e.g., WBNB on testnet)
    console.log("📝 Step 1: Using existing token address:", tokenAddress);
    try {
      // Try to read token info using standard ERC20/BEP20 interface
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

  // Step 2: Get company wallet address
  const companyWallet = process.env.COMPANY_WALLET || deployer.address;
  if (!companyWallet || companyWallet === "0xYOUR_COMPANY_WALLET_ADDRESS") {
    console.error("\n❌ Error: COMPANY_WALLET not set in .env file!");
    console.error("   Please set COMPANY_WALLET in your .env file");
    process.exit(1);
  }
  console.log("\n📝 Step 2: Company Wallet:", companyWallet);

  // Step 3: Deploy MLMSystem Contract
  console.log("\n📝 Step 3: Deploying MLMSystem Contract...");
  console.log("   This may take 30-60 seconds...\n");
  
  const MLMSystem = await hre.ethers.getContractFactory("MLMSystem");
  const mlmSystem = await MLMSystem.deploy(
    tokenAddress,
    companyWallet
  );

  console.log("   ⏳ Waiting for transaction confirmation...");
  await mlmSystem.waitForDeployment();
  const contractAddress = await mlmSystem.getAddress();
  
  console.log("✅ MLMSystem deployed to:", contractAddress);

  // Wait for a few block confirmations
  console.log("   ⏳ Waiting for block confirmations...");
  await mlmSystem.deploymentTransaction()?.wait(3);

  // Get contract configuration
  const entryPrice = await mlmSystem.entryPrice();
  const retopupPrice = await mlmSystem.retopupPrice();
  const directIncome = await mlmSystem.directIncome();
  const companyFee = await mlmSystem.companyFee();
  const tokenDecimals = await mlmSystem.tokenDecimals();

  console.log("\n📋 Contract Configuration:");
  console.log("   Entry Price:", hre.ethers.formatUnits(entryPrice, tokenDecimals), "tokens");
  console.log("   Retopup Price:", hre.ethers.formatUnits(retopupPrice, tokenDecimals), "tokens");
  console.log("   Direct Income:", hre.ethers.formatUnits(directIncome, tokenDecimals), "tokens");
  console.log("   Company Fee:", hre.ethers.formatUnits(companyFee, tokenDecimals), "tokens");
  console.log("   Token Decimals:", tokenDecimals.toString());

  // Step 4: Save deployment info
  console.log("\n📝 Step 4: Saving deployment information...");
  
  const deploymentInfo = {
    network: hre.network.name,
    chainId: network.chainId.toString(),
    contractAddress: contractAddress,
    tokenAddress: tokenAddress,
    isMockToken: isMockToken,
    deployer: deployer.address,
    companyWallet: companyWallet,
    entryPrice: entryPrice.toString(),
    retopupPrice: retopupPrice.toString(),
    directIncome: directIncome.toString(),
    companyFee: companyFee.toString(),
    tokenDecimals: tokenDecimals.toString(),
    deploymentTxHash: mlmSystem.deploymentTransaction()?.hash || "unknown",
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

  // Step 5: Display important information
  console.log("\n" + "=".repeat(80));
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(80));
  
  console.log("\n📋 Contract Addresses:");
  console.log("   MLMSystem Contract:", contractAddress);
  console.log("   Token Address:", tokenAddress, isMockToken ? "(Mock Token)" : "");
  console.log("   Company Wallet:", companyWallet);
  
  console.log("\n🔍 View on BSCScan Testnet:");
  console.log("   Contract:", `https://testnet.bscscan.com/address/${contractAddress}`);
  console.log("   Token:", `https://testnet.bscscan.com/address/${tokenAddress}`);
  console.log("   Transaction:", `https://testnet.bscscan.com/tx/${mlmSystem.deploymentTransaction()?.hash}`);
  
  console.log("\n📋 Frontend Configuration (.env.local):\n");
  console.log("NEXT_PUBLIC_CONTRACT_ADDRESS=" + contractAddress);
  console.log("NEXT_PUBLIC_TOKEN_ADDRESS=" + tokenAddress);
  console.log("NEXT_PUBLIC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/");
  console.log("NEXT_PUBLIC_CHAIN_ID=97");
  console.log("NEXT_PUBLIC_API_URL=YOUR_API_URL");
  
  console.log("\n🔐 Verify Contract on BSCScan:");
  console.log("   npx hardhat verify --network bscTestnet \\");
  console.log(`     ${contractAddress} \\`);
  console.log(`     ${tokenAddress} \\`);
  console.log(`     ${companyWallet}`);
  
  if (isMockToken) {
    console.log("\n⚠️  IMPORTANT NOTES:");
    console.log("   1. You deployed a MOCK token for testing");
    console.log("   2. To mint test tokens, call the mint() function on the token contract");
    console.log("   3. For production, use the real WBNB token address");
    console.log("   4. WBNB Testnet Address: 0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd");
  }
  
  console.log("\n📝 Next Steps:");
  console.log("1. ✅ Copy the frontend configuration to Frontend/.env.local");
  console.log("2. 🔍 Verify the contract on BSCScan (optional but recommended)");
  console.log("3. 🧪 Test the contract functions on testnet");
  console.log("4. 📱 Update your frontend to connect to BSC Testnet");
  console.log("5. ⚠️  Test thoroughly before considering mainnet deployment");
  
  console.log("\n" + "=".repeat(80));
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
    
    process.exit(1);
  });

