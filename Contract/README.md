# Crypto MLM Platform - Smart Contracts

Production-ready smart contracts for a decentralized MLM platform on BEP-20 blockchain with Auto Pool and Level Income features.

## 🚀 Features

### 1. Registration & Direct Income
- **Package Cost**: $20 per registration
- **Direct Income**: $18 to parent wallet (90%)
- **Company Fee**: $2 (10%)
- **Special Case**: When a user gets their 2nd sponsor, that USER enters the Auto Pool (payment still happens normally: $18 + $2)
- **Unlimited Sponsors**: Each user can add unlimited sponsors

### 2. Auto Pool (Binary Placement)
- When a user gets their 2nd sponsor, that USER enters the Auto Pool (not the sponsor)
- Binary tree structure (Left and Right branches)
- Automatic placement using BFS (Breadth-First Search) algorithm
- Fair distribution based on queue order
- Payment still happens normally ($18 to parent, $2 to company)

### 3. Level Income (Re-Topup)
- **Re-Topup Amount**: $40
- **Distribution**: $36 across 10 levels (90%)
- **Company Fee**: $4 (10%)
- **Eligibility Rule**: Only users who have done re-topup can receive re-topup income
  - If an ancestor hasn't re-topped up, their share goes to the company wallet
  - Tree structure remains the same as initial registration

#### Level Income Distribution
| Level | Percentage | Amount ($) |
|-------|-----------|-----------|
| 1     | 30%       | 10.80     |
| 2     | 15%       | 5.40      |
| 3     | 10%       | 3.60      |
| 4     | 5%        | 1.80      |
| 5     | 5%        | 1.80      |
| 6     | 5%        | 1.80      |
| 7     | 5%        | 1.80      |
| 8     | 5%        | 1.80      |
| 9     | 10%       | 3.60      |
| 10    | 10%       | 3.60      |
| **Total** | **100%** | **36.00** |

## 🏗️ Project Structure

```
crypto-mlm/
├── contracts/
│   ├── DecentReferral.sol      # Main contract
│   └── mocks/
│       └── ERC20Mock.sol        # Mock token for testing
├── scripts/
│   └── deploy.js                # Deployment script
├── test/
│   └── decentReferral.test.js  # Comprehensive test suite
├── hardhat.config.js            # Hardhat configuration
├── package.json                 # Dependencies
├── .env.example                 # Environment variables template
└── README.md                    # This file
```

## 📦 Installation

1. **Clone and navigate to the project:**
```bash
cd crypto-mlm
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` and add your values:
- `DEPLOYER_PRIVATE_KEY`: Your wallet private key
- `TOKEN_ADDRESS`: BEP-20 token address (BUSD or custom token)
- `COMPANY_WALLET`: Company wallet address (use multisig for production)

## 🧪 Testing

Run the comprehensive test suite:

```bash
npm test
```

Run with coverage:
```bash
npm run test:coverage
```

### Test Coverage
- ✅ Registration flow (direct income, company fee)
- ✅ Parent enters Auto Pool when getting 2nd sponsor
- ✅ Verify correct user (parent, not sponsor) enters pool
- ✅ Third+ sponsor normal payments
- ✅ Re-topup eligibility marking
- ✅ Re-topup distribution to eligible ancestors only
- ✅ Ineligible ancestor shares going to company
- ✅ Admin functions (pause, emergency withdraw)
- ✅ View functions

## 🚀 Deployment

### Local Deployment (for testing)
```bash
# Terminal 1: Start local node
npm run node

# Terminal 2: Deploy
npm run deploy:localhost
```

### BSC Testnet Deployment
```bash
npm run deploy:testnet
```

### BSC Mainnet Deployment (Production)
```bash
npm run deploy:mainnet
```

Deployment info will be saved in `deployments/` folder.

## 🔐 Security Features

- ✅ **OpenZeppelin Contracts**: SafeERC20, ReentrancyGuard, Ownable, Pausable
- ✅ **Reentrancy Protection**: On all state-changing functions
- ✅ **Safe Token Transfers**: Using SafeERC20
- ✅ **Pausable**: Emergency pause functionality
- ✅ **Access Control**: Owner-only admin functions
- ✅ **Event Logging**: Comprehensive event emissions for off-chain tracking

## ⚠️ Production Deployment Checklist

Before deploying to mainnet:

- [ ] **Get Professional Audit**: Hire a reputable security firm
- [ ] **Use Multisig Wallet**: Set company wallet and owner to a multisig (Gnosis Safe)
- [ ] **Test on Testnet**: Thoroughly test all flows on BSC Testnet
- [ ] **Verify Contract**: Verify source code on BSCScan
- [ ] **Set Up Monitoring**: Monitor events and contract balance
- [ ] **Backend Integration**: Set up event listeners in your backend
- [ ] **Rate Limiting**: Implement rate limiting if needed
- [ ] **Legal Compliance**: Ensure compliance with local regulations

## 📝 Contract Functions

### User Functions
- `register(uint256 referrerId)`: Register with $20 package
- `reTopup()`: Re-topup with $40 for level income eligibility

### Admin Functions (Owner Only)
- `pause()` / `unpause()`: Emergency pause
- `setCompanyWallet(address)`: Update company wallet
- `distributePoolPayouts(uint256[], uint256[])`: Distribute auto pool earnings
- `emergencyWithdraw(address, uint256)`: Emergency token withdrawal

### View Functions
- `getUserId(address)`: Get user ID by wallet
- `userInfo(uint256)`: Get user details
- `isEligibleForReTopupIncome(uint256)`: Check re-topup eligibility
- `getPoolQueueLength()`: Get auto pool queue length
- `getPoolNodesCount()`: Get total pool nodes

## 🔗 Integration Guide

### Frontend Integration (Web3.js/Ethers.js)

```javascript
// 1. Connect wallet
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

// 2. Create contract instance
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

// 3. Approve tokens before registration
const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, signer);
await token.approve(CONTRACT_ADDRESS, ethers.utils.parseUnits("20", 18));

// 4. Register under a referrer
await contract.register(referrerId);

// 5. Re-topup (after approval)
await token.approve(CONTRACT_ADDRESS, ethers.utils.parseUnits("40", 18));
await contract.reTopup();
```

### Backend Integration (Event Listening)

Listen to events for off-chain database synchronization:
- `UserRegistered`: Track new registrations
- `DirectIncomePaid`: Track income distributions
- `CompanyFeePaid`: Track company earnings
- `AutoPoolEnqueued`: Track pool entries
- `ReTopupProcessed`: Track re-topup activities
- `ReTopupSkippedToCompany`: Track ineligible ancestor cases

## 📞 Support & Questions

For questions about the smart contract logic or implementation, please review:
1. Contract comments in `contracts/DecentReferral.sol`
2. Test cases in `test/decentReferral.test.js`
3. This README

## 📄 License

MIT License - See LICENSE file for details

---

**⚠️ IMPORTANT DISCLAIMER**: This smart contract handles financial transactions. Ensure you:
- Conduct a professional security audit before mainnet deployment
- Test extensively on testnet
- Use multisig wallets for admin functions
- Comply with all applicable laws and regulations
- Understand the risks involved in smart contract deployment

