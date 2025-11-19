const hre = require("hardhat");
require('dotenv').config();
const fs = require('fs');

async function main() {
  console.log("\n🚀 Starting Local BSC Simulation Deployment...");
  console.log("   (Simulating BNB Smart Chain behavior on local Hardhat network)\n");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "BNB (simulated)\n");

  // Step 1: Deploy Mock BEP-20 Token (simulating WBNB on BSC)
  console.log("📝 Step 1: Deploying Mock BEP-20 Token (simulating WBNB)...");
  const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
  const token = await ERC20Mock.deploy(
    "Test WBNB",
    "TWBNB",
    deployer.address,
    hre.ethers.parseUnits("1000000", 18) // 1 million tokens initial supply
  );
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ Mock BEP-20 Token deployed to:", tokenAddress);

  // Step 2: Get company wallet address
  const companyWallet = process.env.COMPANY_WALLET || deployer.address;
  console.log("\n📝 Step 2: Company Wallet:", companyWallet);

  // Step 3: Deploy MLMSystem Contract
  console.log("\n📝 Step 3: Deploying MLMSystem Contract...");
  
  const MLMSystem = await hre.ethers.getContractFactory("MLMSystem");
  const mlmSystem = await MLMSystem.deploy(
    tokenAddress,
    companyWallet
  );

  await mlmSystem.waitForDeployment();
  const contractAddress = await mlmSystem.getAddress();
  
  console.log("✅ MLMSystem deployed to:", contractAddress);

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

  // Step 4: Get deployer token balance
  const deployerBalance = await token.balanceOf(deployer.address);
  console.log("\n📝 Step 4: Deployer token balance:", hre.ethers.formatUnits(deployerBalance, 18), "TWBNB");

  // Step 5: Save deployment info
  console.log("\n📝 Step 5: Saving deployment information...");
  
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    tokenAddress: tokenAddress,
    deployer: deployer.address,
    companyWallet: companyWallet,
    entryPrice: entryPrice.toString(),
    retopupPrice: retopupPrice.toString(),
    directIncome: directIncome.toString(),
    companyFee: companyFee.toString(),
    tokenDecimals: tokenDecimals.toString(),
    timestamp: new Date().toISOString()
  };
  
  const deploymentsDir = './deployments';
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  const deploymentFile = `${deploymentsDir}/${hre.network.name}-latest.json`;
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("✅ Deployment info saved to", deploymentFile);

  // Step 6: Display Frontend .env.local configuration
  console.log("\n" + "=".repeat(80));
  console.log("🎉 DEPLOYMENT SUCCESSFUL! (Local BSC Simulation)");
  console.log("=".repeat(80));
  console.log("\n📋 Frontend Configuration (.env.local):\n");
  console.log("NEXT_PUBLIC_CONTRACT_ADDRESS=" + contractAddress);
  console.log("NEXT_PUBLIC_TOKEN_ADDRESS=" + tokenAddress);
  console.log("NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545");
  console.log("NEXT_PUBLIC_API_URL=http://localhost:5000/api");
  console.log("\n" + "=".repeat(80));
  
  console.log("\n📝 Next Steps:");
  console.log("1. ✅ Copy the above configuration to Frontend/.env.local");
  console.log("2. ⚠️  Configure MetaMask for Local BSC Simulation:");
  console.log("   - Network: Hardhat Local (simulating BSC)");
  console.log("   - RPC URL: http://127.0.0.1:8545");
  console.log("   - Chain ID: 31337");
  console.log("   - Currency Symbol: BNB (simulated)");
  console.log("3. 🔑 Import a test account into MetaMask (see Hardhat node output for private keys)");
  console.log("4. 🗄️  Set up PostgreSQL and run backend:");
  console.log("   - cd backend-express");
  console.log("   - npm install");
  console.log("   - npm run db:migrate");
  console.log("   - npm run dev");
  console.log("5. 🚀 Start the frontend: cd Frontend && npm run dev");
  console.log("6. 🎨 Open http://localhost:3000 in your browser");
  console.log("\n" + "=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

