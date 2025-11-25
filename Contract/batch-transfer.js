const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🪙 Batch Token Transfer Tool\n");

  // List of accounts to transfer to
  const accounts = [
    { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", name: "Account #1" },
    { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", name: "Account #2" },
    { address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", name: "Account #3" },
    { address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", name: "Account #4" },
    { address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", name: "Account #5" },
    { address: "0x976EA74026E726554dB657fA54763abd0C3a0aa9", name: "Account #6" },
    { address: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955", name: "Account #7" },
    { address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", name: "Account #8" },
    { address: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720", name: "Account #9" },
    { address: "0xBcd4042DE499D14e55001CcbB24a551F3b954096", name: "Account #10" },
    { address: "0x71bE63f3384f5fb98995898A86B02Fb2426c5788", name: "Account #11" },
    { address: "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a", name: "Account #12" },
    { address: "0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec", name: "Account #13" },
    { address: "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097", name: "Account #14" },
    { address: "0xcd3B766CCDd6AE721141F452C550Ca635964ce71", name: "Account #15" },
    { address: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30", name: "Account #16" },
    { address: "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E", name: "Account #17" },
    { address: "0xdD2FD4581271e230360230F9337D5c0430Bf44C0", name: "Account #18" },
    { address: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199", name: "Account #19" }
  ];

  const amountToTransfer = "500"; // 500 tokens per account

  // Get deployment info
  const deploymentPath = path.join(__dirname, 'deployments', 'localhost-latest.json');
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const tokenAddress = deployment.tokenAddress;

  const Token = await hre.ethers.getContractAt("IERC20", tokenAddress);
  const [deployer] = await hre.ethers.getSigners();

  console.log("📋 Transfer Details:");
  console.log("   From:", deployer.address);
  console.log("   Amount per account:", amountToTransfer, "tokens");
  console.log("   Total accounts:", accounts.length);
  console.log("   Total tokens:", parseFloat(amountToTransfer) * accounts.length, "tokens\n");

  // Check deployer balance
  const deployerBalance = await Token.balanceOf(deployer.address);
  console.log("💰 Deployer balance:", hre.ethers.formatUnits(deployerBalance, 18), "tokens\n");

  const amountInWei = hre.ethers.parseUnits(amountToTransfer, 18);
  const totalRequired = amountInWei * BigInt(accounts.length);

  if (deployerBalance < totalRequired) {
    console.error("❌ Insufficient balance! Need:", hre.ethers.formatUnits(totalRequired, 18), "tokens");
    process.exit(1);
  }

  console.log("🚀 Starting batch transfer...\n");

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    try {
      // Check current balance
      const currentBalance = await Token.balanceOf(account.address);
      
      console.log(`[${i + 1}/${accounts.length}] ${account.name}`);
      console.log(`   Address: ${account.address}`);
      console.log(`   Current balance: ${hre.ethers.formatUnits(currentBalance, 18)} tokens`);
      
      // Transfer
      const tx = await Token.connect(deployer).transfer(account.address, amountInWei);
      await tx.wait();
      
      // Check new balance
      const newBalance = await Token.balanceOf(account.address);
      console.log(`   ✅ Transferred! New balance: ${hre.ethers.formatUnits(newBalance, 18)} tokens\n`);
      
      successCount++;
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}\n`);
      failCount++;
    }
  }

  console.log("================================================================================");
  console.log("📊 Batch Transfer Summary:");
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📦 Total: ${accounts.length}`);
  console.log("================================================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });

