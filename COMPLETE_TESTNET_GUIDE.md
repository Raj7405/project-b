# 🚀 Complete Testnet Deployment & Frontend Connection Guide

## 📋 Overview

This guide will walk you through:
1. **Deploying your contract to BSC Testnet**
2. **Connecting your frontend to the deployed contract**

---

## PART 1: DEPLOY TO TESTNET

### Step 1: Get Testnet BNB

1. **Get a Wallet Address**
   - Open MetaMask
   - Copy your wallet address (starts with `0x`)

2. **Request Testnet BNB**
   - Visit: https://testnet.binance.org/faucet-smart
   - Paste your wallet address
   - Complete CAPTCHA
   - Click "Give me BNB"
   - Wait 1-5 minutes for BNB to arrive

3. **Verify Balance**
   - Check on: https://testnet.bscscan.com/
   - Enter your address
   - You should see testnet BNB balance

**You need at least 0.1 BNB for deployment**

---

### Step 2: Get Your Private Key

⚠️ **SECURITY WARNING**: Use a separate test wallet, NOT your main wallet!

**From MetaMask:**
1. Click account icon (top right)
2. Click "Account Details"
3. Click "Export Private Key"
4. Enter your password
5. Copy the private key (starts with `0x`, 66 characters total)

**Example:**
```
0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

---

### Step 3: Configure Environment

1. **Go to Contract directory**
   ```bash
   cd Contract
   ```

2. **Create `.env` file**
   ```bash
   # Copy from example
   cp env.example .env
   ```

3. **Edit `.env` file**
   ```env
   # Your private key (NEVER share this!)
   DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

   # BSC Testnet RPC (optional - default works)
   BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/

   # Token Address (leave empty to deploy mock token)
   TOKEN_ADDRESS=

   # Company wallet (can be same as deployer for testing)
   COMPANY_WALLET=0xYOUR_WALLET_ADDRESS
   ```

4. **Fill in the values:**
   - Replace `0xYOUR_PRIVATE_KEY_HERE` with your actual private key
   - Replace `0xYOUR_WALLET_ADDRESS` with your wallet address

---

### Step 4: Compile Contract

```bash
cd Contract
npm run compile
```

**Expected Output:**
```
Compiled 1 Solidity file successfully
```

---

### Step 5: Deploy to Testnet

```bash
npm run deploy:testnet
```

**What happens:**
1. ✅ Checks network connection
2. ✅ Checks your BNB balance
3. ✅ Deploys mock token (if TOKEN_ADDRESS not set)
4. ✅ Deploys MLMSystem contract
5. ✅ Saves deployment info

**Expected Output:**
```
🚀 Starting BSC Testnet Deployment...
   Network: BSC Testnet (Chain ID: 97)

📝 Deploying contracts with account: 0x...
💰 Account balance: 0.5 BNB
✅ Sufficient balance for deployment

📝 Step 1: Deploying Mock BEP-20 Token...
✅ Mock BEP-20 Token deployed to: 0x...

📝 Step 2: Company Wallet: 0x...

📝 Step 3: Deploying MLMSystem Contract...
✅ MLMSystem deployed to: 0x...

📋 Contract Configuration:
   Entry Price: 20.0 tokens
   Retopup Price: 40.0 tokens
   ...

🎉 DEPLOYMENT SUCCESSFUL!

📋 Contract Addresses:
   MLMSystem Contract: 0x...
   Token Address: 0x...
```

---

### Step 6: Save Contract Addresses

**Copy these addresses from the deployment output:**
- `MLMSystem Contract`: `0x...` ← **This is your contract address**
- `Token Address`: `0x...` ← **This is your token address**

**Save them! You'll need them for the frontend.**

---

### Step 7: Verify on BSCScan (Optional)

1. Visit: https://testnet.bscscan.com/
2. Paste your contract address
3. You should see your contract

---

## PART 2: CONNECT FRONTEND

### Step 1: Update Frontend Environment

1. **Go to Frontend directory**
   ```bash
   cd Frontend
   ```

2. **Create/Edit `.env.local` file**
   ```bash
   # Create if doesn't exist
   touch .env.local
   ```

3. **Add these variables:**
   ```env
   # Contract address (from deployment)
   NEXT_PUBLIC_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS

   # Token address (from deployment)
   NEXT_PUBLIC_TOKEN_ADDRESS=0xYOUR_TOKEN_ADDRESS

   # BSC Testnet RPC URL
   NEXT_PUBLIC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/

   # Chain ID for BSC Testnet
   NEXT_PUBLIC_CHAIN_ID=97

   # Your API URL (if you have backend)
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

