import { ethers, EventLog } from 'ethers';
import prisma from '../config/database';
import { getProvider, getContract, CONTRACT_ABI } from '../config/blockchain';
import { TransactionType } from '@prisma/client';

let isListening = false;
let lastProcessedBlock = BigInt(0);

export const startBlockchainListener = async () => {
  if (isListening) {
    console.log('Blockchain listener is already running');
    return;
  }

  isListening = true;
  console.log('🎧 Starting BSC blockchain event listener...');

  // Initialize last processed block from database
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

  // Start polling
  startPolling();
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

const processEvents = async () => {
  const provider = getProvider();
  const contract = getContract();

  try {
    const currentBlock = await provider.getBlockNumber();
    const currentBlockBigInt = BigInt(currentBlock);

    if (currentBlockBigInt <= lastProcessedBlock) {
      return;
    }

    console.log(`📦 Processing blocks ${lastProcessedBlock} to ${currentBlockBigInt}`);

    // Process all event types
    await processUserRegisteredEvents(contract, lastProcessedBlock, currentBlockBigInt);
    await processDirectIncomeEvents(contract, lastProcessedBlock, currentBlockBigInt);
    await processLevelIncomeEvents(contract, lastProcessedBlock, currentBlockBigInt);
    await processAutoPoolIncomeEvents(contract, lastProcessedBlock, currentBlockBigInt);
    await processReTopupEvents(contract, lastProcessedBlock, currentBlockBigInt);
    await processAutoPoolEnqueuedEvents(contract, lastProcessedBlock, currentBlockBigInt);
    await processSkippedIncomeEvents(contract, lastProcessedBlock, currentBlockBigInt);

    // Update last processed block
    lastProcessedBlock = currentBlockBigInt;
    await prisma.blockchainSync.updateMany({
      data: { lastBlock: lastProcessedBlock }
    });

    console.log(`✅ Processed up to block ${lastProcessedBlock}`);
  } catch (error) {
    console.error('Error in processEvents:', error);
  }
};

const processUserRegisteredEvents = async (
  contract: ethers.Contract,
  fromBlock: bigint,
  toBlock: bigint
) => {
  const filter = contract.filters.UserRegistered();
  const events = await contract.queryFilter(filter, fromBlock, toBlock);

  for (const event of events) {
    try {
      if (!(event instanceof EventLog)) continue;
      const [id, wallet, parentId, wentToAutoPool] = event.args as any;
      const userId = BigInt(id.toString());
      const parentIdBigInt = BigInt(parentId.toString());

      // Create or update user
      await prisma.user.upsert({
        where: { id: userId },
        create: {
          id: userId,
          walletAddress: wallet.toLowerCase(),
          parentId: parentIdBigInt > 0n ? parentIdBigInt : null,
          sponsorCount: 0,
          hasReTopup: false,
          hasAutoPoolEntry: wentToAutoPool
        },
        update: {
          walletAddress: wallet.toLowerCase(),
          parentId: parentIdBigInt > 0n ? parentIdBigInt : null
        }
      });

      // Increment parent's sponsor count
      if (parentIdBigInt > 0n) {
        await prisma.user.update({
          where: { id: parentIdBigInt },
          data: {
            sponsorCount: {
              increment: 1
            }
          }
        });
      }

      // Record registration transaction
      await prisma.transaction.create({
        data: {
          txHash: event.transactionHash,
          userId,
          walletAddress: wallet.toLowerCase(),
          type: TransactionType.REGISTRATION,
          amount: 20,
          blockNumber: BigInt(event.blockNumber),
          description: 'User registration'
        }
      });

      console.log(`✅ UserRegistered: ID=${userId}, Wallet=${wallet}`);
    } catch (error) {
      console.error('Error processing UserRegistered event:', error);
    }
  }
};

const processDirectIncomeEvents = async (
  contract: ethers.Contract,
  fromBlock: bigint,
  toBlock: bigint
) => {
  const filter = contract.filters.DirectIncomePaid();
  const events = await contract.queryFilter(filter, fromBlock, toBlock);

  for (const event of events) {
    try {
      if (!(event instanceof EventLog)) continue;
      const [toId, to, amount] = event.args as any;
      const userId = BigInt(toId.toString());
      const amountInTokens = parseFloat(ethers.formatUnits(amount, 18));

      // Update user's total direct income
      await prisma.user.update({
        where: { id: userId },
        data: {
          totalDirectIncome: {
            increment: amountInTokens
          }
        }
      });

      // Record transaction
      await prisma.transaction.create({
        data: {
          txHash: event.transactionHash,
          userId,
          walletAddress: to.toLowerCase(),
          type: TransactionType.DIRECT_INCOME,
          amount: amountInTokens,
          blockNumber: BigInt(event.blockNumber),
          description: 'Direct income from sponsor'
        }
      });

      console.log(`✅ DirectIncomePaid: ID=${userId}, Amount=${amountInTokens}`);
    } catch (error) {
      console.error('Error processing DirectIncomePaid event:', error);
    }
  }
};

const processLevelIncomeEvents = async (
  contract: ethers.Contract,
  fromBlock: bigint,
  toBlock: bigint
) => {
  const filter = contract.filters.LevelIncomePaid();
  const events = await contract.queryFilter(filter, fromBlock, toBlock);

  for (const event of events) {
    try {
      if (!(event instanceof EventLog)) continue;
      const [toId, to, amount, level] = event.args as any;
      const userId = BigInt(toId.toString());
      const amountInTokens = parseFloat(ethers.formatUnits(amount, 18));

      // Update user's total level income
      await prisma.user.update({
        where: { id: userId },
        data: {
          totalLevelIncome: {
            increment: amountInTokens
          }
        }
      });

      // Record transaction
      await prisma.transaction.create({
        data: {
          txHash: event.transactionHash,
          userId,
          walletAddress: to.toLowerCase(),
          type: TransactionType.LEVEL_INCOME,
          amount: amountInTokens,
          blockNumber: BigInt(event.blockNumber),
          description: `Level ${level} income from re-topup`
        }
      });

      console.log(`✅ LevelIncomePaid: ID=${userId}, Level=${level}, Amount=${amountInTokens}`);
    } catch (error) {
      console.error('Error processing LevelIncomePaid event:', error);
    }
  }
};

const processAutoPoolIncomeEvents = async (
  contract: ethers.Contract,
  fromBlock: bigint,
  toBlock: bigint
) => {
  const filter = contract.filters.AutoPoolIncomePaid();
  const events = await contract.queryFilter(filter, fromBlock, toBlock);

  for (const event of events) {
    try {
      if (!(event instanceof EventLog)) continue;
      const [toId, to, amount] = event.args as any;
      const userId = BigInt(toId.toString());
      const amountInTokens = parseFloat(ethers.formatUnits(amount, 18));

      // Update user's total auto pool income
      await prisma.user.update({
        where: { id: userId },
        data: {
          totalAutoPoolIncome: {
            increment: amountInTokens
          }
        }
      });

      // Record transaction
      await prisma.transaction.create({
        data: {
          txHash: event.transactionHash,
          userId,
          walletAddress: to.toLowerCase(),
          type: TransactionType.AUTO_POOL_INCOME,
          amount: amountInTokens,
          blockNumber: BigInt(event.blockNumber),
          description: 'Auto pool income'
        }
      });

      console.log(`✅ AutoPoolIncomePaid: ID=${userId}, Amount=${amountInTokens}`);
    } catch (error) {
      console.error('Error processing AutoPoolIncomePaid event:', error);
    }
  }
};

const processReTopupEvents = async (
  contract: ethers.Contract,
  fromBlock: bigint,
  toBlock: bigint
) => {
  const filter = contract.filters.ReTopupProcessed();
  const events = await contract.queryFilter(filter, fromBlock, toBlock);

  for (const event of events) {
    try {
      if (!(event instanceof EventLog)) continue;
      const [id, wallet, amount] = event.args as any;
      const userId = BigInt(id.toString());
      const amountInTokens = parseFloat(ethers.formatUnits(amount, 18));

      // Mark user as having done re-topup
      await prisma.user.update({
        where: { id: userId },
        data: {
          hasReTopup: true
        }
      });

      // Record transaction
      await prisma.transaction.create({
        data: {
          txHash: event.transactionHash,
          userId,
          walletAddress: wallet.toLowerCase(),
          type: TransactionType.RETOPUP,
          amount: amountInTokens,
          blockNumber: BigInt(event.blockNumber),
          description: 'Re-topup completed'
        }
      });

      console.log(`✅ ReTopupProcessed: ID=${userId}, Amount=${amountInTokens}`);
    } catch (error) {
      console.error('Error processing ReTopupProcessed event:', error);
    }
  }
};

const processAutoPoolEnqueuedEvents = async (
  contract: ethers.Contract,
  fromBlock: bigint,
  toBlock: bigint
) => {
  const filter = contract.filters.AutoPoolEnqueued();
  const events = await contract.queryFilter(filter, fromBlock, toBlock);

  for (const event of events) {
    try {
      if (!(event instanceof EventLog)) continue;
      const [id, wallet] = event.args as any;
      const userId = BigInt(id.toString());

      // Mark user as having entered auto pool
      await prisma.user.update({
        where: { id: userId },
        data: {
          hasAutoPoolEntry: true
        }
      });

      console.log(`✅ AutoPoolEnqueued: ID=${userId}`);
    } catch (error) {
      console.error('Error processing AutoPoolEnqueued event:', error);
    }
  }
};

const processSkippedIncomeEvents = async (
  contract: ethers.Contract,
  fromBlock: bigint,
  toBlock: bigint
) => {
  const filter = contract.filters.ReTopupSkippedToCompany();
  const events = await contract.queryFilter(filter, fromBlock, toBlock);

  for (const event of events) {
    try {
      if (!(event instanceof EventLog)) continue;
      const [skippedId, skippedWallet, amount, level] = event.args as any;
      const userId = BigInt(skippedId.toString());
      const amountInTokens = parseFloat(ethers.formatUnits(amount, 18));

      // Record skipped transaction
      await prisma.transaction.create({
        data: {
          txHash: event.transactionHash,
          userId,
          walletAddress: skippedWallet.toLowerCase(),
          type: TransactionType.RETOPUP_SKIPPED,
          amount: amountInTokens,
          blockNumber: BigInt(event.blockNumber),
          description: `Level ${level} income skipped (no re-topup)`
        }
      });

      console.log(`✅ ReTopupSkippedToCompany: ID=${userId}, Level=${level}`);
    } catch (error) {
      console.error('Error processing ReTopupSkippedToCompany event:', error);
    }
  }
};

