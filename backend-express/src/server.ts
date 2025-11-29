import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
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
    await startBlockchainListener();
    console.log('👂 Blockchain listener started');
  } catch (error) {
    console.error('❌ Failed to start blockchain listener:', error);
  }
});

export default app;