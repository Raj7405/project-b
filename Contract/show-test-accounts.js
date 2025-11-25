const fs = require('fs');

/**
 * Script to display all test accounts with private keys for MetaMask import
 */
function main() {
  const accountsFile = './test-accounts.json';
  
  if (!fs.existsSync(accountsFile)) {
    console.log("\n❌ No test accounts found!");
    console.log("   Run 'npm run generate:accounts' first to create accounts.\n");
    process.exit(1);
  }

  const accounts = JSON.parse(fs.readFileSync(accountsFile, 'utf8'));
  
  if (accounts.length === 0) {
    console.log("\n❌ No accounts in test-accounts.json\n");
    process.exit(1);
  }

  console.log("\n" + "=".repeat(80));
  console.log("🔑 ALL TEST ACCOUNTS - PRIVATE KEYS FOR METAMASK");
  console.log("=".repeat(80));
  console.log(`\n📋 Total accounts: ${accounts.length}\n`);

  accounts.forEach((account, index) => {
    console.log("─".repeat(80));
    console.log(`\nAccount #${account.index || index + 1}:`);
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
  console.log("\n⚠️  WARNING: Never share or commit these private keys!\n");
}

main();

