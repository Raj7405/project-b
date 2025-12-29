import { ethers } from 'ethers';
import prisma, { ensureDatabaseConnection } from '../config/database';
import { CONTRACT_ABI } from '../config/blockchain';
import {
  processRegistrationAcceptedEvents,
  processRetopupAcceptedEvents,
  processPayoutExecutedEvents,
  processBatchPayoutCompletedEvents
} from './blockchain-listener.service';

let wsProvider: ethers.WebSocketProvider | null = null;
let contract: ethers.Contract | null = null;
let isStarted = false;
let healthCheckInterval: NodeJS.Timeout | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 5000; // 5 seconds

/**
 * Stops the WebSocket listener and cleans up resources
 */
export const stopBlockchainWsListener = async () => {
  if (!isStarted) {
    return;
  }

  console.log('🛑 Stopping WebSocket listener...');
  
  // Clear reconnect timeout if exists
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  reconnectAttempts = 0; // Reset reconnect attempts
  
  try {
    if (contract) {
      // Remove all event listeners
      contract.removeAllListeners('RegistrationAccepted');
      contract.removeAllListeners('RetopupAccepted');
      contract.removeAllListeners('PayoutExecuted');
      contract.removeAllListeners('BatchPayoutCompleted');
    }

    // Clear health check interval if it exists
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
    }

    if (wsProvider) {
      await wsProvider.destroy();
    }
  } catch (error) {
    console.error('Error stopping WebSocket listener:', error);
  } finally {
    contract = null;
    wsProvider = null;
    isStarted = false;
    console.log('✅ WebSocket listener stopped');
  }
};

/**
 * Validates WebSocket URL format
 */
const validateWebSocketUrl = (url: string | undefined): boolean => {
  if (!url) {
    console.error('❌ BSC_WS_RPC environment variable is not set');
    return false;
  }

  // Check if they're using HTTP URL instead of WebSocket URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.error(`❌ Invalid: You're using an HTTP RPC URL as WebSocket URL`);
    console.error(`   HTTP URL: ${url.substring(0, 60)}...`);
    console.error('   ❌ HTTP endpoints do NOT support WebSocket connections!');
    console.error('   📝 You need a separate WebSocket endpoint (wss://...)');
    console.error('   💡 Options:');
    console.error('      1. Use QuickNode/Ankr/GetBlock for WebSocket endpoints');
    console.error('      2. Or leave BSC_WS_RPC empty to use HTTP polling only');
    return false;
  }

  // Check if it's a valid WebSocket URL
  const wsUrlPattern = /^wss?:\/\//i;
  if (!wsUrlPattern.test(url)) {
    console.error(`❌ Invalid WebSocket URL format: ${url.substring(0, 50)}...`);
    console.error('   WebSocket URL must start with ws:// or wss://');
    return false;
  }

  return true;
};

/**
 * Handles WebSocket connection errors and triggers reconnection
 */
const handleConnectionError = (error: Error, isInitialConnection: boolean = false) => {
  console.error(`❌ WebSocket connection error:`, error.message);
  
  if (isInitialConnection) {
    console.error('   This appears to be an invalid WebSocket URL or endpoint.');
    console.error('   Please verify BSC_WS_RPC environment variable is correct.');
  }

  // Clean up current connection
  if (contract) {
    contract.removeAllListeners('RegistrationAccepted');
    contract.removeAllListeners('RetopupAccepted');
    contract.removeAllListeners('PayoutExecuted');
    contract.removeAllListeners('BatchPayoutCompleted');
  }

  if (wsProvider) {
    wsProvider.destroy().catch(() => {
      // Ignore cleanup errors
    });
  }

  contract = null;
  wsProvider = null;
  isStarted = false;

  // Clear health check
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }

  // Attempt reconnection with exponential backoff
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1),
      60000 // Max 60 seconds
    );

    console.log(`🔄 Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay / 1000}s...`);

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      startBlockchainWsListener().catch((reconnectError) => {
        console.error('❌ Reconnection failed:', reconnectError);
      });
    }, delay);
  } else {
    console.error(`❌ Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. WebSocket listener stopped.`);
    console.error('   Please check your BSC_WS_RPC configuration and restart the service.');
    reconnectAttempts = 0;
  }
};

