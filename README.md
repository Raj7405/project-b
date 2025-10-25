# 🚀 Crypto MLM Platform on BSC (BNB Smart Chain)

A decentralized MLM (Multi-Level Marketing) platform built on Binance Smart Chain using BEP-20 tokens.

## 🌟 Features

- **BEP-20 Token Support** - Works with BUSD, USDT, or any 18-decimal BEP-20 token
- **Smart Registration** - $20 package with direct income distribution
- **Auto Pool System** - Binary tree auto-placement after 2 sponsors
- **Re-Topup Income** - 10-level income distribution system
- **Real-time Sync** - Blockchain event listener for instant updates
- **Modern Stack** - Next.js, Express.js, PostgreSQL

## 📋 Tech Stack

### Smart Contracts
- Solidity 0.8.19
- Hardhat
- OpenZeppelin
- BEP-20 Standard

### Backend
- Express.js + TypeScript
- PostgreSQL + Prisma ORM
- Ethers.js v6
- Real-time blockchain event listener

### Frontend
- Next.js 14 + TypeScript
- TailwindCSS
- Ethers.js
- React Hooks

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- PostgreSQL v14+
- MetaMask browser extension

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd crypto-mlm

# Install dependencies for all components
cd Contract && npm install
cd ../backend-express && npm install
cd ../Frontend && npm install
```

### Local Development Setup

1. **Start Hardhat Node (BSC Simulation)**
   ```bash
   cd Contract
   npx hardhat node
   ```

2. **Deploy Contracts**
   ```bash
   cd Contract
   npx hardhat run deploy-local.js --network localhost
   ```

3. **Setup PostgreSQL**
   ```bash
   # Create database
   psql -U postgres -c "CREATE DATABASE crypto_mlm;"
   ```

4. **Configure & Start Backend**
   ```bash
   cd backend-express
   cp env.example .env
   # Edit .env with your settings
   npm run db:generate
   npm run db:migrate
   npm run dev
   ```

5. **Start Frontend**
   ```bash
   cd Frontend
   npm run dev
   ```

6. **Configure MetaMask**
   - Network: Hardhat Local (BSC Simulation)
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - Currency Symbol: BNB

See [COMPLETE_SETUP_GUIDE.md](./COMPLETE_SETUP_GUIDE.md) for detailed instructions.

## 📚 Documentation

- **[COMPLETE_SETUP_GUIDE.md](./COMPLETE_SETUP_GUIDE.md)** - Complete setup guide
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick commands reference
- **[MIGRATION_COMPLETE.md](./MIGRATION_COMPLETE.md)** - Project overview
- **[Contract/README.md](./Contract/README.md)** - Smart contract documentation
- **[backend-express/README.md](./backend-express/README.md)** - Backend API documentation
- **[Frontend/README.md](./Frontend/README.md)** - Frontend documentation

## 🌐 Deployment

### BSC Testnet

```bash
# Get testnet BNB from faucet
# https://testnet.bnbchain.org/faucet-smart

# Deploy contracts
cd Contract
npx hardhat run scripts --network bscTestnet
```

### BSC Mainnet

⚠️ **Before mainnet deployment:**
- Get professional security audit
- Use multisig wallet as contract owner
- Test extensively on testnet
- Review all security best practices

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for details.

## 📊 Project Structure

```
crypto-mlm/
├── Contract/              # Smart Contracts (Hardhat)
│   ├── contracts/        # Solidity contracts
│   ├── deploy-local.js   # Local deployment script
│   └── scripts/          # BSC deployment scripts
│
├── backend-express/       # Express.js Backend
│   ├── src/
│   │   ├── controllers/  # API controllers
│   │   ├── routes/       # API routes
│   │   ├── services/     # Blockchain listener
│   │   └── config/       # Configuration
│   └── prisma/           # Database schema
│
└── Frontend/             # Next.js Frontend
    ├── src/
    │   ├── components/   # React components
    │   ├── contexts/     # Web3 context
    │   └── services/     # API services
    └── public/           # Static assets
```

## 🔌 API Endpoints

### Users
- `GET /api/users/:userId` - Get user by ID
- `GET /api/users/wallet/:address` - Get user by wallet
- `GET /api/users/count` - Get total users

### Transactions
- `GET /api/transactions/user/:userId` - Get user transactions
- `GET /api/transactions/recent` - Get recent transactions

### Stats
- `GET /api/stats` - Get platform statistics
- `GET /api/stats/health` - Health check

See [backend-express/README.md](./backend-express/README.md) for complete API documentation.

## 🔐 Environment Variables

### Contract/.env
```env
TOKEN_ADDRESS=0x...              # BEP-20 token address
COMPANY_WALLET=0x...            # Company wallet address
BSC_TESTNET_RPC=https://...    # BSC RPC URL
DEPLOYER_PRIVATE_KEY=0x...     # Deployer private key (NEVER COMMIT!)
```

### backend-express/.env
```env
DATABASE_URL=postgresql://...   # PostgreSQL connection
BSC_RPC_URL=http://...         # BSC RPC URL
CONTRACT_ADDRESS=0x...         # Deployed contract address
TOKEN_ADDRESS=0x...            # BEP-20 token address
```

### Frontend/.env.local
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...  # Contract address
NEXT_PUBLIC_TOKEN_ADDRESS=0x...     # Token address
NEXT_PUBLIC_RPC_URL=http://...      # BSC RPC URL
NEXT_PUBLIC_API_URL=http://...      # Backend API URL
```

## 🛡️ Security

- ✅ ReentrancyGuard on all state-changing functions
- ✅ SafeERC20 for token transfers
- ✅ Ownable with transferOwnership
- ✅ Pausable for emergency stops
- ⚠️ **Audit required before mainnet deployment**

## 🧪 Testing

```bash
# Run smart contract tests
cd Contract
npx hardhat test

# Start local development environment
npm run dev  # (in each directory)
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This software is provided "as is" without warranty. Use at your own risk. Always conduct thorough testing and security audits before deploying to mainnet.

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check documentation in `/docs` folder
- Review [TROUBLESHOOTING.md](./COMPLETE_SETUP_GUIDE.md#troubleshooting)

## 🎯 Roadmap

- [ ] Unit tests for all smart contracts
- [ ] Integration tests for backend
- [ ] Frontend E2E tests
- [ ] Mobile responsive improvements
- [ ] Admin dashboard enhancements
- [ ] Multi-language support

## 🌟 Acknowledgments

- Built on Binance Smart Chain
- OpenZeppelin for secure smart contract libraries
- Hardhat for development framework
- Next.js team for the amazing framework

---

**Made with ❤️ for the BSC community**

