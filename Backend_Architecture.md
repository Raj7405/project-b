# Backend Architecture and API Specification

## Overview
- **Goal**: Move 100% of MLM business logic (trees, payouts, eligibility) into backend services. Smart contract only handles custody and final settlement.
- **Stack**: Node.js/TypeScript, Fastify/Express, Prisma + PostgreSQL, Redis, Kafka/SQS (optional), ethers.js for blockchain interactions.
- **Security**: Backend signs all contract payloads (EIP-712). Contract verifies backend signer. Private keys stored in HSM/Vault.

---

## Database Design (PostgreSQL)

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id (PK) | BIGSERIAL | Internal user id |
| wallet_address | VARCHAR(42) UNIQUE | EOA address |
| referrer_id (FK users.id) | BIGINT | Direct sponsor |
| referral_count | INT | Maintained by backend |
| status | ENUM('pending','active','frozen') | Current state |
| has_retopup | BOOLEAN | For level income eligibility |
| metadata | JSONB | KYC/profile info |
| created_at / updated_at | TIMESTAMP | |

### `user_balances`
| Column | Type | Notes |
|--------|------|-------|
| user_id (PK, FK) | BIGINT |
| direct_income | NUMERIC(38,18) |
| pool_income | NUMERIC(38,18) |
| level_income | NUMERIC(38,18) |
| reserved_income | JSONB (`{ "level": amount }`) |
| withdrawn | NUMERIC(38,18) |
| last_retopup_at | TIMESTAMP |

### `pools`
| Column | Type | Notes |
|--------|------|-------|
| id (PK) | BIGSERIAL |
| level | INT | Pool level (1 → 20 BNB, 2 → 40 BNB, …) |
| tree_number | INT | 1..15 |
| status | ENUM('active','completed') |
| root_user_id | BIGINT |
| created_at / completed_at | TIMESTAMP |

### `pool_nodes`
| Column | Type | Notes |
|--------|------|-------|
| id (PK) | BIGSERIAL |
| pool_id (FK) | BIGINT |
| user_id (FK users.id) | BIGINT |
| parent_id (FK pool_nodes.id) | BIGINT |
| position | ENUM('left','right','root') |
| layer | INT | Depth |
| left_child_id / right_child_id | BIGINT |
| status | ENUM('pending','active','completed') |
| queue_index | INT | BFS queue pointer |

### `placements`
Tracks each auto-pool entry.
| Column | Type | Notes |
|--------|------|-------|
| id | BIGSERIAL |
| user_id | BIGINT |
| parent_node_id | BIGINT |
| pool_id | BIGINT |
| layer_rewards | JSONB (`{ "layer1": amt, "layer2": amt, "layer3": amt }`) |
| status | ENUM('pending','settled','failed') |
| settlement_tx | VARCHAR | On-chain tx hash |

### `rewards`
| Column | Type | Notes |
|--------|------|-------|
| id (PK) | BIGSERIAL |
| user_id | BIGINT |
| source_user_id | BIGINT | Who triggered reward |
| pool_id | BIGINT NULL |
| type | ENUM('DIRECT','POOL_L1','POOL_L2','POOL_L3','LEVEL','BONUS') |
| amount | NUMERIC(38,18) |
| status | ENUM('pending','batched','settled','failed') |
| batch_id | UUID |
| tx_hash | VARCHAR |
| created_at / updated_at | TIMESTAMP |

### `retopups`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGSERIAL |
| user_id | BIGINT |
| amount | NUMERIC |
| status | ENUM('pending','confirmed','failed') |
| tx_hash | VARCHAR |
| created_at | TIMESTAMP |

### `transactions`
Stores every signed payload & contract interaction.
| Column | Type | Notes |
|--------|------|-------|
| id | UUID |
| user_id | BIGINT |
| action | ENUM('REGISTER','RETOPUP','PAYOUT_BATCH','WITHDRAW') |
| payload | JSONB |
| signature | VARCHAR |
| status | ENUM('prepared','submitted','confirmed','failed','expired') |
| tx_hash | VARCHAR |
| created_at | TIMESTAMP |

### `blockchain_sync`
| Column | Type | Notes |
|--------|------|-------|
| id | INT |
| last_block | BIGINT |
| updated_at | TIMESTAMP |

### `audit_logs`
Append-only record of admin actions, reconciliations, manual fixes.

---

## API Specification

### 1. Auth & Session
1. `POST /auth/wallet`
   - **Purpose**: Verify wallet signature + issue tokens.
   - **Body**: `{ wallet, signature, nonce }`
   - **Response**: `{ accessToken, refreshToken, user }`
   - **DB**: `users`, `audit_logs`
2. `POST /auth/refresh`
3. `POST /auth/logout`

### 2. User & Referral APIs
1. `GET /users/me`
   - Returns profile, balances, referral stats, pool position.
2. `GET /users/:id/referrals`
   - Paginated list of direct referrals with status.
3. `GET /users/:id/tree`
   - Combined referral + pool tree snapshot (configurable depth).
4. `POST /users/register`
   - **Purpose**: Generate backend-signed payload for on-chain registration.
   - **Flow**:
     1. Validate referrer, ensure user not active.
     2. Compute placement metadata (pool level, parent, queue index).
     3. Reserve slot, create pending records (`placements`, `transactions`).
     4. Return `{ payload, signature, expiry, nonce }`.
5. `POST /users/register/confirm`
   - Optional ack; listener also updates state.
6. `POST /users/:id/retopup`
   - Similar to register: backend verifies eligibility, returns signed payload.
7. `GET /users/:id/history`
   - Aggregated data from `rewards`, `retopups`, `transactions`.
8. `POST /users/withdraw`
   - Request withdrawal (if using off-chain ledger). Backend queues payout.

