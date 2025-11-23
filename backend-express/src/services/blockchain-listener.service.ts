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
    await processPoolIncomeEvents(contract, lastProcessedBlock, currentBlockBigInt);
    await processRetopupEvents(contract, lastProcessedBlock, currentBlockBigInt);
    await processPoolPlacementEvents(contract, lastProcessedBlock, currentBlockBigInt);

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
      const [user, referrer, userId] = event.args as any;
      const userIdBigInt = BigInt(userId.toString());
      
      // Get referrer's user ID if referrer is not zero address
      let parentIdBigInt: bigint | null = null;
      if (referrer && referrer !== ethers.ZeroAddress) {
        try {
          const referrerInfo = await contract.getUserInfo(referrer);
          parentIdBigInt = BigInt(referrerInfo.id.toString());
        } catch (e) {
          // Referrer not found, continue
        }
      }

      // Create or update user
      await prisma.user.upsert({
        where: { id: userIdBigInt },
        create: {
          id: userIdBigInt,
          walletAddress: user.toLowerCase(),
          parentId: parentIdBigInt,
          sponsorCount: 0,
          hasReTopup: false,
          hasAutoPoolEntry: false // Will be updated by PoolPlacement event
        },
        update: {
          walletAddress: user.toLowerCase(),
          parentId: parentIdBigInt
        }
      });

      // Increment parent's sponsor count
      if (parentIdBigInt) {
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
          userId: userIdBigInt,
          walletAddress: user.toLowerCase(),
          type: TransactionType.REGISTRATION,
          amount: 20,
          blockNumber: BigInt(event.blockNumber),
          description: 'User registration'
        }
      });

      console.log(`✅ UserRegistered: ID=${userIdBigInt}, Wallet=${user}`);
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
  const filter = contract.filters.DirectIncomeEarned();
  const events = await contract.queryFilter(filter, fromBlock, toBlock);

  for (const event of events) {
    try {
      if (!(event instanceof EventLog)) continue;
      const [user, from, amount] = event.args as any;
      
      // Get user ID from address
      let userId: bigint;
      try {
        const userInfo = await contract.getUserInfo(user);
        userId = BigInt(userInfo.id.toString());
      } catch (e) {
        console.error('Could not get user info for direct income:', user);
        continue;
      }
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
          walletAddress: user.toLowerCase(),
          type: TransactionType.DIRECT_INCOME,
          amount: amountInTokens,
          blockNumber: BigInt(event.blockNumber),
          description: 'Direct income from sponsor'
        }
      });

      console.log(`✅ DirectIncomeEarned: ID=${userId}, Amount=${amountInTokens}`);
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
  const filter = contract.filters.LevelIncomeEarned();
  const events = await contract.queryFilter(filter, fromBlock, toBlock);

  for (const event of events) {
    try {
      if (!(event instanceof EventLog)) continue;
      const [user, from, level, amount] = event.args as any;
      
      // Get user ID from address
      let userId: bigint;
      try {
        const userInfo = await contract.getUserInfo(user);
        userId = BigInt(userInfo.id.toString());
      } catch (e) {
        console.error('Could not get user info for level income:', user);
        continue;
      }
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
          walletAddress: user.toLowerCase(),
          type: TransactionType.LEVEL_INCOME,
          amount: amountInTokens,
          blockNumber: BigInt(event.blockNumber),
          description: `Level ${level} income from re-topup`
        }
      });

      console.log(`✅ LevelIncomeEarned: ID=${userId}, Level=${level}, Amount=${amountInTokens}`);
    } catch (error) {
      console.error('Error processing LevelIncomePaid event:', error);
    }
  }
};

const processPoolIncomeEvents = async (
  contract: ethers.Contract,
  fromBlock: bigint,
  toBlock: bigint
) => {
  const filter = contract.filters.PoolIncomeEarned();
  const events = await contract.queryFilter(filter, fromBlock, toBlock);

  for (const event of events) {
    try {
      if (!(event instanceof EventLog)) continue;
      const [user, poolLevel, amount] = event.args as any;
      
      // Get user ID from address
      let userId: bigint;
      try {
        const userInfo = await contract.getUserInfo(user);
        userId = BigInt(userInfo.id.toString());
      } catch (e) {
        console.error('Could not get user info for pool income:', user);
        continue;
      }
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
          walletAddress: user.toLowerCase(),
          type: TransactionType.AUTO_POOL_INCOME,
          amount: amountInTokens,
          blockNumber: BigInt(event.blockNumber),
          description: `Pool level ${poolLevel} income`
        }
      });

      console.log(`✅ PoolIncomeEarned: ID=${userId}, PoolLevel=${poolLevel}, Amount=${amountInTokens}`);
    } catch (error) {
      console.error('Error processing AutoPoolIncomePaid event:', error);
    }
  }
};

const processRetopupEvents = async (
  contract: ethers.Contract,
  fromBlock: bigint,
  toBlock: bigint
) => {
  const filter = contract.filters.RetopupCompleted();
  const events = await contract.queryFilter(filter, fromBlock, toBlock);

  for (const event of events) {
    try {
      if (!(event instanceof EventLog)) continue;
      const [user, amount] = event.args as any;
      
      // Get user ID from address
      let userId: bigint;
      try {
        const userInfo = await contract.getUserInfo(user);
        userId = BigInt(userInfo.id.toString());
      } catch (e) {
        console.error('Could not get user info for retopup:', user);
        continue;
      }
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
          walletAddress: user.toLowerCase(),
          type: TransactionType.RETOPUP,
          amount: amountInTokens,
          blockNumber: BigInt(event.blockNumber),
          description: 'Re-topup completed'
        }
      });

      console.log(`✅ RetopupCompleted: ID=${userId}, Amount=${amountInTokens}`);
    } catch (error) {
      console.error('Error processing ReTopupProcessed event:', error);
    }
  }
};

const processPoolPlacementEvents = async (
  contract: ethers.Contract,
  fromBlock: bigint,
  toBlock: bigint
) => {
  const filter = contract.filters.PoolPlacement();
  const events = await contract.queryFilter(filter, fromBlock, toBlock);

  for (const event of events) {
    try {
      if (!(event instanceof EventLog)) continue;
      const [user, poolLevel, parent] = event.args as any;
      
      // Get user ID from address
      let userId: bigint;
      try {
        const userInfo = await contract.getUserInfo(user);
        userId = BigInt(userInfo.id.toString());
      } catch (e) {
        console.error('Could not get user info for pool placement:', user);
        continue;
      }

      // Mark user as having entered auto pool
      await prisma.user.update({
        where: { id: userId },
        data: {
          hasAutoPoolEntry: true
        }
      });

      console.log(`✅ PoolPlacement: ID=${userId}, PoolLevel=${poolLevel}`);
    } catch (error) {
      console.error('Error processing PoolPlacement event:', error);
    }
  }
};

