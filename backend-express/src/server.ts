import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { startBlockchainListener } from './services/blockchain-listener.service';
import { startBlockchainWsListener } from './services/blockchain-ws-listerner-service';
import authRoutes from './routes/auth.routes';
import transactionRoutes from './routes/transaction.routes';
import { connectRedis } from './redis/connection';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);

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

  // Connect to Redis (non-blocking, graceful failure)
  try {
    const redisConnected = await connectRedis();
    if (!redisConnected) {
      console.warn('⚠️  Server started without Redis connection');
    }
  } catch (error) {
    console.error('❌ Redis connection error (continuing without Redis):', error);
  }

  // Start blockchain event listener
  // WebSocket listener is optional - app will work with HTTP polling if WS fails
  try {
    await startBlockchainWsListener();
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.warn('⚠️  WebSocket listener failed to start (continuing with HTTP polling):', errorMsg);
    console.warn('   This is normal if BSC_WS_RPC is not set, invalid, or using HTTP URL.');
    console.warn('   The app will use HTTP polling which works reliably.');
  }

  // // HTTP polling listener (always start this as fallback)
  // try {
  //   await startBlockchainListener();
  //   console.log('✅ HTTP polling blockchain listener started');
  // } catch (error) {
  //   console.error('❌ Failed to start HTTP polling listener:', error);
  //   console.error('   This is critical - blockchain events will not be processed!');
  // }
});

export default app;