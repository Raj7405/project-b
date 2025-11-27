import { ethers } from 'ethers';
import prisma from '../config/database';
import { getProvider, getContract, CONTRACT_ABI } from '../config/blockchain';
import { TransactionType } from '@prisma/client';
import { processRegistrationPayout, processRetopupPayout } from './payout-distribution.service';

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

    await processRegistrationAcceptedEvents(contract, lastProcessedBlock, currentBlockBigInt);
    await processRetopupAcceptedEvents(contract, lastProcessedBlock, currentBlockBigInt);
    await processPayoutExecutedEvents(contract, lastProcessedBlock, currentBlockBigInt);
    await processBatchPayoutCompletedEvents(contract, lastProcessedBlock, currentBlockBigInt);

    lastProcessedBlock = currentBlockBigInt;
    await prisma.blockchainSync.updateMany({
      data: { lastBlock: lastProcessedBlock }
    });

    console.log(`✅ Processed up to block ${lastProcessedBlock}`);
  } catch (error) {
    console.error('Error in processEvents:', error);
  }
};

const processRegistrationAcceptedEvents = async (
  contract :ethers.Contract,
  fromBlock: bigint,
  toBlock:bigint
) =>{
  const filter= contract.filters.RegistrationAccepted()
  const events= await contract.queryFilter(filter,fromBlock,toBlock)

  for (const event of events){
    try{
      if (!('args' in event))continue;

      const [user, backendCaller, amount] = event.args as any;
      const walletAddress = user.toLowerCase(); 
      const amountInTokens = parseFloat(ethers.formatUnits(amount, 18));

      let dbUser = await prisma.user.findUnique({
        where: { walletAddress }
      });

      if (!dbUser) {
        const newUplineId = createUplineId();
        dbUser = await prisma.user.create({
          data: {
            id: newUplineId,
            walletAddress,
            parentId: null,
            sponsorCount: 0,
            hasReTopup: false,
            hasAutoPoolEntry: false,
            totalDirectIncome: 0,
            totalLevelIncome: 0,
            totalAutoPoolIncome: 0
          }
        });

        console.log(`✅ Created new user from RegistrationAccepted: ID=${newUplineId}, Wallet=${walletAddress}`);
      }

      if (dbUser) {
        await prisma.transaction.create({
          data: {
            txHash: event.transactionHash,
            userId: dbUser.id,
            walletAddress,
            type: TransactionType.REGISTRATION,
            amount: amountInTokens,
            blockNumber: BigInt(event.blockNumber),
            description: `Registration accepted by backend: ${backendCaller}`
          }
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
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              totalDirectIncome: { increment: amountInTokens }
            }
          });
        } else if (rewardType.includes('LEVEL')) {
          transactionType = TransactionType.LEVEL_INCOME;
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              totalLevelIncome: { increment: amountInTokens }
            }
          });
        } else if (rewardType.includes('POOL') || rewardType.includes('AUTO')) {
          transactionType = TransactionType.AUTO_POOL_INCOME;
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              totalAutoPoolIncome: { increment: amountInTokens }
            }
          });
        } else {
          transactionType = TransactionType.DIRECT_INCOME; // Default
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

const createUplineId = (): string => {
  const digits = Math.floor(100 + Math.random() * 900);
  const alphabets = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${digits}-${alphabets}`;
};

