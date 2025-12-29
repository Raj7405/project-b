const hre = require("hardhat");
require('dotenv').config();
const fs = require('fs');

/**
 * Deploy PaymentReconciliation Contract to Local Network (Hardhat Node)
 * 
 * This contract uses:
 * - USDT (BEP-20) for fees/payments
 * - BNB (native token) for gas fees
 * 
 * Usage:
 *   1. Start local node: npx hardhat node
 *   2. Run: npx hardhat run scripts/deploy-payment-reconciliation-local.js --network localhost
 */
async function main() {
  console.log("\n🚀 Deploying PaymentReconciliation Contract (USDT Fees, BNB Gas)...\n");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "BNB\n");

  // Step 1: Get or deploy USDT token
  let usdtTokenAddress = process.env.USDT_TOKEN_ADDRESS;
  let isMockToken = false;
  
  if (!usdtTokenAddress || usdtTokenAddress === "0xYOUR_USDT_ADDRESS") {
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
    console.log("   ⚠️  This is a MOCK token for local testing only!");
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
      console.log("   (Token info not available - using provided address)");
    }
  }

  // Step 2: Get wallet addresses
  const companyWallet = process.env.COMPANY_WALLET || deployer.address;
  const backendWallet = process.env.BACKEND_WALLET || deployer.address;
  
  console.log("\n📝 Step 2: Wallet Configuration:");
  console.log("   Company Wallet:", companyWallet);
  console.log("   Backend Wallet:", backendWallet);

  // Step 3: Deploy PaymentReconciliation
  console.log("\n📝 Step 3: Deploying PaymentReconciliation Contract...");
  const PaymentReconciliation = await hre.ethers.getContractFactory("PaymentReconciliation");
  const contract = await PaymentReconciliation.deploy(
    usdtTokenAddress,
    companyWallet,
    backendWallet
  );
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log("✅ PaymentReconciliation deployed to:", contractAddress);

  // Verify deployment
  const entryPrice = await contract.entryPrice();
  const retopupPrice = await contract.retopupPrice();
  const tokenDecimals = await contract.tokenDecimals();
  
  console.log("\n📋 Contract Configuration:");
  console.log("   Entry Price:", hre.ethers.formatUnits(entryPrice, tokenDecimals), "USDT");
  console.log("   Retopup Price:", hre.ethers.formatUnits(retopupPrice, tokenDecimals), "USDT");
  console.log("   Token Decimals:", tokenDecimals.toString());

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractName: "PaymentReconciliation",
    contractAddress,
    usdtTokenAddress,
    isMockToken,
    companyWallet,
    backendWallet,
    entryPrice: entryPrice.toString(),
    retopupPrice: retopupPrice.toString(),
    tokenDecimals: tokenDecimals.toString(),
    timestamp: new Date().toISOString()
  };
  
  const deploymentsDir = './deployments';
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  fs.writeFileSync(
    `${deploymentsDir}/${hre.network.name}-payment-reconciliation.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n" + "=".repeat(80));
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(80));
  console.log("\n📋 Update your backend .env file:\n");
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`TOKEN_ADDRESS=${usdtTokenAddress}`);
  console.log(`USDT_TOKEN_ADDRESS=${usdtTokenAddress}`);
  console.log(`BACKEND_PRIVATE_KEY=<private_key_of_backend_wallet>`);
  console.log(`COMPANY_WALLET_ADDRESS=${companyWallet}`);
  console.log("\n💡 Note: Gas fees are paid in BNB (native token)");
  console.log("💡 Note: Payments/fees are in USDT (BEP-20 token)");
  console.log("\n" + "=".repeat(80));
  
  if (isMockToken) {
    console.log("\n⚠️  MOCK TOKEN DEPLOYED");
    console.log("=".repeat(80));
    console.log("You deployed a MOCK USDT token for local testing.");
    console.log("To mint test USDT tokens, call the mint() function on the token contract.");
    console.log("Token Address:", usdtTokenAddress);
    console.log("\n" + "=".repeat(80));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

