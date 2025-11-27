import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import userRoutes from './routes/user.routes';
import transactionRoutes from './routes/transaction.routes';
import statsRoutes from './routes/stats.routes';
import { startBlockchainListener } from './services/blockchain-listener.service';
import authRoutes from './routes/auth.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
// app.use('/api/users', userRoutes);
// app.use('/api/transactions', transactionRoutes);
// app.use('/api/stats', statsRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 BSC RPC: ${process.env.BSC_RPC_URL}`);
  console.log(`📝 Contract: ${process.env.CONTRACT_ADDRESS}`);
  
  // Start blockchain event listener
  try {
    // await startBlockchainListener();
    console.log('👂 Blockchain listener started');
  } catch (error) {
    console.error('❌ Failed to start blockchain listener:', error);
  }
});

export default app;

// Step 1: [FRONTEND] Validation Check
//         ↓
//         POST /api/auth/validate-registration
//         {
//           walletAddress: "0x...",
//           uplineId: 123
//         }
        
//         Backend checks:
//         - Is uplineId valid?
//         - Is user already in DB or blockchain?
//         - Return: { canRegister: true/false, reason: "" }

// Step 2: [FRONTEND] Approve Tokens
//         ↓
//         tokenContract.approve(contractAddress, amount)
//         User confirms in MetaMask
//         Wait for confirmation

// Step 3: [FRONTEND] Register on Blockchain
//         ↓
//         contract.register(referrerAddress)
//         User confirms in MetaMask
//         Get txHash back
        
//         Optional: Show loading state while waiting

// Step 4: [BLOCKCHAIN LISTENER] Auto-detect Event
//         ↓
//         Listener (running 24/7) catches "UserRegistered" event
//         {
//           userId: 456,
//           userAddress: "0x...",
//           referrer: "0x...",
//           timestamp: 1234567890
//         }
        
//         Listener automatically:
//         - Saves user to DB (status: "active")
//         - Saves transaction log
//         - Updates referral tree
//         - Triggers notifications

// Step 5: [FRONTEND] Get User Data (Optional)
//         ↓
//         Poll or WebSocket to get updated user data
//         OR
//         POST /api/auth/sync-user
//         { txHash: "0x..." }
        
//         Backend returns the newly created user data