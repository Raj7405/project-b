import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

// Prisma 6: Standard configuration - reads DATABASE_URL from environment
// Enhanced connection handling with connection pooling
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Connection health check helper
export const ensureDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('❌ Database connection lost, attempting reconnect...', error);
    try {
      await prisma.$disconnect();
      await prisma.$connect();
      console.log('✅ Database reconnected successfully');
      return true;
    } catch (reconnectError) {
      console.error('❌ Failed to reconnect to database:', reconnectError);
      return false;
    }
  }
};

// Handle connection errors
prisma.$on('error' as never, (e: any) => {
  console.error('Prisma connection error:', {
    timestamp: new Date().toISOString(),
    message: e.message || 'Unknown error',
    target: e.target || 'unknown'
  });
});

// Graceful shutdown handlers
// Note: Prisma 6 doesn't support $on('beforeExit'), so we use process events directly
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}, disconnecting database...`);
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during database disconnection:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('beforeExit', async () => {
  try {
    await prisma.$disconnect();
  } catch (error) {
    // Ignore errors during beforeExit
  }
});

export default prisma;

