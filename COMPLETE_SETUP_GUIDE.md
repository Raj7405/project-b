# 🚀 Complete Setup Guide - Crypto MLM Platform on BSC

This guide will help you set up the complete Crypto MLM platform with:
- ⛓️ BEP-20 Smart Contracts on BSC
- 🚀 Express.js Backend with PostgreSQL
- ⚛️ Next.js Frontend

---

## 📋 Prerequisites

### Required Software
- **Node.js** (v18+ recommended)
- **PostgreSQL** (v14+)
- **MetaMask** browser extension
- **Git**

### For Windows (PowerShell)
```powershell
# Install PostgreSQL using Chocolatey
choco install postgresql

# Or download from: https://www.postgresql.org/download/windows/
```

---

## 🎯 Quick Start (Local Development)

### Step 1: Start Hardhat Node (BSC Simulation)

**Terminal 1:**
```powershell
cd Contract
npx hardhat node
```

**Keep this running!** It simulates BSC locally.

You'll see test accounts with private keys. **Save at least one private key** for MetaMask!

### Step 2: Deploy Smart Contracts

**Terminal 2:**
```powershell
cd Contract
npx hardhat run deploy-local.js --network localhost
```

**Copy the output addresses!** You'll need them for configuration.

### Step 3: Set Up PostgreSQL Database

**Create Database:**
```powershell
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE crypto_mlm;

# Exit
\q
```

### Step 4: Set Up Express Backend

**Terminal 3:**
```powershell
cd backend-express

# Install dependencies
npm install

# Copy and configure environment
cp env.example .env

# Edit .env with your values:
# - DATABASE_URL (PostgreSQL connection string)
# - CONTRACT_ADDRESS (from deployment output)
# - TOKEN_ADDRESS (from deployment output)
```

**Example `.env` for local:**
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crypto_mlm?schema=public"
BSC_RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
START_BLOCK=0
CHAIN_ID=31337
POLLING_INTERVAL=5000
```

**Run Migrations and Start Backend:**
```powershell
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Start server
npm run dev
```

Backend will run on **http://localhost:5000**

### Step 5: Set Up Frontend

**Terminal 4:**
```powershell
cd Frontend

# Install dependencies (if not already done)
npm install

# Update .env.local with deployed addresses
```

**Frontend `.env.local`:**
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
NEXT_PUBLIC_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**Start Frontend:**
```powershell
npm run dev
```

Frontend will run on **http://localhost:3000** (or 3001 if 3000 is busy)

### Step 6: Configure MetaMask

**Add Local Network:**
1. Open MetaMask
2. Click network dropdown → "Add network manually"
3. Fill in:
   - **Network Name:** Hardhat Local (BSC Simulation)
   - **RPC URL:** http://127.0.0.1:8545
   - **Chain ID:** 31337
   - **Currency Symbol:** BNB
4. Save

**Import Test Account:**
1. MetaMask → Account icon → "Import Account"
2. Paste a private key from Step 1 (Hardhat node output)
3. Import

**Add Test Token:**
1. MetaMask → "Import tokens"
2. Paste TOKEN_ADDRESS from deployment
3. Import

### Step 7: Test the Platform!

1. Open **http://localhost:3000**
2. Click "Connect Wallet"
3. Approve MetaMask connection
4. Test registration, re-topup, etc.

---

## 🌐 BSC Testnet Deployment

### Step 1: Get Testnet BNB

Visit: https://testnet.bnbchain.org/faucet-smart

### Step 2: Update Contract/.env

```env
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
DEPLOYER_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
TOKEN_ADDRESS=0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee
COMPANY_WALLET=YOUR_WALLET_ADDRESS
```

**How to get DEPLOYER_PRIVATE_KEY:**
1. MetaMask → Account Details → Export Private Key
2. ⚠️ **NEVER share or commit this!**

### Step 3: Deploy to BSC Testnet

```powershell
cd Contract
npx hardhat run scripts --network bscTestnet
```

### Step 4: Update Backend Environment

Update `backend-express/.env`:
```env
BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
CONTRACT_ADDRESS=<FROM_DEPLOYMENT_OUTPUT>
TOKEN_ADDRESS=0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee
CHAIN_ID=97
```

### Step 5: Update Frontend Environment

Update `Frontend/.env.local`:
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=<FROM_DEPLOYMENT_OUTPUT>
NEXT_PUBLIC_TOKEN_ADDRESS=0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee
NEXT_PUBLIC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
```

### Step 6: Configure MetaMask for BSC Testnet

