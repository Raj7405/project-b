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

  // Step 1: Deploy Mock BEP-20 Token (simulating BUSD on BSC)
  console.log("📝 Step 1: Deploying Mock BEP-20 Token (simulating BUSD)...");
  const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
  const token = await ERC20Mock.deploy(
    "Test BUSD",
    "TBUSD",
    deployer.address,
    hre.ethers.parseUnits("1000000", 18) // 1 million tokens initial supply
  );
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ Mock BEP-20 Token deployed to:", tokenAddress);

  // Step 2: Get company wallet address
  const companyWallet = process.env.COMPANY_WALLET || deployer.address;
  console.log("\n📝 Step 2: Company Wallet:", companyWallet);

  // Step 3: Deploy DecentReferral Contract
  console.log("\n📝 Step 3: Deploying DecentReferral Contract...");
  
  const packageAmount = hre.ethers.parseUnits("20", 18); // 20 tokens
  const reTopupAmount = hre.ethers.parseUnits("40", 18); // 40 tokens

  console.log("Package Amount:", hre.ethers.formatUnits(packageAmount, 18), "tokens");
  console.log("Re-Topup Amount:", hre.ethers.formatUnits(reTopupAmount, 18), "tokens");

  const DecentReferral = await hre.ethers.getContractFactory("DecentReferral");
  const decentReferral = await DecentReferral.deploy(
    tokenAddress,
    companyWallet,
    packageAmount,
    reTopupAmount
  );

  await decentReferral.waitForDeployment();
  const contractAddress = await decentReferral.getAddress();
  
  console.log("✅ DecentReferral deployed to:", contractAddress);

  // Step 4: Get deployer token balance
  const deployerBalance = await token.balanceOf(deployer.address);
  console.log("\n📝 Step 4: Deployer token balance:", hre.ethers.formatUnits(deployerBalance, 18), "TBUSD");

  // Step 5: Save deployment info
  console.log("\n📝 Step 5: Saving deployment information...");
  
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    tokenAddress: tokenAddress,
    deployer: deployer.address,
    companyWallet: companyWallet,
    packageAmount: packageAmount.toString(),
    reTopupAmount: reTopupAmount.toString(),
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

