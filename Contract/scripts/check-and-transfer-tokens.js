const hre = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("\n🔍 Checking token contract and transferring tokens...\n");

  // Get token address from latest deployment
  let tokenAddress;
  try {
    const fs = require('fs');
    const deploymentFile = './deployments/localhost-crypto-mlm.json';
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    tokenAddress = deploymentInfo.tokenAddress;
    console.log("📋 Using token address from deployment:", tokenAddress);
  } catch (e) {
    tokenAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    console.log("📋 Using default token address:", tokenAddress);
  }
  
  // Check if contract exists
  const code = await hre.ethers.provider.getCode(tokenAddress);
  if (code === "0x") {
    console.log("❌ No contract at token address. Deploying new token...");
    
    // Deploy new token
    const [deployer] = await hre.ethers.getSigners();
    const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
    const token = await ERC20Mock.deploy(
      "Test WBNB",
      "TWBNB",
      deployer.address,
      hre.ethers.parseUnits("1000000", 18)
    );
    await token.waitForDeployment();
    const newTokenAddress = await token.getAddress();
    console.log(`✅ New token deployed to: ${newTokenAddress}`);
    console.log("⚠️  Update your CONTRACT_ADDRESS and TOKEN_ADDRESS in backend .env");
    return;
  }

  console.log("✅ Token contract found at:", tokenAddress);

  // Connect to token
  const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
  const token = ERC20Mock.attach(tokenAddress);

  // Get accounts
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[0];
  
  try {
    const decimals = await token.decimals();
    const symbol = await token.symbol();
    const deployerBalance = await token.balanceOf(deployer.address);
    
    console.log(`\n📊 Token Info:`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Decimals: ${decimals}`);
    console.log(`   Deployer balance: ${hre.ethers.formatUnits(deployerBalance, decimals)} ${symbol}\n`);

    if (deployerBalance < hre.ethers.parseUnits("100", decimals)) {
      console.log("⚠️  Deployer has insufficient tokens to transfer");
      return;
    }

    // Transfer tokens to test accounts (accounts 1-5)
    const transferAmount = hre.ethers.parseUnits("500", decimals);
    const minBalance = hre.ethers.parseUnits("100", decimals);

    console.log("📤 Transferring tokens to test accounts...\n");
    const accountsToFund = Math.min(20, accounts.length - 1);
    
    for (let i = 1; i <= accountsToFund; i++) {
      const account = accounts[i];
      const currentBalance = await token.balanceOf(account.address);
      
      if (currentBalance < minBalance) {
        try {
          console.log(`💰 Transferring to account #${i} (${account.address})...`);
          const tx = await token.transfer(account.address, transferAmount);
          await tx.wait();
          const newBalance = await token.balanceOf(account.address);
          console.log(`✅ Account #${i} now has ${hre.ethers.formatUnits(newBalance, decimals)} ${symbol}\n`);
        } catch (error) {
          console.error(`❌ Failed to transfer: ${error.message}\n`);
        }
      } else {
        const balanceFormatted = hre.ethers.formatUnits(currentBalance, decimals);
        console.log(`⏭️  Account #${i} already has ${balanceFormatted} ${symbol}\n`);
      }
    }

    // Show all account balances
    console.log("\n📊 Account Balances:");
    console.log("=" .repeat(80));
    for (let i = 0; i <= accountsToFund; i++) {
      const balance = await token.balanceOf(accounts[i].address);
      const label = i === 0 ? "Deployer" : `Test Account #${i}`;
      console.log(`${label.padEnd(20)} ${accounts[i].address} => ${hre.ethers.formatUnits(balance, decimals)} ${symbol}`);
    }
    console.log("=" .repeat(80));
    
    console.log("\n✅ Token distribution complete!");
    console.log("\n💡 You can now use these accounts for testing:");
    console.log("   - Import account #1 private key into MetaMask");
    console.log("   - Approve tokens for contract");
    console.log("   - Register via backend API");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("\n💡 The token contract might not be compatible.");
    console.error("   Try deploying a fresh token or check the contract address.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

