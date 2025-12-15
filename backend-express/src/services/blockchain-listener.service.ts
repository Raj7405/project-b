import { ethers } from 'ethers';
import prisma, { ensureDatabaseConnection } from '../config/database';
import { getProvider, getContract, CONTRACT_ABI } from '../config/blockchain';
import { PaymentStatus, TransactionType } from '@prisma/client';
import { processRegistrationPayout, processRetopupPayout } from './payout-distribution.service';

let isListening = false;
let lastProcessedBlock = BigInt(0);
let consecutiveErrors = 0;
let backoffDelay = 1000; 
let currentEventTypeIndex = 0; 

const MAX_BLOCKS_PER_QUERY = BigInt(process.env.MAX_BLOCKS_PER_QUERY || '50'); 
const DELAY_BETWEEN_CHUNKS = parseInt(process.env.DELAY_BETWEEN_CHUNKS || '5000'); 
const MAX_BLOCKS_BEHIND = BigInt(process.env.MAX_BLOCKS_BEHIND || '1000'); 
const MAX_RETRIES = 2; 
const PROCESS_ONE_EVENT_TYPE_PER_CYCLE = process.env.PROCESS_ONE_EVENT_TYPE_PER_CYCLE !== 'false'; 

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isRateLimitError = (error: any): boolean => {
  return (
    error?.code === -32005 ||
    error?.message?.includes('limit exceeded') ||
    error?.message?.includes('rate limit') ||
    error?.message?.includes('too many requests')
  );
};

const processEventTypeWithRetry = async (
  contract: ethers.Contract,
  eventProcessor: (contract: ethers.Contract, fromBlock: bigint, toBlock: bigint) => Promise<void>,
  fromBlock: bigint,
  toBlock: bigint,
  eventName: string
): Promise<boolean> => {
  let retries = 0;
  let currentDelay = 2000; // Start with 2 seconds

  while (retries < MAX_RETRIES) {
    try {
      await eventProcessor(contract, fromBlock, toBlock);
      return true;
    } catch (error: any) {
      if (isRateLimitError(error)) {
        retries++;
        if (retries >= MAX_RETRIES) {
          return false;
        }
        console.log(`   ⏳ Rate limit for ${eventName}, waiting ${currentDelay}ms (retry ${retries}/${MAX_RETRIES})...`);
        await wait(currentDelay);
        currentDelay *= 2; 
      } else {
        console.error(`   ❌ Error processing ${eventName}:`, error.message || error);
        return false;
      }
    }
  }
  return false;
};

export const startBlockchainListener = async () => {
  if (isListening) {
    console.log('Blockchain listener is already running');
    return;
  }

  console.log('🎧 Starting BSC blockchain event listener...');

  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    const sync = await prisma.blockchainSync.findFirst();
    if (sync) {
      lastProcessedBlock = sync.lastBlock;
    } else {
      const startBlock = process.env.START_BLOCK || '0';
      lastProcessedBlock = BigInt(startBlock);
      await prisma.blockchainSync.create({
        data: { lastBlock: lastProcessedBlock }
      });
    }

    console.log(`📍 Starting from block: ${lastProcessedBlock}`);
    console.log(`⚙️  Configuration: MAX_BLOCKS_PER_QUERY=${MAX_BLOCKS_PER_QUERY}, DELAY=${DELAY_BETWEEN_CHUNKS}ms`);

    isListening = true;
    startPolling();
  } catch (error: any) {
    console.error('❌ Failed to start blockchain listener:', error.message);
    console.error('💡 Database connection failed. Check DATABASE_URL and ensure database is accessible.');
    isListening = false;
    throw error;
  }
};

const startPolling = async () => {
  const pollingInterval = parseInt(process.env.POLLING_INTERVAL || '15000');

  processEvents().catch(error => {
    console.error('❌ Error in initial processEvents:', error);
  });

  setInterval(async () => {
    try {
      await processEvents();
    } catch (error) {
      console.error('❌ Error processing events:', error);
    }
  }, pollingInterval);
};

