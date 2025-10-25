# Setup Guide - Crypto MLM Platform

This guide will help you set up and run the project from scratch.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MetaMask or any Web3 wallet
- BEP-20 token address (BUSD or custom token)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

This will install:
- Hardhat (Ethereum development environment)
- OpenZeppelin Contracts (Security utilities)
- Ethers.js (Web3 library)
- Chai (Testing framework)

### 2. Configure Environment Variables

Create a `.env` file in the root directory (copy from `env.example`):

```bash
cp env.example .env
```

Edit `.env` and set your values:

```bash
# For testnet deployment
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
DEPLOYER_PRIVATE_KEY=0xYourPrivateKeyHere
TOKEN_ADDRESS=0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee  # BSC Testnet BUSD
COMPANY_WALLET=0xYourCompanyWalletAddress
```

⚠️ **NEVER commit your `.env` file** - it's already in `.gitignore`

### 3. Compile Contracts

```bash
npm run compile
```

This compiles the Solidity contracts and generates artifacts in the `artifacts/` folder.

### 4. Run Tests

```bash
npm test
```

You should see all tests passing ✅

### 5. Deploy to Local Network (Optional for Testing)

Terminal 1 - Start local blockchain:
```bash
npm run node
```

Terminal 2 - Deploy contract:
```bash
npm run deploy:localhost
```

### 6. Deploy to BSC Testnet

Make sure you have:
- BNB on BSC Testnet for gas fees ([Get testnet BNB](https://testnet.binance.org/faucet-smart))
- Token address set in `.env`
- Company wallet address set

Deploy:
```bash
npm run deploy:testnet
```

Save the deployed contract address from the output.

### 7. Verify Contract on BSCScan (Optional)

After deployment, verify your contract:

```bash
npx hardhat verify --network bscTestnet <CONTRACT_ADDRESS> <TOKEN_ADDRESS> <COMPANY_WALLET> "20000000000000000000" "40000000000000000000"
```

## Project Structure Explained

```
crypto-mlm/
├── contracts/               # Solidity smart contracts
│   ├── DecentReferral.sol  # Main MLM contract
│   └── mocks/              # Test utilities
│       └── ERC20Mock.sol   # Mock token for testing
├── scripts/                # Deployment scripts
│   └── deploy.js          # Main deployment script
├── test/                   # Test files
│   └── decentReferral.test.js  # Comprehensive tests
├── hardhat.config.js       # Hardhat configuration
├── package.json            # Project dependencies
└── env.example            # Environment template
```

## Understanding the Contract Logic

### Registration Flow

1. **User approves** 20 tokens to the contract
2. **User calls** `register(referrerId)`
3. **Contract logic**:
   - Payment always happens: Parent gets $18, Company gets $2
   - If this is the parent's 2nd sponsor: **Parent enters Auto Pool**
   - All sponsors beyond 2nd continue normally

**Example:**
- Alice refers Bob (1st sponsor): Alice gets $18, Company gets $2
- Alice refers Carol (2nd sponsor): Alice gets $18, Company gets $2, **Alice enters Auto Pool**
- Alice refers Dave (3rd sponsor): Alice gets $18, Company gets $2 (normal payment continues)

### Re-Topup Flow

1. **User approves** 40 tokens to the contract
2. **User calls** `reTopup()`
3. **Contract marks** user as re-topup eligible
4. **Distribution logic**:
   - Walk up parent chain for 10 levels
   - If parent has re-topped up: Pay them their %
   - If parent hasn't re-topped up: Send their % to company
   - Company gets $4 fee

### Auto Pool

- When a user gets their 2nd sponsor, that user enters the Auto Pool
- Binary tree placement (automatic, BFS algorithm)
- Admin distributes pool rewards using `distributePoolPayouts()`
- Payment still happens normally for all registrations

## Next Steps

### For Development
1. Write additional tests for edge cases
2. Add frontend integration (Next.js/React)
3. Add backend API (Spring Boot) for event tracking
4. Set up monitoring and alerts

### For Production
1. **Get Security Audit** - Critical!
2. **Deploy to BSC Mainnet**
3. **Use Multisig Wallet** - for owner and company wallet
4. **Verify Contract** - on BSCScan
5. **Monitor Events** - Set up event listeners
6. **Legal Review** - Ensure compliance

## Testing Different Scenarios

### Test Case 1: Basic Registration
```javascript
// In Hardhat console or frontend
const contract = await ethers.getContractAt("DecentReferral", CONTRACT_ADDRESS);
await token.approve(CONTRACT_ADDRESS, ethers.parseUnits("20", 18));
await contract.register(1); // Register under company
```

### Test Case 2: Re-Topup
```javascript
await token.approve(CONTRACT_ADDRESS, ethers.parseUnits("40", 18));
await contract.reTopup();
```

### Test Case 3: Check Eligibility
```javascript
const eligible = await contract.isEligibleForReTopupIncomeByWallet(MY_ADDRESS);
console.log("Eligible:", eligible);
```

## Common Issues & Solutions

### Issue: "Insufficient allowance"
**Solution**: Approve tokens before calling register/reTopup
```javascript
await token.approve(contractAddress, amount);
```

### Issue: "User not registered"
**Solution**: Register first before calling other functions
```javascript
await contract.register(referrerId);
```

### Issue: "Referrer not found"
**Solution**: Use a valid referrer ID (company is ID 1)

### Issue: Deployment fails
**Solution**: 
- Check you have enough BNB for gas
- Verify .env variables are set correctly
- Check network connection

## Useful Commands

```bash
# Compile contracts
npm run compile

# Run tests
npm test

# Clean artifacts
npm run clean

# Start local node
npm run node

# Deploy to different networks
npm run deploy:localhost
npm run deploy:testnet
npm run deploy:mainnet
```

## Getting Help

1. Review the README.md for contract features
2. Check test files for usage examples
3. Review contract comments in DecentReferral.sol
4. Check Hardhat documentation: https://hardhat.org/

## Security Reminders

- ✅ Never commit private keys
- ✅ Use `.env` for sensitive data
- ✅ Get professional audit before mainnet
- ✅ Use multisig for admin functions
- ✅ Test thoroughly on testnet
- ✅ Monitor contract events
- ✅ Have emergency response plan

---

**Ready to start?** Run `npm install` and `npm test` to verify everything works!