export const startBlockchainWsListener = async () => {
  if (isStarted) {
    console.log('🔁 WebSocket listener already running');
    return;
  }

  // Validate WebSocket URL
  const wsUrl = process.env.BSC_WS_RPC;
  if (!validateWebSocketUrl(wsUrl)) {
    console.error('❌ Cannot start WebSocket listener: Invalid configuration');
    return;
  }

  console.log('🔌 Starting BSC WebSocket listener...');
  console.log(`   URL: ${wsUrl?.substring(0, 30)}...`);

  try {
    await prisma.$connect();
    await ensureDatabaseConnection();

    // Create WebSocket provider with error handling
    try {
      wsProvider = new ethers.WebSocketProvider(wsUrl!);
      
      // Test connection with timeout to catch connection errors early
      const connectionTest = Promise.race([
        wsProvider.getBlockNumber(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
        )
      ]);
      
      await connectionTest;
      console.log('✅ WebSocket connection established');
      reconnectAttempts = 0; // Reset on successful connection
    } catch (connectionError: any) {
      // Connection failed during initialization
      const errorMsg = connectionError.message || String(connectionError);
      console.error('❌ WebSocket connection failed during initialization:', errorMsg);
      
      // Provide specific guidance for 404 errors
      if (errorMsg.includes('404') || errorMsg.includes('Unexpected server response')) {
        console.error('   💡 This usually means:');
        console.error('      - You\'re using an HTTP RPC URL instead of WebSocket URL');
        console.error('      - The WebSocket endpoint doesn\'t exist or is incorrect');
        console.error('      - HTTP endpoints (https://) cannot be used as WebSocket (wss://)');
        console.error('   ✅ Solution: Get a proper WebSocket endpoint or use HTTP polling only');
      }
      
      // Clean up the failed provider
      if (wsProvider) {
        try {
          await wsProvider.destroy();
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        wsProvider = null;
      }
      
      handleConnectionError(connectionError, true);
      return;
    }

    contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS!,
      CONTRACT_ABI,
      wsProvider
    );

    // RegistrationAccepted event handler
    contract.on(
      'RegistrationAccepted',
      async (user, backendCaller, amount, event) => {
        try {
          await processRegistrationAcceptedEvents(
            contract!,
            BigInt(event.blockNumber),
            BigInt(event.blockNumber),
            true,
            {
              user,
              backendCaller,
              amount,
              event
            }
          );
        } catch (error) {
          console.error('[WS] ❌ Error processing RegistrationAccepted event:', error);
        }
      }
    );

    // RetopupAccepted event handler
    contract.on(
      'RetopupAccepted',
      async (user, backendCaller, amount, totalRetopups, event) => {
        try {
          await processRetopupAcceptedEvents(
            contract!,
            BigInt(event.blockNumber),
            BigInt(event.blockNumber),
            true,
            {
              user,
              backendCaller,
              amount,
              totalRetopups,
              event
            }
          );
        } catch (error) {
          console.error('[WS] ❌ Error processing RetopupAccepted event:', error);
        }
      }
    );

    // PayoutExecuted event handler
    contract.on(
      'PayoutExecuted',
      async (user, amount, rewardType, event) => {
        try {
          await processPayoutExecutedEvents(
            contract!,
            BigInt(event.blockNumber),
            BigInt(event.blockNumber),
            true,
            {
              user,
              amount,
              rewardType,
              event
            }
          );
        } catch (error) {
          console.error('[WS] ❌ Error processing PayoutExecuted event:', error);
        }
      }
    );

    // BatchPayoutCompleted event handler
    contract.on(
      'BatchPayoutCompleted',
      async (totalAmount, userCount, event) => {
        try {
          await processBatchPayoutCompletedEvents(
            contract!,
            BigInt(event.blockNumber),
            BigInt(event.blockNumber),
            true,
            {
              totalAmount,
              userCount,
              event
            }
          );
        } catch (error) {
          console.error('[WS] ❌ Error processing BatchPayoutCompleted event:', error);
        }
      }
    );

    handleWsHealth();

    isStarted = true;
    console.log('✅ WebSocket listener started successfully');
  } catch (error: any) {
    console.error('❌ Failed to start WebSocket listener:', error.message || error);
    handleConnectionError(error, true);
    // Don't throw - let the reconnection logic handle it
  }
};

/**
 * Health check function that periodically verifies WebSocket connection
 */
const handleWsHealth = () => {
  if (!wsProvider) return;

  // Clear any existing health check interval
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  // Periodic health check every 30 seconds
  healthCheckInterval = setInterval(async () => {
    if (!isStarted || !wsProvider) {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
      }
      return;
    }

    try {
      // Try to get the latest block number as a health check
      await wsProvider.getBlockNumber();
    } catch (error: any) {
      console.error('❌ WebSocket health check failed:', error.message || error);
      
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
      }
      
      // Use the centralized error handler
      handleConnectionError(error, false);
    }
  }, 30000); // Check every 30 seconds
};

// Set up global error handler for unhandled WebSocket errors
// This must be after handleConnectionError is defined
process.on('unhandledRejection', (reason: any, promise) => {
  const errorMsg = reason?.message || String(reason);
  
  if (errorMsg.includes('WebSocket') || 
      errorMsg.includes('Unexpected server response') ||
      errorMsg.includes('404') ||
      reason?.code === 'ECONNREFUSED' ||
      reason?.code === 'ENOTFOUND') {
    console.error('[WS] ⚠️  Unhandled WebSocket error caught:', errorMsg);
    
    // Prevent app crash by handling the error
    if (isStarted && wsProvider) {
      handleConnectionError(
        reason instanceof Error ? reason : new Error(String(reason)),
        false
      );
    } else if (!isStarted) {
      // If not started, it might be an initial connection error
      console.error('[WS] ⚠️  WebSocket error before listener started.');
      console.error('[WS] ⚠️  App will continue with HTTP polling only.');
      // Don't crash - just log and continue
    }
    
    // Prevent the unhandled rejection from crashing the app
    return;
  }
});

// Also catch unhandled error events (for WebSocket connection errors)
process.on('uncaughtException', (error: Error) => {
  const errorMsg = error.message || String(error);
  
  if (errorMsg.includes('WebSocket') || 
      errorMsg.includes('Unexpected server response') ||
      errorMsg.includes('404')) {
    console.error('[WS] ⚠️  Uncaught WebSocket exception:', errorMsg);
    console.error('[WS] ⚠️  App will continue with HTTP polling only.');
    
    // Clean up and prevent crash
    if (isStarted) {
      handleConnectionError(error, false);
    }
    
    // Don't exit - let the app continue
    return;
  }
  
  // For other uncaught exceptions, let them through (or handle as needed)
  // console.error('Uncaught Exception:', error);
  // process.exit(1);
});
  