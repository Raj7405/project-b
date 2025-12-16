import { ethers } from 'ethers';
import prisma, { ensureDatabaseConnection } from '../config/database';
import { getProvider, getContract, CONTRACT_ABI } from '../config/blockchain';
import { PaymentStatus, TransactionType } from '@prisma/client';
import { processRegistrationPayout, processRetopupPayout } from './payout-distribution.service';

let isListening = false;
let lastProcessedBlock = BigInt(0);
let consecutiveErrors = 0;
let backoffDelay = 1000;
let isProcessing = false;

const FAST_POLLING_INTERVAL = parseInt(process.env.FAST_POLLING_INTERVAL || '50000');
const MAX_BLOCKS_PER_QUERY = BigInt(process.env.MAX_BLOCKS_PER_QUERY || '10');
const DELAY_BETWEEN_EVENT_TYPES = parseInt(process.env.DELAY_BETWEEN_EVENT_TYPES || '2000');
const MAX_CATCHUP_BLOCKS = BigInt(process.env.MAX_CATCHUP_BLOCKS || '5000');
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 3000;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isRateLimitError = (error: any): boolean => {
  return (
    error?.code === -32002 ||   
    error?.code === -32005 ||
    error?.code === 429 ||
    error?.message?.includes('limit exceeded') ||
    error?.message?.includes('rate limit') ||
    error?.message?.includes('too many requests') ||
    error?.message?.includes('exceeded')
  );
};

type EventProcessor = (
  contract: ethers.Contract,
  fromBlock: bigint,
  toBlock: bigint,
  fromWs?: boolean,
  wsEvent?: any
) => Promise<void>;

