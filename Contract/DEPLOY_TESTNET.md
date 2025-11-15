# BSC Testnet Deployment Guide

## Prerequisites

1. **Get Testnet BNB**
   - Go to [BSC Testnet Faucet](https://testnet.binance.org/faucet-smart)
   - Request testnet BNB for your wallet address
   - You need at least 0.1 BNB for deployment

2. **Set up Environment Variables**
   - Copy `env.example` to `.env` in the Contract directory
   - Fill in your private key and configuration

## Step-by-Step Deployment

### 1. Configure Environment

Create or update `Contract/.env` file:

```env
# Your wallet private key (NEVER share this!)
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# BSC Testnet RPC (optional, default is provided)
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/

# Token Address (leave as is to deploy mock token, or use existing)
TOKEN_ADDRESS=0xYOUR_TOKEN_ADDRESS

# Company wallet address
COMPANY_WALLET=0xYOUR_COMPANY_WALLET_ADDRESS
```

### 2. Compile Contract

```bash
cd Contract
npm run compile
```

### 3. Deploy to BSC Testnet

```bash
npm run deploy:testnet
```

Or directly:
```bash
npx hardhat run scripts --network bscTestnet
```

### 4. What Gets Deployed

- **Mock ERC20 Token** (if TOKEN_ADDRESS not set)
  - Name: Test USDT (TUSDT)
  - Decimals: 18
  - Initial Supply: 1,000,000 tokens

- **MLMSystem Contract**
  - Entry Price: 20 tokens
  - Retopup Price: 40 tokens
  - Direct Income: 18 tokens
  - Company Fee: 2 tokens

### 5. After Deployment

1. **Save the contract addresses** from the deployment output
2. **View on BSC Testnet Explorer**: 
   - Contract: `https://testnet.bscscan.com/address/YOUR_CONTRACT_ADDRESS`
   - Token: `https://testnet.bscscan.com/address/YOUR_TOKEN_ADDRESS`

3. **Update Frontend Configuration**:
   ```env
   NEXT_PUBLIC_CONTRACT_ADDRESS=YOUR_CONTRACT_ADDRESS
   NEXT_PUBLIC_TOKEN_ADDRESS=YOUR_TOKEN_ADDRESS
   NEXT_PUBLIC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
   NEXT_PUBLIC_CHAIN_ID=97
   ```

4. **Test the Contract**:
   - Get test tokens from the mock contract (call `mint()` function)
   - Approve tokens for the MLM contract
   - Test registration and retopup functions

## Security Reminders

- ⚠️ **Never commit your `.env` file** to version control
- ⚠️ **Never share your private key**
- ⚠️ **Test thoroughly on testnet before mainnet**
- ⚠️ **Get a professional audit before mainnet deployment**

## Troubleshooting

### Insufficient BNB
- Get more testnet BNB from the faucet
- Check your wallet balance

### Deployment Fails
- Check your private key is correct
- Ensure you have enough BNB for gas
- Verify network RPC is accessible

### Contract Verification
After deployment, verify on BSCScan:
```bash
npx hardhat verify --network bscTestnet CONTRACT_ADDRESS TOKEN_ADDRESS COMPANY_WALLET
```