4. **Replace with your actual addresses:**
   - `0xYOUR_CONTRACT_ADDRESS` → Your MLMSystem contract address
   - `0xYOUR_TOKEN_ADDRESS` → Your token address

---

### Step 2: Update Contract ABI

**File:** `Frontend/src/utils/abis.ts`

**You need to update the ABI to match your contract functions.**

**Current contract functions:**
- `register(address _referrer)` - Register new user
- `retopup()` - Perform retopup
- `getUserInfo(address _user)` - Get user info
- `getPoolNode(address _user, uint256 _poolLevel)` - Get pool node
- `getTotalEarnings(address _user)` - Get total earnings
- And more...

**Update the ABI file with your actual contract ABI:**

1. **Get the ABI:**
   ```bash
   # After deployment, ABI is in:
   Contract/artifacts/contracts/DecentReferral.sol/MLMSystem.json
   ```

2. **Copy the `abi` array from that file**

3. **Update `Frontend/src/utils/abis.ts`:**
   ```typescript
   export const CONTRACT_ABI = [
     // Paste the full ABI array here
     // ... all functions and events
   ]
   ```

---

### Step 3: Configure MetaMask for BSC Testnet

**Users need to add BSC Testnet to MetaMask:**

1. **Open MetaMask**
2. **Click Network dropdown** (top of MetaMask)
3. **Click "Add Network"**
4. **Enter these details:**
   ```
   Network Name: BSC Testnet
   RPC URL: https://data-seed-prebsc-1-s1.binance.org:8545/
   Chain ID: 97
   Currency Symbol: BNB
   Block Explorer: https://testnet.bscscan.com
   ```
5. **Click "Save"**

---

### Step 4: Test Frontend Connection

1. **Start Frontend:**
   ```bash
   cd Frontend
   npm run dev
   ```

2. **Open Browser:**
   - Go to: http://localhost:3000

3. **Connect Wallet:**
   - Click "Connect Wallet" button
   - MetaMask will pop up
   - Select BSC Testnet network
   - Approve connection

4. **Verify Connection:**
   - You should see your wallet address
   - Contract should be connected
   - You can now interact with the contract

---

## HOW IT WORKS: Frontend → Contract

### Connection Flow

```
1. User opens frontend
   ↓
2. Frontend reads .env.local
   - Gets contract address
   - Gets token address
   - Gets RPC URL
   ↓
3. User clicks "Connect Wallet"
   ↓
4. MetaMask connects
   - User approves
   - Frontend gets user's address
   ↓
5. Frontend creates contract instance
   - Uses contract address
   - Uses ABI
   - Uses user's signer (from MetaMask)
   ↓
6. Frontend can now call contract functions
   - register()
   - retopup()
   - getUserInfo()
   - etc.
```

---

### Example: How Frontend Calls Contract

**In your React component:**

```typescript
import { useWeb3 } from '@/contexts/Web3Context'

function MyComponent() {
  const { contract, account } = useWeb3()

  const register = async (referrerAddress: string) => {
    if (!contract || !account) {
      alert('Please connect wallet first!')
      return
    }

    try {
      // Call contract function
      const tx = await contract.register(referrerAddress)
      
      // Wait for transaction
      await tx.wait()
      
      console.log('Registration successful!')
    } catch (error) {
      console.error('Registration failed:', error)
    }
  }

  const getUserInfo = async (userAddress: string) => {
    if (!contract) return

    try {
      // Call view function (no gas cost)
      const info = await contract.getUserInfo(userAddress)
      
      console.log('User ID:', info.id)
      console.log('Referrer:', info.referrer)
      console.log('Direct Income:', info.directIncomeAmount)
    } catch (error) {
      console.error('Failed to get user info:', error)
    }
  }

  return (
    <div>
      <button onClick={() => register('0x...')}>
        Register
      </button>
      <button onClick={() => getUserInfo(account!)}>
        Get My Info
      </button>
    </div>
  )
}
```