const processEventTypeWithRetry = async (
  contract: ethers.Contract,
  eventProcessor: EventProcessor,
  fromBlock: bigint,
  toBlock: bigint,
  eventName: string
): Promise<boolean> => {
  let retries = 0;
  let currentDelay = INITIAL_RETRY_DELAY;

  while (retries < MAX_RETRIES) {
    try {
      await eventProcessor(contract, fromBlock, toBlock);
      return true;
    } catch (error: any) {
      if (isRateLimitError(error)) {
        retries++;
        if (retries >= MAX_RETRIES) {
          console.log(`   ⚠️  ${eventName} rate limited after ${MAX_RETRIES} retries, skipping...`);
          return false;
        }
        console.log(`   ⏳ Rate limit hit for ${eventName}, waiting ${currentDelay}ms (retry ${retries}/${MAX_RETRIES})...`);
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

  console.log('🎧 Starting RATE-LIMIT FRIENDLY BSC blockchain event listener...');

  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    const provider = getProvider();
    const currentBlock = await provider.getBlockNumber();
    const currentBlockBigInt = BigInt(currentBlock);

    const sync = await prisma.blockchainSync.findFirst();
    if (sync) {
      lastProcessedBlock = sync.lastBlock;
    } else {
      lastProcessedBlock = currentBlockBigInt;
      await prisma.blockchainSync.create({
        data: { lastBlock: lastProcessedBlock }
      });
      console.log(`📍 Starting fresh from current block: ${lastProcessedBlock}`);
    }

    const blocksBehind = currentBlockBigInt - lastProcessedBlock;
    if (blocksBehind > MAX_CATCHUP_BLOCKS) {
      console.log(`⚠️  Too far behind (${blocksBehind} blocks). Resetting to last ${MAX_CATCHUP_BLOCKS} blocks...`);
      lastProcessedBlock = currentBlockBigInt - MAX_CATCHUP_BLOCKS;
      await prisma.blockchainSync.updateMany({
        data: { lastBlock: lastProcessedBlock }
      });
    }

    console.log(`📍 Starting from block: ${lastProcessedBlock}`);
    console.log(`📊 Current blockchain block: ${currentBlockBigInt}`);
    console.log(`📈 Blocks to catch up: ${currentBlockBigInt - lastProcessedBlock}`);
    console.log(`⚙️  RATE-LIMIT FRIENDLY MODE:`);
    console.log(`   - Polling: every ${FAST_POLLING_INTERVAL}ms`);
    console.log(`   - Chunk size: ${MAX_BLOCKS_PER_QUERY} blocks`);
    console.log(`   - Delay between event types: ${DELAY_BETWEEN_EVENT_TYPES}ms`);

    isListening = true;
    startPolling();
  } catch (error: any) {
    console.error('❌ Failed to start blockchain listener:', error.message);
    isListening = false;
    throw error;
  }
};

const startPolling = async () => {
  processEvents().catch(error => {
    console.error('❌ Error in initial processEvents:', error);
  });

  setInterval(async () => {
    if (!isProcessing) {
      try {
        await processEvents();
      } catch (error) {
        console.error('❌ Error processing events:', error);
      }
    }
  }, FAST_POLLING_INTERVAL);
};

const processEvents = async () => {
  if (isProcessing) {
    return;
  }

  isProcessing = true;
  const provider = getProvider();
  const contract = getContract();

  try {
    await ensureDatabaseConnection();
    
    const currentBlock = await provider.getBlockNumber();
    const currentBlockBigInt = BigInt(currentBlock);

    if (currentBlockBigInt <= lastProcessedBlock) {
      isProcessing = false;
      return;
    }

    const fromBlock = lastProcessedBlock + BigInt(1);
    const blocksBehind = currentBlockBigInt - lastProcessedBlock;

    const toBlock = fromBlock + MAX_BLOCKS_PER_QUERY - BigInt(1);
    const actualToBlock = toBlock > currentBlockBigInt ? currentBlockBigInt : toBlock;
    const actualChunkSize = Number(actualToBlock - fromBlock + BigInt(1));
    
    console.log(`\n📦 Processing blocks ${fromBlock} to ${actualToBlock} (${actualChunkSize} blocks) [${blocksBehind} behind]`);
    
    const eventTypes = [
      { name: 'RegistrationAccepted', processor: processRegistrationAcceptedEvents },
      { name: 'RetopupAccepted', processor: processRetopupAcceptedEvents },
      { name: 'PayoutExecuted', processor: processPayoutExecutedEvents },
      { name: 'BatchPayoutCompleted', processor: processBatchPayoutCompletedEvents }
    ];
    
    const results: boolean[] = [];
    
    for (let i = 0; i < eventTypes.length; i++) {
      const eventType = eventTypes[i];
      
      const success = await processEventTypeWithRetry(
        contract,
        eventType.processor,
        fromBlock,
        actualToBlock,
        eventType.name
      );
      
      results.push(success);
      
      if (success) {
        console.log(`   ✅ ${eventType.name}`);
      } else {
        console.log(`   ⚠️  ${eventType.name} failed/skipped`);
      }
      
      if (i < eventTypes.length - 1) {
        console.log(`   ⏸️  Waiting ${DELAY_BETWEEN_EVENT_TYPES}ms before next event type...`);
        await wait(DELAY_BETWEEN_EVENT_TYPES);
      }
    }
    
    const successCount = results.filter(r => r).length;
    
    lastProcessedBlock = actualToBlock;
    await ensureDatabaseConnection();
    await prisma.blockchainSync.updateMany({
      data: { lastBlock: lastProcessedBlock }
    });
    
    if (successCount === results.length) {
      console.log(`✅ Block ${lastProcessedBlock} - All events processed (${successCount}/${results.length})`);
      consecutiveErrors = 0;
      backoffDelay = 1000;
    } else {
      console.log(`⚠️  Block ${lastProcessedBlock} - Advanced (${successCount}/${results.length} succeeded)`);
    }

    isProcessing = false;

  } catch (error: any) {
    isProcessing = false;
    consecutiveErrors++;
    backoffDelay = Math.min(backoffDelay * 2, 30000);
    
    console.error('❌ Error in processEvents:', error.message || error);
    
    if (isRateLimitError(error)) {
      console.error(`\n💡 RATE LIMIT EXCEEDED`);
      console.error(`   Waiting ${backoffDelay}ms before retry...`);
      console.error(`\n   🔧 To fix permanently:`);
      console.error(`   1. Get a better RPC provider (QuickNode, Ankr, GetBlock)`);
      console.error(`   2. Or reduce MAX_BLOCKS_PER_QUERY in .env (current: ${MAX_BLOCKS_PER_QUERY})`);
      console.error(`   3. Or increase DELAY_BETWEEN_EVENT_TYPES (current: ${DELAY_BETWEEN_EVENT_TYPES}ms)\n`);
      await wait(backoffDelay);
    }
  }
};

export const processRegistrationAcceptedEvents = async (
  contract: ethers.Contract,
  fromBlock: bigint,
  toBlock: bigint,
  fromWs: boolean = false,
  wsEvent?: { user: string; backendCaller: string; amount: bigint; event: ethers.Log }
) => {
  let events: ethers.Log[] = [];

  if (fromWs && wsEvent) {
    console.log(`📥 [WS] Processing RegistrationAccepted event from WebSocket at block ${wsEvent.event.blockNumber}`);
    events = [wsEvent.event as ethers.Log];
  } else {
    const filter = contract.filters.RegistrationAccepted();
    events = await contract.queryFilter(filter, fromBlock, toBlock);

    if (events.length > 0) {
      console.log(`📥 [HTTP] Found ${events.length} RegistrationAccepted event(s) in blocks ${fromBlock} to ${toBlock}`);
    }
  }

  for (const event of events) {
    try {
      let user: string;
      let backendCaller: string;
      let amount: bigint;

      if (fromWs && wsEvent) {
        user = wsEvent.user;
        backendCaller = wsEvent.backendCaller;
        amount = wsEvent.amount;
      } else {
        if (!('args' in event)) continue;
        [user, backendCaller, amount] = event.args as any;
      }

      const walletAddress = user.toLowerCase(); 
      const amountInTokens = parseFloat(ethers.formatUnits(amount, 18));

      const source = fromWs ? '[WS]' : '[HTTP]';
      console.log(`${source} 🔍 Processing RegistrationAccepted event for: ${walletAddress}`);

      let dbUser = await prisma.user.findUnique({
        where: { walletAddress }
      });

      if (!dbUser) {
        console.log(`${source} ⚠️ User not found in database: ${walletAddress}, skipping registration event processing`);
        console.log(`${source} 💡 Make sure user was created in database before contract registration`);
        continue; 
      }

      await prisma.user.update({
        where: { id: dbUser.id },
        data: { paymentStatus: PaymentStatus.COMPLETED }
      });

      console.log(`${source} ✅ RegistrationAccepted: Wallet=${walletAddress}, Amount=${amountInTokens}`);

      const parentUser = dbUser.parentId
        ? await prisma.user.findUnique({
            where: { id: dbUser.parentId },
            select: { walletAddress: true }
          })
        : null;

      const parentWalletAddress = parentUser?.walletAddress || null;

      if (parentWalletAddress) {
        console.log(`${source} 🔄 Processing payout distribution for registration...`);
        try {
          await processRegistrationPayout(walletAddress, parentWalletAddress);
        } catch (payoutError) {
          console.error(`${source} ❌ Error processing registration payout:`, payoutError);
        }
      } else {
        console.log(`${source} ⚠️  No parent found for ${walletAddress}, skipping payout distribution`);
      }
    } catch (error) {
      const source = fromWs ? '[WS]' : '[HTTP]';
      console.error(`${source} Error processing RegistrationAccepted event:`, error);
    }
  }
};

export const processRetopupAcceptedEvents = async (
  contract: ethers.Contract,
  fromBlock: bigint,
  toBlock: bigint,
  fromWs: boolean = false,
  wsEvent?: { user: string; backendCaller: string; amount: bigint; totalRetopups: bigint; event: ethers.Log }
) => {
  let events: ethers.Log[] = [];

  if (fromWs && wsEvent) {
    console.log(`📥 [WS] Processing RetopupAccepted event from WebSocket at block ${wsEvent.event.blockNumber}`);
    events = [wsEvent.event as ethers.Log];
  } else {
    const filter = contract.filters.RetopupAccepted();
    events = await contract.queryFilter(filter, fromBlock, toBlock);

    if (events.length > 0) {
      console.log(`📥 [HTTP] Found ${events.length} RetopupAccepted event(s) in blocks ${fromBlock} to ${toBlock}`);
    }
  }

  for (const event of events) {
    try {
      let user: string;
      let backendCaller: string;
      let amount: bigint;
      let totalRetopups: bigint;

      if (fromWs && wsEvent) {
        user = wsEvent.user;
        backendCaller = wsEvent.backendCaller;
        amount = wsEvent.amount;
        totalRetopups = wsEvent.totalRetopups;
      } else {
        if (!('args' in event)) continue;
        [user, backendCaller, amount, totalRetopups] = event.args as any;
      }

      const walletAddress = user.toLowerCase();
      const amountInTokens = parseFloat(ethers.formatUnits(amount, 18));

      const source = fromWs ? '[WS]' : '[HTTP]';
      console.log(`${source} 🔍 Processing RetopupAccepted event for: ${walletAddress}`);

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
          console.log(`${source} ✅ RetopupAccepted: Wallet=${walletAddress}, Amount=${amountInTokens}, Count=${totalRetopups}`);
        } else {
          console.log(`${source} ⏭️  Retopup transaction already recorded: ${walletAddress}`);
        }

        console.log(`${source} 🔄 Processing retopup payout distribution...`);
        try {
          await processRetopupPayout(walletAddress);
        } catch (payoutError) {
          console.error(`${source} ❌ Error processing retopup payout:`, payoutError);
        }
      } else {
        console.log(`${source} ⚠️  RetopupAccepted for unknown user: ${walletAddress}`);
      }
    } catch (error) {
      const source = fromWs ? '[WS]' : '[HTTP]';
      console.error(`${source} Error processing RetopupAccepted event:`, error);
    }
  }
};

