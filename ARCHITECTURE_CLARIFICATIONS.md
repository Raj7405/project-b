# Architecture Clarifications & Simplified Approach

## Your Questions Answered

---

## 1. Direct Income Flow

**Question**: For direct income, I add logic where money goes and tell contract to send money?

**Answer**: **YES, exactly!**

### Flow:
1. **User A registers** with referrer **User B**
2. **Backend calculates**: User B gets 2 BNB direct income
3. **Backend creates reward record**: `{ user: User B, amount: 2 BNB, type: 'DIRECT', status: 'pending' }`
4. **Backend adds to payout queue** (or batch)
5. **Backend calls contract**: `executeBatchPayouts([{user: User B, amount: 2 BNB}])`
6. **Contract transfers** 2 BNB to User B's wallet
7. **Backend marks reward as 'settled'**

**You don't need to tell contract "this is direct income"** - contract just transfers money. Backend knows it's direct income.

---

## 2. Can We Use Redis for Auto Pool Queues?

**Answer**: **YES, but with a hybrid approach**

### Recommended Approach:
- **Redis**: Store the **active queue** (fast reads, easy to manipulate)
- **PostgreSQL**: Store **permanent records** (pool_nodes table for history, tree structure)

### Why Both?
- **Redis**: Fast BFS queue operations (enqueue, dequeue, find parent)
- **PostgreSQL**: Persistence (if Redis crashes, you don't lose data), tree relationships, historical data

### Simple Implementation:
```javascript
// Redis Structure
pool:queue:level:1 = [nodeId1, nodeId2, nodeId3, ...]  // BFS queue
pool:node:level:1:nodeId1 = { userId, parentId, leftChild, rightChild, status }

// PostgreSQL (backup + relationships)
pool_nodes table: Same structure, but permanent
```

**You can use Redis as primary**, but **sync to PostgreSQL** periodically (every 5 minutes or on important events).

**OR** - Keep it simple: **Use PostgreSQL only** (it's fast enough for queue operations with proper indexing).

---

## 3. Why Frontend Calls Contract? Shouldn't Backend Call Directly?

**Answer**: **You have TWO options - both valid!**

### Option A: Frontend Calls Contract (Current Plan)
**Flow:**
1. User clicks "Register" in frontend
2. Frontend → Backend API: Get signed payload
3. Backend returns: `{ payload, signature }`
4. Frontend → Smart Contract: `register(payload, signature)` + User pays gas
5. Contract emits event
6. Backend listener updates DB

**Pros:**
- ✅ User pays gas (you don't pay for user registrations)
- ✅ User controls their wallet (better UX)
- ✅ Less backend infrastructure

**Cons:**
- ❌ User needs BNB for gas
- ❌ More complex frontend code

### Option B: Backend Calls Contract Directly (Simpler!)
**Flow:**
1. User clicks "Register" in frontend
2. Frontend → Backend API: `POST /users/register`
3. Backend validates, creates records
4. Backend → Smart Contract: `register(userAddress, amount)` + Backend pays gas
5. Contract emits event
6. Backend updates DB

**Pros:**
- ✅ Simpler flow (no payload signing needed)
- ✅ Better UX (user doesn't need gas)
- ✅ Easier to implement

**Cons:**
- ❌ You pay for all gas fees
- ❌ Need backend wallet with BNB

### **RECOMMENDATION: Use Option B (Backend Calls Directly)**
- Simpler to build
- Better user experience
- You control everything
- Just need backend wallet funded with BNB

**For payouts, backend MUST call contract** (users can't call their own payouts)

---

## 4. Do I Need BullMQ? Where?

**Answer**: **NO, you don't NEED it. But it helps for payouts.**

### Without BullMQ (Simple Approach):
```javascript
// Simple cron job (node-cron)
setInterval(async () => {
  const pendingRewards = await db.getPendingRewards();
  if (pendingRewards.length > 0) {
    await processBatchPayout(pendingRewards);
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

### With BullMQ (Better Approach):
```javascript
// Queue-based (handles retries, failures, priorities)
payoutQueue.add('process-batch', { rewardIds: [...] }, {
  attempts: 3,
  backoff: 'exponential'
});
```

### **When to Use BullMQ:**
- ✅ **Payout Processing**: If payout fails, retry automatically
- ✅ **Event Processing**: Process blockchain events asynchronously
- ✅ **Scheduled Jobs**: Reconciliation, cleanup

### **When You DON'T Need BullMQ:**
- ❌ Simple cron jobs work fine
- ❌ If you don't need retries/priorities
- ❌ If you want to keep it simple

### **RECOMMENDATION:**
- **Start Simple**: Use `node-cron` for payout processing
- **Add BullMQ Later**: If you need retries, priorities, or complex job scheduling

---

## 5. Batch Payments - Queue Processing

**Answer**: **YES, exactly! Use a queue (simple array or BullMQ)**

### Simple Queue Approach:
```javascript
// In-memory queue (or Redis list)
const payoutQueue = [];

// When reward is created
payoutQueue.push({ userId, amount, rewardId });

// Background processor (every 5 minutes or when queue has 10+ items)
setInterval(async () => {
  if (payoutQueue.length >= 10) {
    const batch = payoutQueue.splice(0, 10); // Take first 10
    await processBatchPayout(batch);
  }
}, 5 * 60 * 1000);
```

### Or Redis List (Better):
```javascript
// Add to queue
await redis.lpush('payout:queue', JSON.stringify({ userId, amount }));

// Process batch
const batch = await redis.lrange('payout:queue', 0, 9); // Get 10 items
await redis.ltrim('payout:queue', 10, -1); // Remove processed items
await processBatchPayout(batch);
```

### **Flow:**
1. **Reward Created** → Add to queue
2. **Queue Processor** (every 5 min or when 10+ items):
   - Take 10 items from queue
   - Group by user (if same user has multiple rewards)
   - Call contract: `executeBatchPayouts([...])`
   - Mark rewards as settled
   - If fails, put back in queue

---

## Simplified Architecture Summary

### What You're Building:

1. **Auth APIs** ✅
   - Token management
   - Admin management

2. **Direct Income APIs** ✅
   - Calculate direct income (2 BNB to referrer)
   - Add to payout queue
   - Backend calls contract to send money

3. **Pool APIs** ✅
   - Use **Redis for active queue** (fast)
   - Use **PostgreSQL for permanent records** (backup)
   - Calculate layered income (50%, 25%, 15%, 10%)
   - Add to payout queue

4. **Payout Queue** ✅
   - Simple Redis list or in-memory array
   - Background job processes every 5 minutes
   - Groups by user, calls contract

5. **Event Listener** ✅
   - Listens to contract events
   - Updates database

---

## How The Contract Will Look Now

### Minimal Smart Contract (Only Money Operations)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MLMSystem is Ownable {
    IERC20 public bnbToken; // WBNB token
    address public companyWallet;
    address public backendWallet; // Backend wallet that can call functions
    
    uint256 public entryPrice = 20 * 10**18; // 20 BNB
    uint256 public retopupPrice = 40 * 10**18; // 40 BNB
    
    mapping(address => bool) public registered;
    mapping(address => bool) public hasRetopup;
    mapping(address => uint256) public userBalances; // On-chain balance tracking
    
    // Events
    event RegistrationAccepted(address indexed user, uint256 amount);
    event RetopupCompleted(address indexed user, uint256 amount);
    event PayoutExecuted(address indexed user, uint256 amount, string rewardType);
    event BatchPayoutCompleted(uint256 totalAmount, uint256 userCount);
    
    modifier onlyBackend() {
        require(msg.sender == backendWallet, "Only backend can call");
        _;
    }
    
    constructor(address _bnbToken, address _companyWallet, address _backendWallet) {
        bnbToken = IERC20(_bnbToken);
        companyWallet = _companyWallet;
        backendWallet = _backendWallet;
    }
    
    // Backend calls this when user registers
    function register(address user, uint256 amount) external onlyBackend {
        require(!registered[user], "Already registered");
        require(amount >= entryPrice, "Insufficient amount");
        
        // Transfer tokens from user to contract (user must approve first)
        bnbToken.transferFrom(user, address(this), amount);
        
        registered[user] = true;
        userBalances[user] += amount;
        
        emit RegistrationAccepted(user, amount);
    }
    
    // Backend calls this when user does retopup
    function retopup(address user, uint256 amount) external onlyBackend {
        require(registered[user], "Not registered");
        require(!hasRetopup[user], "Already did retopup");
        require(amount >= retopupPrice, "Insufficient amount");
        
        // Transfer tokens from user to contract
        bnbToken.transferFrom(user, address(this), amount);
        
        hasRetopup[user] = true;
        userBalances[user] += amount;
        
        emit RetopupCompleted(user, amount);
    }
    
    // Backend calls this to send money to a single user
    function payout(address user, uint256 amount, string memory rewardType) external onlyBackend {
        require(userBalances[address(this)] >= amount, "Insufficient contract balance");
        
        bnbToken.transfer(user, amount);
        
        emit PayoutExecuted(user, amount, rewardType);
    }
    
    // Backend calls this to send money to multiple users (BATCH)
    function executeBatchPayouts(
        address[] calldata users,
        uint256[] calldata amounts,
        string[] calldata rewardTypes
    ) external onlyBackend {
        require(users.length == amounts.length, "Arrays length mismatch");
        require(users.length == rewardTypes.length, "Arrays length mismatch");
        require(users.length > 0 && users.length <= 50, "Invalid batch size");
        
        uint256 totalAmount = 0;
        
        // Calculate total first
        for (uint256 i = 0; i < users.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(bnbToken.balanceOf(address(this)) >= totalAmount, "Insufficient contract balance");
        
        // Transfer to each user
        for (uint256 i = 0; i < users.length; i++) {
            bnbToken.transfer(users[i], amounts[i]);
            emit PayoutExecuted(users[i], amounts[i], rewardTypes[i]);
        }
        
        emit BatchPayoutCompleted(totalAmount, users.length);
    }
    
    // Admin function to withdraw company share
    function withdrawCompanyShare(uint256 amount) external onlyOwner {
        bnbToken.transfer(companyWallet, amount);
    }
    
    // View functions
    function getContractBalance() external view returns (uint256) {
        return bnbToken.balanceOf(address(this));
    }
    
    function isRegistered(address user) external view returns (bool) {
        return registered[user];
    }
    
    function userHasRetopup(address user) external view returns (bool) {
        return hasRetopup[user];
    }
}
```

### Key Points:
- ✅ **Only backend can call** `register()`, `retopup()`, `payout()`
- ✅ **Contract holds money** (from registrations and retopups)
- ✅ **Contract transfers money** (when backend tells it to)
- ✅ **No business logic** (all logic in backend)
- ✅ **Events for everything** (backend listens)

---

## Complete Flow Example (Simplified)

### User Registration:

1. **Frontend**: `POST /api/users/register { referrerId: 123 }`
2. **Backend**:
   - Validates referrer
   - Calculates: Direct income to referrer (2 BNB)
   - Creates DB records
   - Adds reward to payout queue: `{ userId: referrerId, amount: 2 BNB }`
   - Calls contract: `contract.register(userAddress, 20 BNB)` ← Backend pays gas
3. **Contract**: Holds 20 BNB, emits event
4. **Backend Listener**: Updates DB (user status = active)

### Payout Processing (Every 5 minutes):

1. **Backend Job**:
   - Gets 10 items from payout queue
   - Groups: `{ user1: 5 BNB, user2: 3 BNB, user3: 2 BNB }`
   - Calls contract: `contract.executeBatchPayouts([user1, user2, user3], [5, 3, 2], ['DIRECT', 'POOL_L1', 'DIRECT'])`
2. **Contract**: Transfers BNB to users, emits events
3. **Backend Listener**: Marks rewards as settled

---

## Event Listener - Where & How

### Where is the Event Listener?

**Answer: It's a separate background service/process in your backend**

### Architecture:

```
Your Backend Application:
├── API Server (Express)          ← Handles HTTP requests
│   ├── /api/users/register
│   ├── /api/users/retopup
│   └── /api/payouts/...
│
├── Event Listener Service         ← Runs continuously in background
│   ├── Listens to blockchain events
│   ├── Updates database
│   └── Triggers follow-up actions
│
└── Payout Processor (Cron Job)    ← Runs every 5 minutes
    ├── Collects pending rewards
    └── Calls contract to send money
```

### Implementation Options:

#### Option 1: Separate Process (Recommended)
**File Structure:**
```
backend/
├── src/
│   ├── server.js              ← API server (Express)
│   ├── services/
│   │   ├── eventListener.js   ← Event listener service
│   │   └── payoutProcessor.js ← Payout cron job
│   └── ...
├── package.json
└── ecosystem.config.js        ← PM2 config (runs both processes)
```

**Run both services:**
```bash
# Using PM2 (process manager)
pm2 start src/server.js --name "api-server"
pm2 start src/services/eventListener.js --name "event-listener"

# Or using npm scripts
npm run start:api        # Starts API server
npm run start:listener   # Starts event listener
```

#### Option 2: Same Process (Simpler for Development)
**File Structure:**
```
backend/
├── src/
│   ├── server.js              ← API server + event listener
│   └── ...
└── package.json
```

**In server.js:**
```javascript
const express = require('express');
const { startEventListener } = require('./services/eventListener');
const { startPayoutProcessor } = require('./services/payoutProcessor');

const app = express();
// ... API routes ...

// Start event listener when server starts
startEventListener();

// Start payout processor
startPayoutProcessor();

app.listen(3000, () => {
  console.log('API Server running on port 3000');
  console.log('Event Listener started');
});
```

### Event Listener Code Structure:

```javascript
// src/services/eventListener.js
const { ethers } = require('ethers');
const db = require('../db');

class EventListener {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    this.contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      CONTRACT_ABI,
      this.provider
    );
    this.lastProcessedBlock = null;
  }

  async start() {
    console.log('Event Listener started...');
    
    // Get last processed block from database
    const sync = await db.getBlockchainSync();
    this.lastProcessedBlock = sync?.last_block || 0;

    // Listen to new events
    this.contract.on('RegistrationAccepted', async (user, amount, event) => {
      await this.handleRegistration(user, amount, event);
    });

    this.contract.on('RetopupCompleted', async (user, amount, event) => {
      await this.handleRetopup(user, amount, event);
    });

    this.contract.on('PayoutExecuted', async (user, amount, rewardType, event) => {
      await this.handlePayout(user, amount, rewardType, event);
    });

    // Also poll for missed events (backup)
    setInterval(() => this.pollEvents(), 30000); // Every 30 seconds
  }

  async handleRegistration(user, amount, event) {
    console.log(`Registration: ${user}, Amount: ${amount}`);
    
    // Update database
    await db.updateUserStatus(user, 'active');
    await db.updateTransactionStatus(event.transactionHash, 'confirmed');
    
    // Update last processed block
    await db.updateBlockchainSync(event.blockNumber);
  }

  async handleRetopup(user, amount, event) {
    console.log(`Retopup: ${user}, Amount: ${amount}`);
    
    await db.updateUserRetopup(user, true);
    await db.updateBlockchainSync(event.blockNumber);
  }

  async handlePayout(user, amount, rewardType, event) {
    console.log(`Payout: ${user}, Amount: ${amount}, Type: ${rewardType}`);
    
    await db.markRewardSettled(user, amount, event.transactionHash);
    await db.updateBlockchainSync(event.blockNumber);
  }

  async pollEvents() {
    // Poll for events from last processed block
    const currentBlock = await this.provider.getBlockNumber();
    const fromBlock = this.lastProcessedBlock + 1;
    
    if (fromBlock <= currentBlock) {
      const events = await this.contract.queryFilter('*', fromBlock, currentBlock);
      
      for (const event of events) {
        // Process each event
        if (event.eventName === 'RegistrationAccepted') {
          await this.handleRegistration(...event.args, event);
        }
        // ... handle other events
      }
      
      this.lastProcessedBlock = currentBlock;
    }
  }
}

// Start listener
const listener = new EventListener();
listener.start().catch(console.error);

module.exports = { EventListener };
```

### How It Works:

1. **Starts when backend starts** (or as separate process)
2. **Connects to blockchain** via RPC (BSC Testnet/Mainnet)
3. **Listens to contract events** in real-time
4. **Updates database** when events occur
5. **Polls for missed events** (backup mechanism)

### Database Table for Tracking:

```sql
CREATE TABLE blockchain_sync (
  id SERIAL PRIMARY KEY,
  last_block BIGINT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Important Notes:

- ✅ **Runs continuously** (never stops)
- ✅ **Idempotent** (can process same event twice safely)
- ✅ **Handles failures** (retries, logs errors)
- ✅ **Tracks last block** (doesn't miss events)

### Running in Production:

**Using PM2 (Recommended):**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api-server',
      script: './src/server.js',
      instances: 2, // Run 2 instances for load balancing
      exec_mode: 'cluster'
    },
    {
      name: 'event-listener',
      script: './src/services/eventListener.js',
      instances: 1, // Only 1 instance (to avoid duplicate processing)
      exec_mode: 'fork',
      autorestart: true,
      watch: false
    },
    {
      name: 'payout-processor',
      script: './src/services/payoutProcessor.js',
      instances: 1,
      exec_mode: 'fork'
    }
  ]
};
```

**Start all:**
```bash
pm2 start ecosystem.config.js
pm2 logs  # View logs from all processes
```

---

## Your Tech Stack (Simplified)

### Required:
- ✅ **Node.js + Express** (API server)
- ✅ **PostgreSQL** (main database)
- ✅ **Redis** (pool queue + payout queue - optional but recommended)
- ✅ **ethers.js** (blockchain interactions)
- ✅ **Event Listener Service** (background process)

### Optional:
- ⚠️ **BullMQ** (only if you want retry logic for payouts)
- ⚠️ **node-cron** (simple alternative to BullMQ)
- ⚠️ **PM2** (process manager for production)

### Not Needed (for now):
- ❌ Complex message queues (Kafka, RabbitMQ)
- ❌ Complex job schedulers
- ❌ Multiple microservices

---

## Summary

1. **Direct Income**: Backend calculates → Adds to queue → Calls contract to send money ✅
2. **Redis for Pools**: YES, use Redis for active queue, PostgreSQL for backup ✅
3. **Backend Calls Contract**: YES, simpler! Backend calls directly, you pay gas ✅
4. **BullMQ**: Optional - use simple cron or Redis list for now ✅
5. **Batch Payments**: YES, use queue (Redis list or simple array) ✅

**Keep it simple!** Start with basic queue, add complexity later if needed.

