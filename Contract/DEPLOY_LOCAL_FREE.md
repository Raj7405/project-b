# 🆓 Free Local Deployment Guide (No BNB Required!)

This guide shows you how to deploy and test your contract **completely FREE** on your local computer using Hardhat's built-in blockchain.

## ✅ What You Get

- **100% FREE** - No BNB, no real money, no external services
- **Instant deployment** - No waiting for transactions
- **Unlimited test tokens** - Get as many as you need
- **Full functionality** - Test all contract features locally
- **No internet required** - Works offline

## 🚀 Quick Start (3 Steps)

### Step 1: Start Local Blockchain

Open a terminal and run:

```bash
cd Contract
npx hardhat node
```

This starts a local blockchain on `http://127.0.0.1:8545`

**Keep this terminal open!** You'll see:
- 20 test accounts with private keys
- Each account has 10,000 ETH (fake, for testing)
- Network running on port 8545

### Step 2: Deploy Contracts

Open a **NEW terminal** (keep the first one running) and run:

```bash
cd Contract
npx hardhat run deploy-local.js --network localhost
```

This will:
- Deploy a Mock ERC20 Token (Test USDT)
- Deploy your MLMSystem contract
- Show you all the addresses

### Step 3: Connect MetaMask (Optional)

To interact with the contract via your frontend:

1. **Add Local Network to MetaMask:**
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

2. **Import Test Account:**
   - Copy a private key from the `hardhat node` output
   - In MetaMask: Settings → Import Account → Paste private key
   - You'll have 10,000 ETH (fake) for testing

## 📋 What Gets Deployed

- **Mock Token**: Test USDT (TUSDT) with 1,000,000 tokens
- **MLMSystem Contract**: Your MLM system with all features
- **All accounts**: Pre-funded with test tokens

## 🧪 Testing

After deployment, you can:

1. **Get Test Tokens:**
   ```javascript
   // Call mint() on the token contract
   await token.mint(userAddress, ethers.parseUnits("1000", 18));
   ```

2. **Test Registration:**
   ```javascript
   // Approve tokens first
   await token.approve(contractAddress, entryPrice);
   // Then register
   await mlmSystem.register(referrerAddress);
   ```

3. **Test All Functions:**
   - Registration
   - Retopup
   - Auto Pool
   - Level Income
   - All view functions

## 🔄 Restarting

If you close the `hardhat node`:

1. Stop the node (Ctrl+C)
2. Start it again: `npx hardhat node`
3. Redeploy: `npx hardhat run deploy-local.js --network localhost`

**Note:** Each restart creates a fresh blockchain (all previous data is lost)

## 📝 Frontend Configuration

After deployment, update `Frontend/.env.local`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=YOUR_CONTRACT_ADDRESS
NEXT_PUBLIC_TOKEN_ADDRESS=YOUR_TOKEN_ADDRESS
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337
```

## 🎯 Advantages of Local Deployment

✅ **Free** - No costs at all  
✅ **Fast** - Instant transactions  
✅ **Private** - Everything runs on your computer  
✅ **Unlimited** - Test as much as you want  
✅ **Debugging** - Easy to debug and test  
✅ **No Limits** - No rate limits or restrictions  

## ⚠️ Limitations

- Data is lost when you restart `hardhat node`
- Not accessible from other computers
- Not a real blockchain (for testing only)

## 🚀 Next Steps

1. Test all contract functions locally
2. Test your frontend integration
3. When ready, deploy to testnet (still free with faucet BNB)
4. Finally, deploy to mainnet (requires real BNB)

---

**That's it! You can now test your contract completely FREE! 🎉**

