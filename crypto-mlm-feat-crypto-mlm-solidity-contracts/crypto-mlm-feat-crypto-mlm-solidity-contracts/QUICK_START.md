# 🚀 Quick Start Guide - Your Setup is Ready!

## ✅ What's Been Done

1. ✅ **Hardhat node is running** (local blockchain at http://127.0.0.1:8545)
2. ✅ **Smart contracts deployed**
   - DecentReferral: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
   - Test Token (TST): `0x5FbDB2315678afecb367f032d93F642f64180aa3`
3. ✅ **Frontend is starting** (will be at http://localhost:3000)
4. ✅ **Environment files configured**

---

## 🦊 Configure MetaMask (3 minutes)

### Step 1: Add Hardhat Local Network

1. Open MetaMask
2. Click network dropdown (top)
3. Click "Add Network" → "Add network manually"
4. Enter these details:

```
Network Name: Hardhat Local
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency Symbol: ETH
```

5. Click "Save"

### Step 2: Import Test Account

1. Click account icon (top right) → "Import Account"
2. Paste this private key:
```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```
3. Click "Import"

**This account has:**
- 10,000 ETH for gas
- 1,000,000 TST tokens for testing
- Contract owner privileges

### Step 3: Add Test Token to MetaMask

1. In MetaMask, click "Import tokens"
2. Paste token address:
```
0x5FbDB2315678afecb367f032d93F642f64180aa3
```
3. Click "Add Custom Token" → "Import"

---

## 🎨 Access Your Application

1. Open browser: **http://localhost:3000**
2. Click "Connect Wallet"
3. Approve MetaMask connection
4. You're ready to go! 🎉

---

## 🧪 Test the Platform

### Register a User
1. Go to "Register" tab
2. Connect wallet and approve
3. The platform will:
   - Charge 20 TST tokens
   - Give you 18 TST direct income
   - Add you to the system

### Try Re-Topup
1. Go to "Re-Topup" tab
2. Pay 40 TST to activate level income
3. Now you can earn from 10 levels!

### View Your Dashboard
- User ID
- Sponsor count
- Token balance
- Re-topup status
- Auto pool information

---

## 🛑 Stop/Restart Everything

### Kill Frontend (if port 3000 busy)
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

### Restart Frontend
```powershell
cd Frontend
npm run dev
```

### Restart Hardhat Node
1. Stop the Hardhat node terminal (Ctrl+C)
2. Run: `cd Contract && npx hardhat node`
3. Redeploy: `npx hardhat run deploy-local.js --network localhost`
4. Update Frontend/.env.local with new addresses

---

## 📝 Important Files Created

### Contract/.env
Contains local blockchain configuration
```
TOKEN_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
COMPANY_WALLET=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

### Frontend/.env.local
Contains deployed contract addresses
```
NEXT_PUBLIC_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
NEXT_PUBLIC_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
```

### Contract/deployments/localhost-latest.json
Contains full deployment information

---

## 🔄 For Production Deployment

**See the complete guide:** `DEPLOYMENT_GUIDE.md`

### Values That Need to Change for Production

| Environment | File | Variable | Current Value (Local) | Production Value |
|-------------|------|----------|----------------------|------------------|
| **BSC Testnet** | Contract/.env | TOKEN_ADDRESS | Mock token | `0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee` (Test BUSD) |
| **BSC Testnet** | Contract/.env | DEPLOYER_PRIVATE_KEY | Not needed locally | Your MetaMask private key |
| **BSC Testnet** | Contract/.env | COMPANY_WALLET | Test account | Your company wallet address |
| **BSC Testnet** | Frontend/.env.local | NEXT_PUBLIC_CONTRACT_ADDRESS | Local address | Deployed contract address |
| **BSC Testnet** | Frontend/.env.local | NEXT_PUBLIC_TOKEN_ADDRESS | Mock token | `0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee` |
| **BSC Testnet** | Frontend/.env.local | NEXT_PUBLIC_RPC_URL | http://127.0.0.1:8545 | `https://data-seed-prebsc-1-s1.binance.org:8545/` |

### How to Get Production Values

#### DEPLOYER_PRIVATE_KEY
1. Open MetaMask
2. Click three dots → Account Details
3. Export Private Key
4. Enter password
5. Copy the key (⚠️ NEVER share or commit this!)

#### COMPANY_WALLET
- Your wallet address that will receive company fees
- For production: Use a multisig wallet (Gnosis Safe)

#### TOKEN_ADDRESS
- **BSC Testnet BUSD:** `0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee`
- **BSC Mainnet BUSD:** `0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56`

#### Deployed Contract Address
- Shown in terminal after running deployment script
- Also saved in `Contract/deployments/<network>-latest.json`

---

## 🆘 Common Issues

### "Loading..." Screen Forever
**Fix:** Check Frontend/.env.local has correct addresses, then restart frontend

### MetaMask Not Connecting
**Fix:** Make sure you're on Hardhat Local network (Chain ID 31337)

### "Nonce too high" Error
**Fix:** MetaMask → Settings → Advanced → Clear Activity Tab Data

### No Token Balance
**Fix:** 
1. Import the test account (private key above)
2. Add token to MetaMask (address above)

### Port 3000 Already in Use
**Fix:** Run the kill command above, then restart frontend

---

## 📚 Full Documentation

- **Complete Deployment Guide:** `DEPLOYMENT_GUIDE.md`
- **Smart Contract Documentation:** `Contract/README.md`
- **Frontend Documentation:** `Frontend/README.md`
- **Project Structure:** `PROJECT_STRUCTURE.md`

---

## 🎯 Next Steps

1. ✅ Configure MetaMask (see above)
2. ✅ Open http://localhost:3000
3. ✅ Connect wallet and test the platform
4. 📖 Read DEPLOYMENT_GUIDE.md for production deployment
5. 🚀 Deploy to BSC Testnet when ready

---

**Your local development environment is ready! 🎉**

**Test Account Details:**
- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- Balance: 10,000 ETH + 1,000,000 TST tokens

Happy coding! 🚀

