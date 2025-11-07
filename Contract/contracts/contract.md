# MLMSystem Smart Contract Overview

## Purpose
- Implements a multi-level marketing (MLM) program that uses USDT (ERC20) for all payments.
- Automates direct referral payouts, pool-based rewards, and multi-level retopup commissions.
- Tracks user registration, referral relationships, and historical earnings on-chain.

## Key Components
- `IERC20`: Minimal interface used to interact with the external USDT token contract via `transfer` and `transferFrom`.
- `MLMSystem`: Main contract that holds all state, logic, and events.

### Core State
- `usdtToken`: Address of the USDT token contract used for all value transfers.
- `companyWallet`: Wallet controlled by the company to receive all fees.
- `lastUserId`: Sequential counter; increments on every successful registration.

### Pricing Constants
- `ENTRY_PRICE`: 20 USDT. Paid once at registration.
- `RETOPUP_PRICE`: 40 USDT. Paid every time a user reactivates level income.
- `DIRECT_INCOME`: 18 USDT. Paid to referrers on most direct signups.
- `COMPANY_FEE`: 2 USDT. Paired with `DIRECT_INCOME` to cover the full entry price.

### Data Structures
- `User`
  - `id`: Numeric user identifier.
  - `referrer`: Sponsoring address.
  - `referralCount`: Number of direct referrals.
  - `directIncome`, `poolIncome`, `levelIncome`: Lifetime earnings per channel.
  - `isActive`: Registration flag.
  - `retopupCount`: Number of retopups executed.
  - `referrals`: Mapping storing direct referral addresses in order of arrival.
- `PoolNode`
  - Represents a position in the binary auto pool per level (`user`, `left`, `right`, flags, etc.).

### Main Mappings
- `users`: Tracks every participant’s `User` struct keyed by wallet address.
- `idToAddress`: Reverse lookup from numeric ID to wallet address.
- `userPools`: Stores each user’s `PoolNode` by pool level.
- `poolQueue`: FIFO queue per pool level; used to find the next parent needing children.
- `poolQueueIndex`: Cursor per pool level to avoid re-scanning completed parents.
- `levelPercentages`: Basis-point percentages for each of the 10 level commission tiers.

## Workflow Summary

### Deployment
1. Pass the USDT token address and company wallet to the constructor.
2. Company wallet is automatically created as user ID 1 and marked active.
3. `lastUserId` increments so that the next registration becomes ID 2.

### Registration (`register`)
1. Validates caller has not signed up and that the provided referrer is active.
2. Moves 20 USDT from caller to contract via `transferFrom` (requires pre-approved allowance).
3. Creates a new `User` record, assigns unique ID, and stores the referrer.
4. Increments the referrer’s `referralCount` and stores this new downline in their `referrals` mapping.
5. Emits `UserRegistered`.
6. Delegates to `_processDirectIncome` for reward handling.

### Direct Referral Income (`_processDirectIncome`)
- Second referral: Entire entry price is diverted to the auto pool via `_placeInAutoPool`.
- All other referrals: 18 USDT sent to referrer, 2 USDT to company wallet. Updates `directIncome` and emits `DirectIncomeEarned`.

### Auto Pool Placement (`_placeInAutoPool`)
1. Determines pool value for the requested level (`ENTRY_PRICE * 2^(level-1)`).
2. Splits pool value: 90% reward distribution, 10% company fee.
3. If no users exist at that level, the new user becomes the root; their node is initialized and enqueued.
4. Otherwise, finds the next available parent using `_findAvailableParent`:
   - Scans `poolQueue[level]` starting at `poolQueueIndex[level]`.
   - Returns the first candidate missing a left or right child.
5. Assigns the new user to the parent’s left or right slot, initializes their node, and enqueues them.
6. When both child slots are filled:
   - Marks parent as complete and emits `PoolCompleted`.
   - Transfers the distribution amount to the parent (`poolIncome` updated).
   - Pays the company fee.
   - Recursively upgrades the parent into the next pool level.

### Retopup Workflow (`retopup` & `_distributeLevelIncome`)
1. Limited to active users.
2. Pulls 40 USDT from the caller.
3. Increments `retopupCount` and emits `RetopupCompleted`.
4. `_distributeLevelIncome` traverses up to 10 upline levels:
   - Uses `levelPercentages` to compute each payout.
   - Stops early if the chain reaches the company or address zero.
   - Updates each upline’s `levelIncome` and emits `LevelIncomeEarned`.
5. Any leftover amount (typically 10% = 4 USDT) is transferred to the company wallet to maintain balance.

## View Functions
- `getUserInfo`: Returns a snapshot of a user’s ID, referrer, counts, earnings, and active state.
- `getUserReferrals`: Returns the first `_count` recorded direct referrals for a user.
- `getPoolNode`: Provides structural details for a user’s node at a specific pool level.
- `getTotalEarnings`: Aggregates the three earning channels for quick insight.

## Events and Observability
- `UserRegistered`: Track new signups and their sponsors.
- `DirectIncomeEarned`: Monitor direct referral payouts.
- `PoolIncomeEarned`: Observe auto pool completions and rewards.
- `LevelIncomeEarned`: Audit retopup distribution across all levels.
- `PoolPlacement`: Understand binary tree placements by level and parent.
- `PoolCompleted`: Detect when users qualify for pool payouts and upgrades.
- `RetopupCompleted`: Track retopup frequency and timing.

## Key Behaviors & Customization Points
- Adjust the fee and reward split by modifying `ENTRY_PRICE`, `RETOPUP_PRICE`, `DIRECT_INCOME`, and `COMPANY_FEE`.
- Change level distribution logic by updating `levelPercentages` or the loop limit inside `_distributeLevelIncome`.
- Modify auto pool branching or upgrading rules within `_placeInAutoPool`.
- Extend user data by adding new fields to `User` and ensuring they are initialized on registration.
- Integrate additional business logic (e.g., KYC gates, cooldowns) in `register` or `retopup`.

## Considerations
- Contract relies on the external USDT token being trustworthy and already approved by users.
- Recursive auto pool upgrades can grow call depth; monitor for gas limits if extending logic.
- No withdrawal function exists beyond automated transfers; funds remain in the contract until payouts occur.
- Additional security checks (e.g., pausable functionality, admin controls) can be layered if requirements evolve.

