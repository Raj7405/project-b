const hre = require("hardhat");
require('dotenv').config();
const fs = require('fs');

/**
 * Script to generate demo test accounts without restarting the chain
 * This creates new wallet accounts, funds them with ETH, and optionally transfers tokens
 */
async function main() {
  console.log("\n🔑 Generating Demo Test Accounts...\n");

  // Get number of accounts to generate (default: 5)
  const numAccounts = process.argv[2] ? parseInt(process.argv[2]) : 5;
  console.log(`📝 Generating ${numAccounts} test accounts...\n`);

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("💰 Deployer account:", deployer.address);
  
  const deployerBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer ETH balance:", hre.ethers.formatEther(deployerBalance), "ETH\n");

  // Load existing accounts if file exists
  const accountsFile = './test-accounts.json';
  let existingAccounts = [];
  if (fs.existsSync(accountsFile)) {
    existingAccounts = JSON.parse(fs.readFileSync(accountsFile, 'utf8'));
    console.log(`📋 Found ${existingAccounts.length} existing accounts in ${accountsFile}\n`);
  }

  // Generate new accounts
  const newAccounts = [];
  const fundingAmount = hre.ethers.parseEther("100"); // 100 ETH per account

  console.log("🔨 Creating new wallet accounts...\n");
  for (let i = 0; i < numAccounts; i++) {
    // Create random wallet
    const wallet = hre.ethers.Wallet.createRandom();
    const accountInfo = {
      index: existingAccounts.length + i + 1,
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic ? wallet.mnemonic.phrase : null
    };
    
    newAccounts.push(accountInfo);
    console.log(`✅ Account #${accountInfo.index}: ${accountInfo.address}`);
  }

  // Fund accounts with ETH
  console.log("\n💸 Funding accounts with ETH...\n");
  for (const account of newAccounts) {
    try {
      // Use hardhat_setBalance to instantly fund accounts (no transaction needed)
      await hre.ethers.provider.send("hardhat_setBalance", [
        account.address,
        hre.ethers.toBeHex(fundingAmount)
      ]);
      console.log(`✅ Funded ${account.address} with 100 ETH`);
    } catch (error) {
      console.error(`❌ Failed to fund ${account.address}:`, error.message);
    }
  }

  // Transfer tokens if token address is available
  const deploymentsDir = './deployments';
  let tokenAddress = null;
  
  try {
    const deploymentFile = `${deploymentsDir}/localhost-latest.json`;
    if (fs.existsSync(deploymentFile)) {
      const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
      tokenAddress = deploymentInfo.tokenAddress;
    }
  } catch (e) {
    // Token address not found, skip token transfer
  }

  if (tokenAddress) {
    try {
      // Check if contract code exists at this address
      const code = await hre.ethers.provider.getCode(tokenAddress);
      if (code === "0x") {
        console.log(`\n⚠️  No contract found at token address: ${tokenAddress}`);
        console.log("⏭️  Skipping token transfer. Make sure contracts are deployed first.\n");
      } else {
        console.log("\n🪙 Transferring tokens to new accounts...\n");
        const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
        const token = ERC20Mock.attach(tokenAddress);
        
        // Try to get decimals, default to 18 if it fails
        let tokenDecimals = 18;
        try {
          tokenDecimals = await token.decimals();
          console.log(`📊 Token decimals: ${tokenDecimals}`);
        } catch (error) {
          console.log(`⚠️  Could not read token decimals, using default: 18`);
        }
        
        const tokenAmount = hre.ethers.parseUnits("1000", tokenDecimals);

        for (const account of newAccounts) {
          try {
            const tx = await token.transfer(account.address, tokenAmount);
            await tx.wait();
            console.log(`✅ Transferred 1000 tokens to ${account.address}`);
          } catch (error) {
            console.error(`❌ Failed to transfer tokens to ${account.address}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.log(`\n⚠️  Error connecting to token contract: ${error.message}`);
      console.log("⏭️  Skipping token transfer.\n");
    }
  } else {
    console.log("\n⏭️  Token address not found. Skipping token transfer.\n");
  }

  // Merge with existing accounts
  const allAccounts = [...existingAccounts, ...newAccounts];

  // Save all accounts to file
  fs.writeFileSync(accountsFile, JSON.stringify(allAccounts, null, 2));
  console.log(`\n💾 Saved ${allAccounts.length} accounts to ${accountsFile}\n`);

  // Display summary
  console.log("=".repeat(80));
  console.log("📊 ACCOUNT GENERATION SUMMARY");
  console.log("=".repeat(80));
  console.log(`\n✅ Generated ${newAccounts.length} new accounts`);
  console.log(`📋 Total accounts: ${allAccounts.length}\n`);

  // Display private keys prominently for MetaMask import
  console.log("=".repeat(80));
  console.log("🔑 PRIVATE KEYS FOR METAMASK IMPORT");
  console.log("=".repeat(80));
  console.log("\n📝 Copy these private keys to import into MetaMask:\n");
  
  newAccounts.forEach((account, index) => {
    console.log("─".repeat(80));
    console.log(`\nAccount #${account.index}:`);
    console.log(`Address:     ${account.address}`);
    console.log(`\n🔐 PRIVATE KEY (Copy this for MetaMask):`);
    console.log(`${account.privateKey}\n`);
    if (account.mnemonic) {
      console.log(`Mnemonic:     ${account.mnemonic}\n`);
    }
  });

  console.log("=".repeat(80));
  console.log("📝 HOW TO IMPORT TO METAMASK:");
  console.log("=".repeat(80));
  console.log("\n1. Open MetaMask extension");
  console.log("2. Click the account icon (top right) → 'Import Account'");
  console.log("3. Select 'Private Key' option");
  console.log("4. Paste one of the private keys from above");
  console.log("5. Click 'Import'");
  console.log("6. Repeat steps 2-5 for each account you want to import");
  console.log("\n⚠️  WARNING: These are test accounts with real private keys.");
  console.log("   Never share or commit these keys to version control!\n");

  console.log("=".repeat(80));
  console.log("💡 ADDITIONAL INFO:");
  console.log("=".repeat(80));
  console.log(`\n📁 All accounts saved to: ${accountsFile}`);
  console.log(`\n💻 Use in scripts:`);
  console.log(`   const accounts = require('./test-accounts.json');`);
  console.log(`   const wallet = new ethers.Wallet(accounts[0].privateKey, provider);\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Account generation failed:");
    console.error(error);
    process.exit(1);
  });