export const processPayoutExecutedEvents = async (
  contract: ethers.Contract,
  fromBlock: bigint,
  toBlock: bigint,
  fromWs: boolean = false,
  wsEvent?: { user: string; amount: bigint; rewardType: string; event: ethers.Log }
) => {
  let events: ethers.Log[] = [];

  if (fromWs && wsEvent) {
    console.log(`📥 [WS] Processing PayoutExecuted event from WebSocket at block ${wsEvent.event.blockNumber}`);
    events = [wsEvent.event as ethers.Log];
  } else {
    const filter = contract.filters.PayoutExecuted();
    events = await contract.queryFilter(filter, fromBlock, toBlock);

    if (events.length > 0) {
      console.log(`📥 [HTTP] Found ${events.length} PayoutExecuted event(s) in blocks ${fromBlock} to ${toBlock}`);
    }
  }

  for (const event of events) {
    try {
      let user: string;
      let amount: bigint;
      let rewardType: string;

      if (fromWs && wsEvent) {
        user = wsEvent.user;
        amount = wsEvent.amount;
        rewardType = wsEvent.rewardType;
      } else {
        if (!('args' in event)) continue;
        [user, amount, rewardType] = event.args as any;
      }

      const walletAddress = user.toLowerCase();
      const amountInTokens = parseFloat(ethers.formatUnits(amount, 18));

      const source = fromWs ? '[WS]' : '[HTTP]';
      console.log(`${source} 🔍 Processing PayoutExecuted event for: ${walletAddress}`);

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
          console.log(`${source} ⏭️  PayoutExecuted transaction already processed: ${walletAddress}, Type=${rewardType}`);
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

        console.log(`${source} ✅ PayoutExecuted: Wallet=${walletAddress}, Type=${rewardType}, Amount=${amountInTokens}`);
      } else {
        console.log(`${source} ⚠️  PayoutExecuted for unknown user: ${walletAddress}`);
      }
    } catch (error) {
      const source = fromWs ? '[WS]' : '[HTTP]';
      console.error(`${source} Error processing PayoutExecuted event:`, error);
    }
  }
};