### 3. Pool APIs
1. `GET /pool/summary`
   - Active trees, queue sizes, completed cycles per level.
2. `GET /pool/:level/queue`
   - BFS queue snapshot for UI.
3. `GET /pool/:level/nodes`
   - Node details (parent, children, status, layer).
4. `POST /pool/manual-placement` (admin)
   - Force place user at specified parent/slot (emergency override).

### 4. Reward & Payout APIs
1. `GET /rewards/pending`
   - Admin view of pending rewards (filters).
2. `POST /payouts/build-batch`
   - Create payout batch from pending rewards (time/amount capped).
3. `POST /payouts/:batchId/sign`
   - HSM/Signer signs EIP-712 payload.
4. `POST /payouts/:batchId/submit`
   - Settlement service submits tx to blockchain, updates statuses.
5. `POST /payouts/:batchId/retry`
   - Rebuild batch with new nonce/gas if tx fails.

### 5. Treasury & Monitoring APIs
1. `GET /treasury/summary`
   - Contract balances vs DB ledger.
2. `POST /treasury/transfer` (admin)
   - Move funds (e.g., top up payout wallet) – multi-sig protected.
3. `GET /monitoring/reconciliation`
   - Latest reconciliation results + discrepancies.
4. `POST /monitoring/replay-events`
   - Reprocess blockchain events for block range.

### 6. Admin APIs
- `POST /admin/users/:id/freeze` / `unfreeze`
- `POST /admin/config` (update percentages, entry fee, retopup policy)
- `GET /admin/logs`
- `GET /admin/audit`

---

## Backend Modules & Responsibilities

### A. UserModule
- Manage user lifecycle, wallet linking, status changes.
- Provide aggregated data for dashboards.

### B. ReferralModule
- Maintain referral graph & counts.
- Enforce referral rules (no self-referrals, duplicates).
- Provide tree traversal utilities.

### C. PoolModule
- Maintain binary pool trees (per level) + BFS queue.
- Determine parent placement.
- Track last-four nodes and reserved income contributions.
- Trigger auto-progression when node completes.

### D. RewardModule
- Create reward entries (direct, pool layers, level).
- Handle reserved income (store in `user_balances.reserved_income`).
- Provide statements, totals, payout eligibility.

### E. SettlementModule
- Build EIP-712 payloads for all on-chain actions (register, retopup, payouts).
- Sign using backend key (HSM).
- Submit via blockchain provider with nonce management.
- Handle retries, gas escalation, receipt tracking.

### F. ListenerModule
- Subscribe to contract events (`RegistrationAccepted`, `RetopupCompleted`, `PayoutExecuted`).
- Map events to DB entries (idempotent).
- Update statuses, trigger compensating logic if mismatch.
- Maintain `blockchain_sync.last_block`.

### G. AuditModule
- Log all admin actions, config changes, manual payouts.
- Export logs to S3/elastic for compliance.

### H. Monitoring/Reconciliation
- Scheduled job compares contract token balance vs DB ledger totals.
- Alerts if variance > threshold.
- Metrics: pending rewards, queue depth, tx success rate.

---

## Flow Logic Summaries

### Registration
1. Frontend → `POST /users/register`.
2. Backend validates, computes placement, reserves queue slot.
3. Backend returns signed payload.
4. User calls contract with payload + 20 BNB.
5. Contract verifies, holds funds, emits event.
6. Listener marks user active, updates DB, creates reward entries.
7. Settlement module batches payouts (direct + pool layers) and executes on-chain.

### Retopup
1. Backend verifies eligibility, returns signed payload.
2. User executes on-chain retopup paying 40 BNB.
3. Listener records event, creates level income rewards (10 layers with configured BPS).
4. Payout engine batches + settles rewards.

### Pool Placement & Layered Income
1. PoolModule picks parent from queue and records node.
2. Immediately creates layered rewards: 50% → parent, 25% → grandparent, 15% → great-grandparent, 10% → company.
3. Rewards stored as `pending` (or `reserved` if in last-four).
4. Settlement module batches rewards and executes payouts.
5. When nodes complete, PoolModule handles auto-progression or reserved income accumulation.

### Batch Payout
1. Rewards selected (by amount, type, SLA).
2. Build payload: `[ { user, amount, rewardIds[] }, ... ]` + nonce/expiry.
3. Sign using backend key.
4. Submit `executeBatchPayouts` on contract.
5. Contract transfers BNB, emits events per user.
6. Listener marks rewards settled, updates balances.

---

## Supporting Infrastructure
- **Redis**: queue snapshots, nonce caching, rate limiting.
- **Kafka/SQS**: event bus for settlement/listener coordination.
- **Prometheus/Grafana**: metrics (pending rewards, tx success, queue depth).
- **Sentry/Datadog**: error tracking.
- **Vault/HSM**: backend signer key.
- **CI/CD**: tests with Hardhat fork, integration suites.

---

## Security Controls
- All contract interactions require backend-signed payloads with nonce + expiry.
- Use HSM or dedicated signer microservice for key management.
- Strict RBAC on admin endpoints; actions logged in `audit_logs`.
- Reconciliation job ensures on-chain funds match DB ledger.
- Freeze capability per user + global kill switch.

---

## Next Steps
1. Finalize minimal smart-contract functions (register, retopup, batch payout).
2. Generate OpenAPI spec from above endpoints.
3. Scaffold backend modules (User, Pool, Reward, Settlement, Listener).
4. Implement DB migrations + seed data (company wallet).
5. Integrate signer service + payload format (EIP-712).
6. Stand up listener + reconciliation jobs.
7. Build monitoring dashboards + alerting.
8. End-to-end tests on BSC testnet before production.