const processEvents = async () => {
  const provider = getProvider();
  const contract = getContract();

  

  try {

    const network = await provider.getNetwork();
    console.log('Listener network:', network.name, 'chainId:', network.chainId.toString());
    
    await ensureDatabaseConnection();
    
    const currentBlock = await provider.getBlockNumber();
    const currentBlockBigInt = BigInt(currentBlock);

    if (currentBlockBigInt <= lastProcessedBlock) {
      return;
    }

    const fromBlock = lastProcessedBlock === BigInt(0) ? lastProcessedBlock : lastProcessedBlock + BigInt(1);
    const totalBlocks = currentBlockBigInt - fromBlock + BigInt(1);

    if (totalBlocks > MAX_BLOCKS_BEHIND) {
      console.log(`⚠️  Too far behind (${totalBlocks} blocks). Skipping to recent blocks (${MAX_BLOCKS_BEHIND} blocks back)...`);
      const newStartBlock = currentBlockBigInt - MAX_BLOCKS_BEHIND;
      lastProcessedBlock = newStartBlock;
      await prisma.blockchainSync.updateMany({
        data: { lastBlock: lastProcessedBlock }
      });
      console.log(`📍 Reset to block: ${lastProcessedBlock}`);
      return;
    }

    const chunkToBlock = fromBlock + MAX_BLOCKS_PER_QUERY - BigInt(1);
    const actualToBlock = chunkToBlock > currentBlockBigInt ? currentBlockBigInt : chunkToBlock;
    const chunkSize = Number(actualToBlock - fromBlock + BigInt(1));
    
    // Track processing start time for timeout fallback
    const processingStartTime = Date.now();
    const MAX_PROCESSING_TIME = 120000; // 2 minutes max per block range
    
    console.log(`📦 Processing blocks ${fromBlock} to ${actualToBlock} (${chunkSize} blocks)`);
    
    // Process ALL event types in one cycle for guaranteed block advancement
    const eventTypes = [
      { name: 'RegistrationAccepted', processor: processRegistrationAcceptedEvents },
      { name: 'RetopupAccepted', processor: processRetopupAcceptedEvents },
      { name: 'PayoutExecuted', processor: processPayoutExecutedEvents },
      { name: 'BatchPayoutCompleted', processor: processBatchPayoutCompletedEvents }
    ];
    
    const results: boolean[] = [];
    
    // Process all event types sequentially
    for (const eventType of eventTypes) {
      try {
        const success = await processEventTypeWithRetry(
          contract,
          eventType.processor,
          fromBlock,
          actualToBlock,
          eventType.name
        );
        results.push(success);
        
        if (success) {
          console.log(`   ✅ ${eventType.name} processed successfully`);
        } else {
          console.log(`   ⚠️  ${eventType.name} failed (will retry in next cycle)`);
        }
        
        // Small delay between event types to avoid rate limits
        await wait(500);
      } catch (error: any) {
        console.error(`   ❌ Error processing ${eventType.name}:`, error.message || error);
        results.push(false);
      }
    }
    
    // ✅ CRITICAL FIX: Always advance block, even if some events failed
    // This ensures listener never gets stuck
    const allSucceeded = results.every(r => r);
    const someSucceeded = results.some(r => r);
    const processingTime = Date.now() - processingStartTime;
    
    if (allSucceeded) {
      // All events processed successfully
      lastProcessedBlock = actualToBlock;
      await ensureDatabaseConnection();
      await prisma.blockchainSync.updateMany({
        data: { lastBlock: lastProcessedBlock }
      });
      console.log(`✅ All event types processed successfully. Advanced to block ${lastProcessedBlock}`);
      consecutiveErrors = 0;
      backoffDelay = 1000;
    } else if (someSucceeded || processingTime > MAX_PROCESSING_TIME) {
      // Some events succeeded OR timeout reached - advance block anyway
      // This prevents listener from getting stuck on failed events
      lastProcessedBlock = actualToBlock;
      await ensureDatabaseConnection();
      await prisma.blockchainSync.updateMany({
        data: { lastBlock: lastProcessedBlock }
      });
      
      if (processingTime > MAX_PROCESSING_TIME) {
        console.log(`⏰ Timeout reached (${processingTime}ms). Advanced to block ${lastProcessedBlock} to prevent stalling`);
      } else {
        console.log(`✅ Some events processed. Advanced to block ${lastProcessedBlock} (${results.filter(r => r).length}/${results.length} succeeded)`);
      }
      
      consecutiveErrors = 0;
      backoffDelay = 1000;
    } else {
      // All events failed - still advance block to prevent infinite retry
      // But increase error count for backoff
      lastProcessedBlock = actualToBlock;
      await ensureDatabaseConnection();
      await prisma.blockchainSync.updateMany({
        data: { lastBlock: lastProcessedBlock }
      });
      console.log(`⚠️  All events failed, but advancing block ${lastProcessedBlock} to prevent stalling`);
      consecutiveErrors++;
      backoffDelay = Math.min(backoffDelay * 2, 30000);
    }
  } catch (error: any) {
    consecutiveErrors++;
    backoffDelay = Math.min(backoffDelay * 2, 30000);
    
    console.error('Error in processEvents:', error.message || error);
    
    if (isRateLimitError(error)) {
      console.error(`\n💡 Rate limit exceeded. Waiting ${backoffDelay}ms before next attempt...`);
      console.error('   Consider:');
      console.error(`   1. Reduce MAX_BLOCKS_PER_QUERY in .env (current: ${MAX_BLOCKS_PER_QUERY})`);
      console.error(`   2. Increase DELAY_BETWEEN_CHUNKS (current: ${DELAY_BETWEEN_CHUNKS}ms)`);
      console.error('   3. Use a premium RPC provider with higher limits');
      await wait(backoffDelay);
    }
  }
};

