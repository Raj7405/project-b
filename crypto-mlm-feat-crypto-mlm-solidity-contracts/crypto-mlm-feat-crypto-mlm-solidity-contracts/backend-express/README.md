# Crypto MLM Platform - Express Backend

Express.js + TypeScript backend for the Crypto MLM Platform on BSC (BEP-20).

## Features

- 🚀 Express.js with TypeScript
- 🐘 PostgreSQL database with Prisma ORM
- ⛓️ BSC blockchain event listener
- 🔐 Secure API endpoints
- 📊 Real-time stats and analytics
- 🎯 RESTful API design

## Prerequisites

- Node.js (v18+ recommended)
- PostgreSQL (v14+)
- npm or yarn

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Update `.env` with your configuration:
   - Database URL
   - BSC RPC URL
   - Contract addresses

3. **Set up database:**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run migrations
   npm run db:migrate
   ```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## API Endpoints

### User APIs
- `GET /api/users/:userId` - Get user by ID
- `GET /api/users/wallet/:walletAddress` - Get user by wallet
- `GET /api/users/children/:parentId` - Get user's children
- `GET /api/users` - Get all users
- `GET /api/users/recent?days=7` - Get recent registrations
- `GET /api/users/count` - Get total users count
- `GET /api/users/retopup/count` - Get active re-topup count

### Transaction APIs
- `GET /api/transactions/user/:userId` - Get user transactions
- `GET /api/transactions/user/:userId/paginated?page=0&size=20` - Paginated transactions
- `GET /api/transactions/user/:userId/type/:type` - Transactions by type
- `GET /api/transactions/recent?days=7&limit=100` - Recent transactions
- `GET /api/transactions/user/:userId/income/:type` - Total income by type

### Stats APIs
- `GET /api/stats?recentDays=7` - Get platform statistics
- `GET /api/stats/health` - Health check

### Health Check
- `GET /health` - Server health check

## Transaction Types

- `REGISTRATION` - User registration
- `DIRECT_INCOME` - Direct income from sponsors
- `LEVEL_INCOME` - Level income from re-topup
- `AUTO_POOL_INCOME` - Auto pool income
- `RETOPUP` - Re-topup payment
- `RETOPUP_SKIPPED` - Skipped income (no re-topup)

## Database Schema

### Users Table
- `id` - User ID (from blockchain)
- `walletAddress` - Wallet address
- `parentId` - Parent user ID
- `sponsorCount` - Number of direct sponsors
- `hasReTopup` - Re-topup status
- `hasAutoPoolEntry` - Auto pool entry status
- `totalDirectIncome` - Total direct income earned
- `totalLevelIncome` - Total level income earned
- `totalAutoPoolIncome` - Total auto pool income earned

### Transactions Table
- `id` - Transaction ID (UUID)
- `txHash` - Blockchain transaction hash
- `userId` - User ID
- `walletAddress` - User wallet
- `type` - Transaction type
- `amount` - Amount in tokens
- `blockNumber` - Block number
- `description` - Description

## Blockchain Event Listener

The backend automatically listens to BSC blockchain events and updates the database:

- User registrations
- Income payments
- Re-topup transactions
- Auto pool entries

Configure polling interval in `.env`:
```
POLLING_INTERVAL=5000  # milliseconds
```

## Development

### Database Management

```bash
# Open Prisma Studio (GUI)
npm run db:studio

# Create new migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset
```

### TypeScript Compilation

```bash
# Build TypeScript
npm run build

# Watch mode
npm run dev
```

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/crypto_mlm

# BSC Blockchain
BSC_RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0x...
TOKEN_ADDRESS=0x...
START_BLOCK=0
CHAIN_ID=31337

# Polling
POLLING_INTERVAL=5000
```

## Project Structure

```
backend-express/
├── src/
│   ├── config/
│   │   ├── database.ts      # Prisma client
│   │   └── blockchain.ts    # BSC configuration
│   ├── controllers/
│   │   ├── user.controller.ts
│   │   ├── transaction.controller.ts
│   │   └── stats.controller.ts
│   ├── routes/
│   │   ├── user.routes.ts
│   │   ├── transaction.routes.ts
│   │   └── stats.routes.ts
│   ├── services/
│   │   └── blockchain-listener.service.ts
│   └── server.ts            # Main server file
├── prisma/
│   └── schema.prisma        # Database schema
├── package.json
├── tsconfig.json
└── .env
```

## Deployment

### Docker (Coming Soon)

### Manual Deployment

1. Set up PostgreSQL database
2. Configure environment variables
3. Build the application
4. Run migrations
5. Start the server

## Testing

```bash
# Run tests (coming soon)
npm test
```

## Troubleshooting

### Database Connection Issues
- Check PostgreSQL is running
- Verify DATABASE_URL is correct
- Ensure database exists

### Blockchain Connection Issues
- Check BSC_RPC_URL is accessible
- Verify contract addresses are correct
- Check START_BLOCK is valid

### Event Listener Not Working
- Verify contract is deployed
- Check POLLING_INTERVAL
- Review logs for errors

## License

MIT

