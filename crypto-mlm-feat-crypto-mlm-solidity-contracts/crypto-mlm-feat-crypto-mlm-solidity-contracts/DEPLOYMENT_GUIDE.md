# 🚀 Crypto MLM Platform - Deployment Guide

This guide covers everything you need to deploy and run the Crypto MLM Platform on different networks.

---

## 📑 Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Environment Variables Configuration](#environment-variables-configuration)
3. [BSC Testnet Deployment](#bsc-testnet-deployment)
4. [BSC Mainnet Deployment](#bsc-mainnet-deployment)
5. [MetaMask Configuration](#metamask-configuration)
6. [Troubleshooting](#troubleshooting)

---

## 🏠 Local Development Setup

### Prerequisites
- Node.js (v16 or v18 recommended, v20+ may have compatibility warnings)
- npm or yarn
- MetaMask browser extension
- Git

### Step 1: Install Dependencies

```powershell
# Install Contract dependencies
cd Contract
npm install

# Install Frontend dependencies
cd ../Frontend
npm install
```

### Step 2: Configure Environment Variables

#### Contract Environment (Contract/.env)

Create a file named `.env` in the `Contract` directory:

```env
# Local Hardhat Network Configuration
TOKEN_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
COMPANY_WALLET=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

**Note:** These are default Hardhat addresses and are automatically used for local development.

#### Frontend Environment (Frontend/.env.local)

Create a file named `.env.local` in the `Frontend` directory:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
NEXT_PUBLIC_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
```

**⚠️ These values will be updated after deployment!**

### Step 3: Start Hardhat Local Node

Open a terminal and run:

```powershell
cd Contract
npx hardhat node
```

**Keep this terminal running!** This starts a local blockchain at `http://127.0.0.1:8545`

You'll see output showing 20 test accounts with their addresses and private keys. Example:
```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**📝 Save at least one private key** - you'll need it to import into MetaMask!

### Step 4: Deploy Smart Contracts

Open a **new terminal** (keep the Hardhat node running in the first one):

```powershell
cd Contract
npx hardhat run deploy-local.js --network localhost
```

You'll see output like:

```
🎉 DEPLOYMENT SUCCESSFUL!

📋 Frontend Configuration (.env.local):

NEXT_PUBLIC_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
NEXT_PUBLIC_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
```

### Step 5: Update Frontend Environment Variables

Copy the values from the deployment output and update `Frontend/.env.local`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=<YOUR_DEPLOYED_CONTRACT_ADDRESS>
NEXT_PUBLIC_TOKEN_ADDRESS=<YOUR_DEPLOYED_TOKEN_ADDRESS>
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
```

### Step 6: Configure MetaMask for Local Network

1. Open MetaMask
2. Click the network dropdown (top center)
3. Click "Add Network" or "Add Network Manually"
4. Enter the following details:
   - **Network Name:** Hardhat Local
   - **New RPC URL:** http://127.0.0.1:8545
   - **Chain ID:** 31337
   - **Currency Symbol:** ETH
5. Click "Save"

### Step 7: Import Test Account to MetaMask

1. In MetaMask, click your account icon (top right)
2. Select "Import Account"
3. Paste one of the private keys from Step 3
4. Click "Import"

**💡 Tip:** Use Account #0 as it has the deployed tokens and is the contract owner.

### Step 8: Start Frontend Development Server

```powershell
cd Frontend
npm run dev
```

The frontend will be available at **http://localhost:3000**

### Step 9: Test the Application

1. Open http://localhost:3000 in your browser
2. Connect your MetaMask wallet
3. You should see the dashboard with your test tokens
4. Try registering a user, doing re-topup, etc.

---

## 🔧 Environment Variables Configuration

### What Each Variable Means

#### Contract/.env

| Variable | Description | How to Get the Value |
|----------|-------------|---------------------|
| `TOKEN_ADDRESS` | Address of the BEP-20 token used for payments | **Local:** Deployed by deploy-local.js<br>**Testnet:** Use test BUSD: `0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee`<br>**Mainnet:** Real BUSD: `0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56` |
| `COMPANY_WALLET` | Wallet that receives company fees | Your wallet address (use a multisig wallet for production!) |
| `BSC_TESTNET_RPC` | RPC endpoint for BSC Testnet | Default: `https://data-seed-prebsc-1-s1.binance.org:8545/` |
| `BSC_MAINNET_RPC` | RPC endpoint for BSC Mainnet | Default: `https://bsc-dataseed.binance.org/` |
| `DEPLOYER_PRIVATE_KEY` | Private key of the deployer wallet | **⚠️ NEVER COMMIT THIS!** Export from MetaMask |

#### Frontend/.env.local

| Variable | Description | How to Get the Value |
|----------|-------------|---------------------|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Address of deployed DecentReferral contract | Shown in deployment output or check `Contract/deployments/` |
| `NEXT_PUBLIC_TOKEN_ADDRESS` | Address of the token contract | Same as `TOKEN_ADDRESS` in Contract/.env |
| `NEXT_PUBLIC_RPC_URL` | RPC endpoint for blockchain connection | **Local:** `http://127.0.0.1:8545`<br>**Testnet:** `https://data-seed-prebsc-1-s1.binance.org:8545/`<br>**Mainnet:** `https://bsc-dataseed.binance.org/` |

---

## 🧪 BSC Testnet Deployment

### Prerequisites
- MetaMask with BNB for gas fees (get free testnet BNB from https://testnet.bnbchain.org/faucet-smart)
- Your deployer wallet private key

### Step 1: Update Contract/.env

```env
# BSC Testnet Configuration
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
DEPLOYER_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
TOKEN_ADDRESS=0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee
COMPANY_WALLET=YOUR_COMPANY_WALLET_ADDRESS
```

**How to get DEPLOYER_PRIVATE_KEY:**
1. Open MetaMask
2. Click the three dots menu
3. Account Details → Export Private Key
4. Enter your password
5. Copy the private key

**⚠️ SECURITY WARNING:** Never commit this file to git! It's already in .gitignore.

### Step 2: Get Testnet BNB

1. Visit https://testnet.bnbchain.org/faucet-smart
2. Connect your wallet
3. Request testnet BNB (you need ~0.1 BNB for deployment)

### Step 3: Deploy to BSC Testnet

```powershell
cd Contract
npx hardhat run scripts --network bscTestnet
```

### Step 4: Update Frontend/.env.local

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=<DEPLOYED_CONTRACT_ADDRESS_FROM_OUTPUT>
NEXT_PUBLIC_TOKEN_ADDRESS=0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee
NEXT_PUBLIC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
```

### Step 5: Configure MetaMask for BSC Testnet

1. Open MetaMask
2. Add Network with these details:
   - **Network Name:** BSC Testnet
   - **New RPC URL:** https://data-seed-prebsc-1-s1.binance.org:8545/
   - **Chain ID:** 97
   - **Currency Symbol:** BNB
   - **Block Explorer:** https://testnet.bscscan.com

### Step 6: Verify Contract on BSCScan (Optional but Recommended)

```powershell
npx hardhat verify --network bscTestnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

---

## 🌐 BSC Mainnet Deployment

### ⚠️ CRITICAL SECURITY CHECKLIST

Before deploying to mainnet:

- [ ] Smart contract has been professionally audited
- [ ] All tests pass successfully
- [ ] Extensively tested on testnet
- [ ] Company wallet is a multisig wallet (Gnosis Safe recommended)
- [ ] Private keys stored securely (hardware wallet preferred)
- [ ] Emergency pause mechanism tested
- [ ] Team trained on contract ownership management
- [ ] Monitoring and alerting systems in place

### Step 1: Update Contract/.env

```env
# BSC Mainnet Configuration
BSC_MAINNET_RPC=https://bsc-dataseed.binance.org/
DEPLOYER_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
TOKEN_ADDRESS=0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56
COMPANY_WALLET=YOUR_MULTISIG_WALLET_ADDRESS
```

**Use Real BUSD Token:** `0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56`

### Step 2: Get Real BNB

You'll need ~0.1 BNB for deployment gas fees. Buy from exchanges like Binance, Coinbase, etc.

### Step 3: Deploy to BSC Mainnet

```powershell
cd Contract
npx hardhat run scripts --network bscMainnet
```

### Step 4: Transfer Ownership to Multisig

**IMMEDIATELY after deployment:**

```powershell
npx hardhat console --network bscMainnet
```

```javascript
const contract = await ethers.getContractAt("DecentReferral", "YOUR_CONTRACT_ADDRESS");
await contract.transferOwnership("YOUR_MULTISIG_ADDRESS");
```

### Step 5: Update Frontend/.env.local

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=<DEPLOYED_CONTRACT_ADDRESS>
NEXT_PUBLIC_TOKEN_ADDRESS=0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56
NEXT_PUBLIC_RPC_URL=https://bsc-dataseed.binance.org/
```

### Step 6: Verify Contract on BSCScan

```powershell
npx hardhat verify --network bscMainnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

---

## 🦊 MetaMask Configuration

### Network Configurations

#### Local Hardhat Network
```
Network Name: Hardhat Local
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency Symbol: ETH
```

#### BSC Testnet
```
Network Name: BSC Testnet
RPC URL: https://data-seed-prebsc-1-s1.binance.org:8545/
Chain ID: 97
Currency Symbol: BNB
Block Explorer: https://testnet.bscscan.com
```

#### BSC Mainnet
```
Network Name: BSC Mainnet
RPC URL: https://bsc-dataseed.binance.org/
Chain ID: 56
Currency Symbol: BNB
Block Explorer: https://bscscan.com
```

### Adding Token to MetaMask

After deployment, add the token to see your balance:

1. Open MetaMask
2. Click "Import tokens" at the bottom
3. Enter the token address (from NEXT_PUBLIC_TOKEN_ADDRESS)
4. Token symbol and decimals should auto-populate
5. Click "Add Custom Token"

---

## 🔍 Troubleshooting

### Frontend Stuck on "Loading"

**Cause:** Missing or incorrect environment variables

**Solution:**
1. Check that `Frontend/.env.local` exists
2. Verify addresses match deployment output
3. Restart the frontend server: `npm run dev`
4. Clear browser cache and reload

### "Cannot connect to network" Error

**Cause:** Hardhat node not running or wrong RPC URL

**Solution:**
1. Ensure Hardhat node is running: `npx hardhat node`
2. Check RPC URL in `.env.local` matches the network
3. For testnet/mainnet, check your internet connection

### MetaMask "Transaction Failed"

**Possible Causes:**
1. **Insufficient gas:** Increase gas limit in MetaMask
2. **Insufficient token balance:** Make sure you have enough tokens
3. **Not approved:** Need to approve tokens before register/retopup
4. **Wrong network:** Switch MetaMask to the correct network

**Solution:**
1. Check MetaMask is on the correct network
2. For local testing, ensure you imported an account with tokens
3. Check console for error messages

### "Nonce too high" Error

**Cause:** MetaMask nonce mismatch after restarting local network

**Solution:**
1. Open MetaMask
2. Settings → Advanced → Clear Activity Tab Data
3. Reconnect wallet

### Port 3000 Already in Use

**Solution (Windows PowerShell):**
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

### Contract Functions Not Working

**Checklist:**
1. ✅ Wallet connected to correct network
2. ✅ Contract addresses correct in `.env.local`
3. ✅ Token approved for contract spending
4. ✅ Sufficient token balance
5. ✅ Sufficient BNB for gas

---

## 📊 Contract Deployment Information

After deployment, check `Contract/deployments/<network>-latest.json`:

```json
{
  "network": "localhost",
  "contractAddress": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  "tokenAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "deployer": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "companyWallet": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "packageAmount": "20000000000000000000",
  "reTopupAmount": "40000000000000000000",
  "timestamp": "2025-10-23T06:59:10.199Z"
}
```

Use these values to update your frontend configuration.

---

## 🎯 Quick Reference: Commands

### Development
```powershell
# Start Hardhat node
cd Contract && npx hardhat node

# Deploy locally
cd Contract && npx hardhat run deploy-local.js --network localhost

# Start frontend
cd Frontend && npm run dev

# Kill process on port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

### Testing
```powershell
# Run contract tests
cd Contract && npx hardhat test

# Run specific test
cd Contract && npx hardhat test test/DecentReferral.test.js
```

### Deployment
```powershell
# Deploy to BSC Testnet
cd Contract && npx hardhat run scripts --network bscTestnet

# Deploy to BSC Mainnet
cd Contract && npx hardhat run scripts --network bscMainnet
```

---

## 📞 Support

If you encounter issues not covered in this guide:

1. Check the console for error messages
2. Review the Hardhat node output
3. Check BSCScan for transaction details (testnet/mainnet)
4. Verify all environment variables are correct

---

## 🔐 Security Best Practices

1. **Never commit `.env` files** - Already in .gitignore but double-check
2. **Use hardware wallets** for mainnet deployments
3. **Use multisig wallets** (Gnosis Safe) as contract owner
4. **Get professional audit** before mainnet deployment
5. **Monitor events** for suspicious activity
6. **Set up alerting** for large transactions
7. **Test thoroughly** on testnet first
8. **Keep private keys secure** - use password managers or hardware wallets
9. **Regular backups** of deployment information
10. **Document everything** - keep records of all deployments

---

## ✅ Checklist: Ready for Production?

- [ ] Smart contract professionally audited
- [ ] All tests passing (unit + integration)
- [ ] Tested on testnet for at least 2 weeks
- [ ] Multisig wallet set up as owner
- [ ] Emergency pause mechanism tested
- [ ] Monitoring and alerting configured
- [ ] Bug bounty program considered
- [ ] Legal compliance verified
- [ ] User documentation complete
- [ ] Support team trained
- [ ] Incident response plan ready
- [ ] Insurance considered

---

**Last Updated:** October 23, 2025
**Version:** 1.0.0

