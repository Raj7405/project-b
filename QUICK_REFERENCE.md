# 🚀 Quick Reference - Commands & Configuration

## ⚡ Quick Start (Copy & Paste)

### 1. Start Hardhat Node (BSC Simulation)
```powershell
cd Contract
npx hardhat node
```
**Leave this running!**

### 2. Deploy Contracts (New Terminal)
```powershell
cd Contract
npx hardhat run deploy-local.js --network localhost
```
**Copy the contract addresses from output!**

### 3. Setup PostgreSQL
```powershell
# Create database
psql -U postgres -c "CREATE DATABASE crypto_mlm;"
```

### 4. Setup & Start Backend (New Terminal)
```powershell
cd backend-express
npm install
cp env.example .env
```

**Edit `.env`:**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crypto_mlm?schema=public"
CONTRACT_ADDRESS=<PASTE_FROM_STEP_2>
TOKEN_ADDRESS=<PASTE_FROM_STEP_2>
```

```powershell
npm run db:generate
npm run db:migrate
npm run dev
```

### 5. Start Frontend (New Terminal)
```powershell
cd Frontend
npm run dev
```

### 6. Configure MetaMask
- Network: Hardhat Local (BSC Simulation)
- RPC: http://127.0.0.1:8545
- Chain ID: 31337
- Symbol: BNB
- Import account with private key from Step 1
- Add token: <TOKEN_ADDRESS from Step 2>

### 7. Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Database GUI: `cd backend-express && npm run db:studio`

---

## 🔄 Restart Services

```powershell
# Kill ports if needed
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force

# Restart in order:
# Terminal 1: Hardhat
cd Contract && npx hardhat node

# Terminal 2: Deploy
cd Contract && npx hardhat run deploy-local.js --network localhost

# Terminal 3: Backend
cd backend-express && npm run dev

# Terminal 4: Frontend
cd Frontend && npm run dev
```

---

## 📝 Configuration Templates

### Contract/.env (Local)
```env
TOKEN_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
COMPANY_WALLET=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

### backend-express/.env (Local)
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

### Frontend/.env.local (Local)
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
NEXT_PUBLIC_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 🌐 BSC Testnet Config

### Contract/.env
```env
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
DEPLOYER_PRIVATE_KEY=<YOUR_PRIVATE_KEY>
TOKEN_ADDRESS=0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee
COMPANY_WALLET=<YOUR_WALLET>
```

### backend-express/.env
```env
BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
CONTRACT_ADDRESS=<DEPLOYED_ADDRESS>
TOKEN_ADDRESS=0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee
CHAIN_ID=97
```

### Frontend/.env.local
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=<DEPLOYED_ADDRESS>
NEXT_PUBLIC_TOKEN_ADDRESS=0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee
NEXT_PUBLIC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
```

### Deploy Command
```powershell
cd Contract
npx hardhat run scripts --network bscTestnet
```

---

## 🔧 Useful Commands

```powershell
# Database
cd backend-express
npm run db:studio              # Open database GUI
npm run db:migrate             # Run migrations
npx prisma migrate reset       # Reset database

# Backend
cd backend-express
npm run dev                    # Development mode
npm run build                  # Build for production
npm start                      # Run production build

# Frontend
cd Frontend
npm run dev                    # Development mode
npm run build                  # Build for production
npm start                      # Run production build

# Contracts
cd Contract
npx hardhat node              # Start local node
npx hardhat test              # Run tests
npx hardhat compile           # Compile contracts
```

---

## 🆘 Quick Fixes

### Frontend Won't Load
```powershell
# Check/fix .env.local
cd Frontend
cat .env.local  # Verify addresses are correct
npm run dev     # Restart
```

### Backend Connection Error
```powershell
# Check PostgreSQL
pg_isready

# Recreate database
psql -U postgres -c "DROP DATABASE crypto_mlm;"
psql -U postgres -c "CREATE DATABASE crypto_mlm;"

# Migrate
cd backend-express
npm run db:migrate
```

### MetaMask Issues
```
1. Switch to Hardhat Local network (Chain ID: 31337)
2. Settings → Advanced → Clear Activity Tab Data
3. Reimport account if needed
```

---

## 📊 Test Account (Local)

```
Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
Balance: 10,000 BNB (simulated) + 1,000,000 TBUSD
```

---

## 📞 Ports

- Frontend: 3000 (or 3001)
- Backend: 5000
- Hardhat: 8545
- PostgreSQL: 5432
- Prisma Studio: 5555

---

## ✅ Verification Checklist

Before testing:
- [ ] Hardhat node running (Terminal 1)
- [ ] Contracts deployed (addresses copied)
- [ ] PostgreSQL database created
- [ ] Backend .env configured
- [ ] Backend running on port 5000
- [ ] Frontend .env.local configured
- [ ] Frontend running on port 3000
- [ ] MetaMask network added (Chain ID: 31337)
- [ ] Test account imported
- [ ] Token added to MetaMask

---

**Everything ready? Visit http://localhost:3000 and connect your wallet! 🎉**