const processRegistrationAcceptedEvents = async (
  contract: ethers.Contract,
  fromBlock: bigint,
  toBlock: bigint
) => {
  const filter = contract.filters.RegistrationAccepted();
  const events = await contract.queryFilter(filter, fromBlock, toBlock);

  if (events.length > 0) {
    console.log(`📥 Found ${events.length} RegistrationAccepted event(s) in blocks ${fromBlock} to ${toBlock}`);
  }

  for (const event of events) {
    try {
      if (!('args' in event)) continue;

      const [user, backendCaller, amount] = event.args as any;
      // Normalize wallet address to lowercase (Ethereum addresses are case-insensitive)
      const walletAddress = user.toLowerCase(); 
      const amountInTokens = parseFloat(ethers.formatUnits(amount, 18));

      console.log(`🔍 Processing RegistrationAccepted event for: ${walletAddress}`);

      let dbUser = await prisma.user.findUnique({
        where: { walletAddress }
      });

      if (!dbUser) {
        console.log(`⚠️ User not found in database: ${walletAddress}, skipping registration event processing`);
        console.log(`💡 Make sure user was created in database before contract registration`);
        continue; 
      }

      await prisma.user.update({
        where: { id: dbUser.id },
        data: { paymentStatus: PaymentStatus.COMPLETED }
      });

      console.log(`✅ RegistrationAccepted: Wallet=${walletAddress}, Amount=${amountInTokens}`);

      const parentUser = dbUser.parentId
        ? await prisma.user.findUnique({
            where: { id: dbUser.parentId },
            select: { walletAddress: true }
          })
        : null;

      const parentWalletAddress = parentUser?.walletAddress || null;

      if (parentWalletAddress) {
        console.log(`🔄 Processing payout distribution for registration...`);
        try {
          await processRegistrationPayout(walletAddress, parentWalletAddress);
        } catch (payoutError) {
          console.error('❌ Error processing registration payout:', payoutError);
        }
      } else {
        console.log(`⚠️  No parent found for ${walletAddress}, skipping payout distribution`);
      }
    } catch (error) {
      console.error('Error processing RegistrationAccepted event:', error);
    }
  }
};

const processRetopupAcceptedEvents = async (
  contract: ethers.Contract,
  fromBlock: bigint,
  toBlock: bigint
) => {
  const filter = contract.filters.RetopupAccepted();
  const events = await contract.queryFilter(filter, fromBlock, toBlock);

  for (const event of events) {
    try {
      if (!('args' in event)) continue;
      const [user, backendCaller, amount, totalRetopups] = event.args as any;
      // Normalize wallet address to lowercase (Ethereum addresses are case-insensitive)
      const walletAddress = user.toLowerCase();
      const amountInTokens = parseFloat(ethers.formatUnits(amount, 18));

      const dbUser = await prisma.user.findUnique({
        where: { walletAddress }
      });

      if (dbUser) {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: {
            hasReTopup: true
          }
        });

        const existingRetopupTx = await prisma.transaction.findFirst({
          where: {
            txHash: event.transactionHash,
            userId: dbUser.id,
            type: TransactionType.RETOPUP
          }
        });

        if (!existingRetopupTx) {
          await prisma.transaction.create({
            data: {
              txHash: event.transactionHash,
              userId: dbUser.id,
              walletAddress,
              type: TransactionType.RETOPUP,
              amount: amountInTokens,
              blockNumber: BigInt(event.blockNumber),
              description: `Retopup #${totalRetopups} accepted by backend: ${backendCaller}`
            }
          });
          console.log(`✅ RetopupAccepted: Wallet=${walletAddress}, Amount=${amountInTokens}, Count=${totalRetopups}`);
        } else {
          console.log(`⏭️  Retopup transaction already recorded: ${walletAddress}`);
        }

        console.log(`🔄 Processing retopup payout distribution...`);
        try {
          await processRetopupPayout(walletAddress);
        } catch (payoutError) {
          console.error('❌ Error processing retopup payout:', payoutError);
        }
      } else {
        console.log(`⚠️  RetopupAccepted for unknown user: ${walletAddress}`);
      }
    } catch (error) {
      console.error('Error processing RetopupAccepted event:', error);
    }
  }
};