```
Network Name: BSC Testnet
RPC URL: https://data-seed-prebsc-1-s1.binance.org:8545/
Chain ID: 97
Currency Symbol: BNB
Block Explorer: https://testnet.bscscan.com
```

---

## 🎯 Project Structure

```
crypto-mlm/
├── Contract/                  # Smart Contracts (Hardhat)
│   ├── contracts/
│   │   ├── DecentReferral.sol    # Main BEP-20 MLM contract
│   │   └── mocks/                # Test tokens
│   ├── deploy-local.js           # Local deployment script
│   ├── scripts                   # BSC deployment script
│   └── hardhat.config.js
│
├── backend-express/           # Express.js Backend
│   ├── src/
│   │   ├── controllers/          # API controllers
│   │   ├── routes/               # API routes
│   │   ├── services/             # Business logic
│   │   ├── config/               # Configuration
│   │   └── server.ts             # Main server
│   ├── prisma/
│   │   └── schema.prisma         # Database schema
│   └── package.json
│
└── Frontend/                  # Next.js Frontend
    ├── src/
    │   ├── components/           # React components
    │   ├── contexts/             # React contexts
    │   ├── services/             # API services
    │   └── app/                  # Next.js pages
    └── package.json
```

---

## 🔄 Common Commands

### Kill Process on Port
```powershell
# Port 3000 (Frontend)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force

# Port 5000 (Backend)
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
```

### Restart Everything
```powershell
# Terminal 1: Hardhat
cd Contract && npx hardhat node

# Terminal 2: Deploy
cd Contract && npx hardhat run deploy-local.js --network localhost

# Terminal 3: Backend
cd backend-express && npm run dev

# Terminal 4: Frontend
cd Frontend && npm run dev
```

### Database Commands
```powershell
cd backend-express

# View database (GUI)
npm run db:studio

# Reset database
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name migration_name
```

---

## 🆘 Troubleshooting

### Frontend Loading Forever
**Fix:**
1. Check `.env.local` has correct addresses
2. Restart frontend
3. Clear browser cache

### Backend Not Connecting to Database
**Fix:**
1. Check PostgreSQL is running: `pg_isready`
2. Verify DATABASE_URL in `.env`
3. Run migrations: `npm run db:migrate`

### MetaMask Issues
**Fix:**
1. Switch to correct network (Chain ID 31337 for local)
2. Clear activity: Settings → Advanced → Clear Activity Tab Data
3. Re-import account if needed

### "Nonce too high" Error
**Fix:** MetaMask → Settings → Advanced → Clear Activity Tab Data

### Blockchain Listener Not Working
**Fix:**
1. Check backend logs for errors
2. Verify CONTRACT_ADDRESS is correct
3. Ensure Hardhat node is running

---

## 📊 API Endpoints

Base URL: `http://localhost:5000/api`

### Users
- `GET /users/:userId`
- `GET /users/wallet/:walletAddress`
- `GET /users/recent?days=7`
- `GET /users/count`

### Transactions
- `GET /transactions/user/:userId`
- `GET /transactions/user/:userId/paginated?page=0&size=20`
- `GET /transactions/recent?days=7`

### Stats
- `GET /stats?recentDays=7`
- `GET /stats/health`

---

## 🔐 Security Notes

### Local Development
- ✅ Use test accounts only
- ✅ Never commit `.env` files
- ✅ Test private keys are safe to share (local only!)

### Production Deployment
- ⚠️ **NEVER** commit private keys
- ⚠️ Use environment variables
- ⚠️ Use multisig wallets for owner
- ⚠️ Get professional audit
- ⚠️ Test on testnet first

---

## 🎓 Learning Resources

### BSC/BEP-20
- BSC Docs: https://docs.bnbchain.org/
- BEP-20 Standard: https://github.com/bnb-chain/BEPs/blob/master/BEP20.md
- BSC Testnet Faucet: https://testnet.bnbchain.org/faucet-smart

### Development
- Hardhat: https://hardhat.org/docs
- Ethers.js: https://docs.ethers.org/
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs

---

## ✅ Success Checklist

Before testing:
- [ ] Hardhat node running
- [ ] Contracts deployed
- [ ] PostgreSQL running
- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] MetaMask configured
- [ ] Test account imported
- [ ] Test token added to MetaMask

---

**Ready to build! 🚀**

For detailed information, see:
- `Contract/README.md` - Smart contracts
- `backend-express/README.md` - Backend API
- `Frontend/README.md` - Frontend application

