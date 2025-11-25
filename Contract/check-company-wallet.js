const hre = require("hardhat");
require('dotenv').config();
const fs = require('fs');
const path = require('path');

/**
 * Script to check company wallet balance and transactions
 * This is SAFE - only reads data, doesn't need private key
 */

async function main() {
  console.log("\n🔍 Checking Company Wallet Status...\n");

  // Get contract address from deployment or env
  const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  if (!contractAddress) {
    // Try to read from deployment file
    const networkName = hre.network.name;
    const deploymentFile = path.join(__dirname, 'deployments', `${networkName}-latest.json`);
    
    if (fs.existsSync(deploymentFile)) {
      const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
      contractAddress = deployment.contractAddress;
      console.log(`📝 Found contract address from deployment file: ${contractAddress}`);
    }
  }
  
  if (!contractAddress) {
    console.log("⚠️  No contract address found!");
    console.log("   Options:");
    console.log("   1. Set CONTRACT_ADDRESS in .env file");
    console.log("   2. Deploy contract first: npx hardhat run deploy-local.js --network localhost");
    console.log("   3. Pass address as argument");
    return;
  }

  // Check if contract exists at this address
  const code = await hre.ethers.provider.getCode(contractAddress);
  if (code === "0x") {
    console.log(`❌ No contract found at address: ${contractAddress}`);
    console.log("   Make sure:");
    console.log("   1. Hardhat node is running");
    console.log("   2. Contract is deployed to this address");
    console.log("   3. You're connected to the correct network");
    return;
  }

  console.log(`📋 Contract Address: ${contractAddress}`);
  console.log("   ✅ Contract code found at this address\n");

  const contract = await hre.ethers.getContractAt("MLMSystem", contractAddress);
  
  try {
    const companyWallet = await contract.companyWallet();
    console.log("📋 Company Wallet Address:", companyWallet);

    // Get token address
    const tokenAddress = await contract.usdtToken();
    
    // Use minimal ABI to avoid IERC20 ambiguity
    const tokenABI = [
      "function balanceOf(address account) external view returns (uint256)",
      "function decimals() external view returns (uint8)",
      "function symbol() external view returns (string)",
      "function name() external view returns (string)"
    ];
    const token = new hre.ethers.Contract(tokenAddress, tokenABI, hre.ethers.provider);

    // Check token balance
    const balance = await token.balanceOf(companyWallet);
    const decimals = await contract.tokenDecimals();
    const formattedBalance = hre.ethers.formatUnits(balance, decimals);

    console.log("\n💰 Company Wallet Token Balance:", formattedBalance, "tokens");
    console.log("💰 Raw Balance:", balance.toString());

    // Check contract's token balance (should be receiving fees)
    const contractBalance = await token.balanceOf(contractAddress);
    const formattedContractBalance = hre.ethers.formatUnits(contractBalance, decimals);
    
    console.log("\n📦 Contract Token Balance:", formattedContractBalance, "tokens");
    console.log("   (This is what the contract holds before distribution)");

    // Get contract configuration
    const companyFee = await contract.companyFee();
    const entryPrice = await contract.entryPrice();
    
    console.log("\n📊 Fee Structure:");
    console.log("   Entry Price:", hre.ethers.formatUnits(entryPrice, decimals), "tokens");
    console.log("   Company Fee per Registration:", hre.ethers.formatUnits(companyFee, decimals), "tokens");

    // Calculate expected fees (if we know registrations)
    console.log("\n💡 To see transactions:");
    if (hre.network.name === 'localhost' || hre.network.name === 'hardhat') {
      console.log("   - Check Hardhat node logs for transaction details");
      console.log("   - Or use: npx hardhat node --verbose");
    } else {
      console.log(`   - View on explorer: https://testnet.bscscan.com/address/${companyWallet}`);
      console.log(`   - Filter by token: ${tokenAddress}`);
    }

    console.log("\n✅ Check complete!");
  } catch (error) {
    console.error("\n❌ Error calling contract functions:");
    console.error("   This might mean:");
    console.error("   1. Contract ABI doesn't match the deployed contract");
    console.error("   2. Contract wasn't fully deployed");
    console.error("   3. Network connection issue");
    console.error("\n   Error details:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