export const processBatchPayoutCompletedEvents = async (
  contract: ethers.Contract,
  fromBlock: bigint,
  toBlock: bigint,
  fromWs: boolean = false,
  wsEvent?: { totalAmount: bigint; userCount: bigint; event: ethers.Log }
) => {
  let events: ethers.Log[] = [];

  if (fromWs && wsEvent) {
    console.log(`📥 [WS] Processing BatchPayoutCompleted event from WebSocket at block ${wsEvent.event.blockNumber}`);
    events = [wsEvent.event as ethers.Log];
  } else {
    const filter = contract.filters.BatchPayoutCompleted();
    events = await contract.queryFilter(filter, fromBlock, toBlock);

    if (events.length > 0) {
      console.log(`📥 [HTTP] Found ${events.length} BatchPayoutCompleted event(s) in blocks ${fromBlock} to ${toBlock}`);
    }
  }

  for (const event of events) {
    try {
      let totalAmount: bigint;
      let userCount: bigint;

      if (fromWs && wsEvent) {
        totalAmount = wsEvent.totalAmount;
        userCount = wsEvent.userCount;
      } else {
        if (!('args' in event)) continue;
        [totalAmount, userCount] = event.args as any;
      }

      const totalAmountInTokens = parseFloat(ethers.formatUnits(totalAmount, 18));
      const source = fromWs ? '[WS]' : '[HTTP]';

      console.log(`${source} ✅ BatchPayoutCompleted: Total=${totalAmountInTokens}, Users=${userCount}, TX=${event.transactionHash}`);
    } catch (error) {
      const source = fromWs ? '[WS]' : '[HTTP]';
      console.error(`${source} Error processing BatchPayoutCompleted event:`, error);
    }
  }
};