---

## IMPORTANT CONFIGURATION VALUES

### BSC Testnet Details

```
Network Name: BSC Testnet
RPC URL: https://data-seed-prebsc-1-s1.binance.org:8545/
Chain ID: 97
Currency: BNB (testnet)
Explorer: https://testnet.bscscan.com
```

### Environment Variables Summary

**Backend (.env):**
- `DEPLOYER_PRIVATE_KEY` - Your wallet private key
- `COMPANY_WALLET` - Company wallet address
- `TOKEN_ADDRESS` - Token address (or empty for mock)

**Frontend (.env.local):**
- `NEXT_PUBLIC_CONTRACT_ADDRESS` - Your deployed contract address
- `NEXT_PUBLIC_TOKEN_ADDRESS` - Your token address
- `NEXT_PUBLIC_RPC_URL` - BSC Testnet RPC
- `NEXT_PUBLIC_CHAIN_ID` - 97 (BSC Testnet)

---

## TROUBLESHOOTING

### Issue: "Insufficient BNB"
**Solution:** Get more testnet BNB from faucet

### Issue: "Network mismatch"
**Solution:** 
- Check MetaMask is on BSC Testnet
- Verify `NEXT_PUBLIC_CHAIN_ID=97` in frontend

### Issue: "Contract not found"
**Solution:**
- Verify contract address is correct
- Check contract is deployed on testnet
- Verify ABI matches contract

### Issue: "Transaction failed"
**Solution:**
- Check you have testnet BNB
- Verify token approval (if needed)
- Check contract function parameters

### Issue: "Cannot read properties"
**Solution:**
- Update ABI to match contract
- Verify contract address
- Check network connection

---

## QUICK REFERENCE

### Deployment Commands
```bash
cd Contract
npm run compile          # Compile contract
npm run deploy:testnet   # Deploy to testnet
```

### Frontend Commands
```bash
cd Frontend
npm run dev              # Start frontend
```

### Important URLs
- BSC Testnet Faucet: https://testnet.binance.org/faucet-smart
- BSCScan Testnet: https://testnet.bscscan.com
- BSC Testnet RPC: https://data-seed-prebsc-1-s1.binance.org:8545/

---

## CHECKLIST

### Before Deployment
- [ ] Have testnet BNB (0.1+ BNB)
- [ ] Have private key ready
- [ ] Created `.env` file in Contract directory
- [ ] Filled in all environment variables

### After Deployment
- [ ] Contract deployed successfully
- [ ] Saved contract address
- [ ] Saved token address
- [ ] Verified on BSCScan

### Frontend Setup
- [ ] Created `.env.local` in Frontend
- [ ] Added contract address
- [ ] Added token address
- [ ] Updated ABI file
- [ ] Configured MetaMask for BSC Testnet

### Testing
- [ ] Frontend connects to wallet
- [ ] Contract functions work
- [ ] Can register users
- [ ] Can view user info
- [ ] Transactions appear on BSCScan

---

## NEXT STEPS

1. ✅ **Deploy to testnet** (follow Part 1)
2. ✅ **Connect frontend** (follow Part 2)
3. ✅ **Test all functions**
4. ✅ **Fix any issues**
5. ✅ **Test with multiple users**
6. ✅ **Prepare for mainnet** (when ready)

---

## SUMMARY

**Deployment:**
1. Get testnet BNB
2. Configure `.env`
3. Run `npm run deploy:testnet`
4. Save addresses

**Frontend:**
1. Update `.env.local` with addresses
2. Update ABI file
3. Configure MetaMask
4. Test connection

**That's it!** Your frontend can now talk to your deployed contract! 🎉

