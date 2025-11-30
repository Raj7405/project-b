import { ethers } from 'ethers';
import prisma, { ensureDatabaseConnection } from '../config/database';
import { getProvider, getContract, CONTRACT_ABI } from '../config/blockchain';
import { PaymentStatus, TransactionType } from '@prisma/client';
import { processRegistrationPayout, processRetopupPayout } from './payout-distribution.service';

let isListening = false;
let lastProcessedBlock = BigInt(0);

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
  const pollingInterval = parseInt(process.env.POLLING_INTERVAL || '5000');

  setInterval(async () => {
    try {
      await processEvents();
    } catch (error) {
      console.error('❌ Error processing events:', error);
    }
  }, pollingInterval);
};

// Database connection is handled by ensureDatabaseConnection from database.ts

const processEvents = async () => {
  const provider = getProvider();
  const contract = getContract();

  try {
    await ensureDatabaseConnection();
    
    const currentBlock = await provider.getBlockNumber();
    const currentBlockBigInt = BigInt(currentBlock);

    if (currentBlockBigInt <= lastProcessedBlock) {
      return;
    }

    console.log(`📦 Processing blocks ${lastProcessedBlock} to ${currentBlockBigInt}`);

    // Process events (inclusive range - need to query fromBlock + 1 to catch new events)
    const fromBlock = lastProcessedBlock === BigInt(0) ? BigInt(0) : lastProcessedBlock + BigInt(1);
    await processRegistrationAcceptedEvents(contract, fromBlock, currentBlockBigInt);
    await processRetopupAcceptedEvents(contract, fromBlock, currentBlockBigInt);
    await processPayoutExecutedEvents(contract, fromBlock, currentBlockBigInt);
    await processBatchPayoutCompletedEvents(contract, fromBlock, currentBlockBigInt);

    lastProcessedBlock = currentBlockBigInt;
    
    // Ensure connection before updating database
    await ensureDatabaseConnection();
    await prisma.blockchainSync.updateMany({
      data: { lastBlock: lastProcessedBlock }
    });

    console.log(`✅ Processed up to block ${lastProcessedBlock}`);
  } catch (error: any) {
    console.error('Error in processEvents:', error.message || error);
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

      // Find user by wallet address
      const dbUser = await prisma.user.findUnique({
        where: { walletAddress }
      });

      if (dbUser) {
        // Mark user as having done retopup
        await prisma.user.update({
          where: { id: dbUser.id },
          data: {
            hasReTopup: true
          }
        });

        // Check if transaction already exists (to avoid duplicates)
        const existingRetopupTx = await prisma.transaction.findFirst({
          where: {
            txHash: event.transactionHash,
            userId: dbUser.id,
            type: TransactionType.RETOPUP
          }
        });

        if (!existingRetopupTx) {
          // Record retopup transaction
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

        // Process retopup payout distribution (level income to 10 uplines)
        console.log(`🔄 Processing retopup payout distribution...`);
        try {
          await processRetopupPayout(walletAddress);
        } catch (payoutError) {
          console.error('❌ Error processing retopup payout:', payoutError);
          // Don't throw - continue processing other events
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

      // Find user by wallet address
      const dbUser = await prisma.user.findUnique({
        where: { walletAddress }
      });

      if (dbUser) {
        // Determine transaction type based on rewardType string
        let transactionType: TransactionType;
        if (rewardType.includes('DIRECT')) {
          transactionType = TransactionType.DIRECT_INCOME;
        } else if (rewardType.includes('LEVEL')) {
          transactionType = TransactionType.LEVEL_INCOME;
        } else if (rewardType.includes('POOL') || rewardType.includes('AUTO')) {
          transactionType = TransactionType.AUTO_POOL_INCOME;
        } else {
          transactionType = TransactionType.DIRECT_INCOME; // Default
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

        // Update user income
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

        // Record payout transaction
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
      // Note: Individual payouts are tracked via PayoutExecuted events
    } catch (error) {
      console.error('Error processing BatchPayoutCompleted event:', error);
    }
  }
};