const processPayoutExecutedEvents = async (
  contract: ethers.Contract,
  fromBlock: bigint,
  toBlock: bigint
) => {
  const filter = contract.filters.PayoutExecuted();
  const events = await contract.queryFilter(filter, fromBlock, toBlock);

  for (const event of events) {
    try {
      if (!('args' in event)) continue;
      const [user, amount, rewardType] = event.args as any;
      // Normalize wallet address to lowercase (Ethereum addresses are case-insensitive)
      const walletAddress = user.toLowerCase();
      const amountInTokens = parseFloat(ethers.formatUnits(amount, 18));

      const dbUser = await prisma.user.findUnique({
        where: { walletAddress }
      });

      if (dbUser) {
        let transactionType: TransactionType;
        if (rewardType.includes('DIRECT')) {
          transactionType = TransactionType.DIRECT_INCOME;
        } else if (rewardType.includes('LEVEL')) {
          transactionType = TransactionType.LEVEL_INCOME;
        } else if (rewardType.includes('POOL') || rewardType.includes('AUTO')) {
          transactionType = TransactionType.AUTO_POOL_INCOME;
        } else {
          transactionType = TransactionType.DIRECT_INCOME;
        }

        const existingTransaction = await prisma.transaction.findFirst({
          where: {
            txHash: event.transactionHash,
            userId: dbUser.id,
            type: transactionType
          }
        });

        if (existingTransaction) {
          console.log(`⏭️  PayoutExecuted transaction already processed: ${walletAddress}, Type=${rewardType}`);
          continue; 
        }

        if (rewardType.includes('DIRECT')) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              totalDirectIncome: { increment: amountInTokens }
            }
          });
        } else if (rewardType.includes('LEVEL')) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              totalLevelIncome: { increment: amountInTokens }
            }
          });
        } else if (rewardType.includes('POOL') || rewardType.includes('AUTO')) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              totalAutoPoolIncome: { increment: amountInTokens }
            }
          });
        }

        await prisma.transaction.create({
          data: {
            txHash: event.transactionHash,
            userId: dbUser.id,
            walletAddress,
            type: transactionType,
            amount: amountInTokens,
            blockNumber: BigInt(event.blockNumber),
            description: `Payout executed: ${rewardType}`
          }
        });

        console.log(`✅ PayoutExecuted: Wallet=${walletAddress}, Type=${rewardType}, Amount=${amountInTokens}`);
      } else {
        console.log(`⚠️  PayoutExecuted for unknown user: ${walletAddress}`);
      }
    } catch (error) {
      console.error('Error processing PayoutExecuted event:', error);
    }
  }
};

const processBatchPayoutCompletedEvents = async (
  contract: ethers.Contract,
  fromBlock: bigint,
  toBlock: bigint
) => {
  const filter = contract.filters.BatchPayoutCompleted();
  const events = await contract.queryFilter(filter, fromBlock, toBlock);

  for (const event of events) {
    try {
      if (!('args' in event)) continue;
      const [totalAmount, userCount] = event.args as any;
      const totalAmountInTokens = parseFloat(ethers.formatUnits(totalAmount, 18));

      console.log(`✅ BatchPayoutCompleted: Total=${totalAmountInTokens}, Users=${userCount}, TX=${event.transactionHash}`);
    } catch (error) {
      console.error('Error processing BatchPayoutCompleted event:', error);
    }
  }
};
