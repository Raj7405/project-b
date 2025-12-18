import { ethers } from 'ethers';
import prisma from '../config/database';
import { getRedisClient } from '../redis/connection';
import { User } from '@prisma/client';
import { 
  executeBatchPayouts, 
  getCompanyWallet, 
  getContractBalance 
} from './blockchain-thirdweb.service';

const DIRECT_INCOME_BNB = 18;
const COMPANY_FEE_BNB = 2;
const TOKEN_DECIMALS = 18;
const RETOPUP_PRICE_BNB = 40;
const levelPercentages = [3000, 1500, 1000, 500, 500, 500, 500, 500, 1000, 1000];
const AUTO_POOL_REDIS_KEY ='autopool:placement:queue'
const COMPLETE_POOL_SIZE = 15;
const LAST_NODES_COUNT = 4;
const MAX_TREES_PER_LEVEL = 15;
const ENTRY_PRICE_BNB = 20;
const LAYER_1_PERCENT = 50;  
const LAYER_2_PERCENT = 25;  
const LAYER_3_PERCENT = 15;  
const COMPANY_FEE_PERCENT = 10;

const bnbToWei = (bnbAmount: number): bigint => {
  return ethers.parseUnits(bnbAmount.toString(), TOKEN_DECIMALS);
};

export const processRegistrationPayout = async (
  newUserWalletAddress: string,
  parentWalletAddress: string | null
): Promise<void> => {
  try {

    if (!parentWalletAddress) {
      console.log(`⚠️  No parent found for ${newUserWalletAddress}, skipping payout distribution`);
      return;
    }

    parentWalletAddress = parentWalletAddress.toLocaleLowerCase()
    newUserWalletAddress = newUserWalletAddress.toLocaleLowerCase()

    const parentUser = await prisma.user.findUnique({
      where: { walletAddress: parentWalletAddress }
    });

    if (!parentUser) {
      console.log(`⚠️  Parent user not found in database: ${parentWalletAddress}, skipping payout`);
      return;
    }

    const currentSponsorCount = parentUser.sponsorCount;
    const newSponsorCount = currentSponsorCount + 1;

    await prisma.user.update({
      where: { id: parentUser.id },
      data: { sponsorCount: newSponsorCount }
    });

    console.log(`📊 Parent ${parentWalletAddress} sponsor count: ${currentSponsorCount} → ${newSponsorCount}`);

    if (newSponsorCount === 2) {
      console.log(`🔄 2nd referral detected for ${parentWalletAddress}. Auto Pool placement will be handled separately.`);
      await processAutoPoolPayout(newUserWalletAddress,parentWalletAddress)
      return;
    }

    const companyWallet = await getCompanyWallet();
    
    const directIncomeWei = bnbToWei(DIRECT_INCOME_BNB);
    const companyFeeWei = bnbToWei(COMPANY_FEE_BNB);

    const contractBalance = await getContractBalance();
    if (contractBalance < (directIncomeWei + companyFeeWei)) {
      throw new Error(`Insufficient contract balance. Required: ${ethers.formatEther(directIncomeWei + companyFeeWei)} BNB, Available: ${ethers.formatEther(contractBalance)} BNB`);
    }

    const users = [parentWalletAddress, companyWallet];
    const amounts = [directIncomeWei, companyFeeWei];
    const rewardTypes = ['DIRECT_INCOME', 'COMPANY_FEE'];

    console.log(`💰 Distributing registration payout:`);
    console.log(`   - Parent (${parentWalletAddress}): ${DIRECT_INCOME_BNB} BNB (Direct Income)`);
    console.log(`   - Company (${companyWallet}): ${COMPANY_FEE_BNB} BNB (Company Fee)`);

    const result = await executeBatchPayouts(users, amounts, rewardTypes);
    console.log(`📤 Batch payout transaction sent: ${result.transactionHash}`);
    
    const receipt = result.receipt;
    const blockNumber = receipt?.blockNumber || receipt?.block || 'unknown';
    console.log(`✅ Batch payout confirmed in block ${blockNumber}`);

    await prisma.user.update({
      where: { id: parentUser.id },
      data: {
        totalDirectIncome: {
          increment: DIRECT_INCOME_BNB
        }
      }
    });

        await prisma.transaction.create({
          data: {
            txHash: result.transactionHash,
            userId: parentUser.id,
            walletAddress: parentWalletAddress,
            type: 'DIRECT_INCOME',
            amount: DIRECT_INCOME_BNB,
            blockNumber: BigInt(blockNumber || 0),
            description: `Direct income from referral #${newSponsorCount}`
          }
        });

    console.log(`✅ Payout distribution completed for registration`);

  } catch (error) {
    console.error('❌ Error processing registration payout:', error);
    throw error;
  }
};

export const processRetopupPayout = async (
  retopupUserWalletAddress: string
): Promise<void> => {
  try {
    retopupUserWalletAddress = retopupUserWalletAddress.toLocaleLowerCase()
    const retopupUser = await prisma.user.findUnique({
      where: { walletAddress: retopupUserWalletAddress },
      include: {
        parent: {
          include: {
            parent: {
              include: {
                parent: {
                  include: {
                    parent: {
                      include: {
                        parent: {
                          include: {
                            parent: {
                              include: {
                                parent: {
                                  include: {
                                    parent: {
                                      include: {
                                        parent: true
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!retopupUser) {
      console.log(`⚠️  Retopup user not found: ${retopupUserWalletAddress}`);
      return;
    }

    const retopupPriceWei = bnbToWei(RETOPUP_PRICE_BNB);
    const companyWallet = process.env.COMPANY_WALLET_ADDRESS;
    if (!companyWallet) {
      throw new Error('COMPANY_WALLET_ADDRESS not set in environment');
    }

    const uplineChain: Array<{ address: string; userId: string }> = [];
    let currentParent = retopupUser.parent;

    for (let i = 0; i < 10 && currentParent; i++) {
      uplineChain.push({
        address: currentParent.walletAddress,
        userId: currentParent.id
      });
      currentParent = currentParent.parent;
    }

    const users: string[] = [];
    const amounts: bigint[] = [];
    const rewardTypes: string[] = [];

    let totalDistributed = BigInt(0);

    for (let i = 0; i < Math.min(uplineChain.length, 10); i++) {
      const upline = uplineChain[i];
      const percentage = levelPercentages[i];
      const levelIncomeWei = (retopupPriceWei * BigInt(percentage)) / BigInt(10000);

      const uplineUser = await prisma.user.findUnique({
        where: { walletAddress: upline.address }
      });

      if (uplineUser?.hasReTopup) {
        users.push(upline.address);
        amounts.push(levelIncomeWei);
        rewardTypes.push(`LEVEL_INCOME_${i + 1}`);
        totalDistributed += levelIncomeWei;
      } else {
        users.push(companyWallet);
        amounts.push(levelIncomeWei);
        rewardTypes.push(`LEVEL_INCOME_FORFEITED_LEVEL_${i + 1}`);
        totalDistributed += levelIncomeWei;
      }
    }

    const companyFeeWei = retopupPriceWei - totalDistributed;
    if (companyFeeWei > 0) {
      users.push(companyWallet);
      amounts.push(companyFeeWei);
      rewardTypes.push('COMPANY_FEE_RETOPUP');
    }

    if (users.length === 0) {
      console.log(`⚠️  No payouts to process for retopup`);
      return;
    }

    const contractBalance = await getContractBalance();
    const totalPayout = amounts.reduce((sum, amt) => sum + amt, BigInt(0));
    if (contractBalance < totalPayout) {
      throw new Error(`Insufficient contract balance for retopup payout`);
    }

    const result = await executeBatchPayouts(users, amounts, rewardTypes);
    console.log(`📤 Retopup batch payout transaction sent: ${result.transactionHash}`);
    
    const receipt = result.receipt;
    const blockNumber = receipt?.blockNumber || receipt?.block || 'unknown';
    console.log(`✅ Retopup batch payout confirmed in block ${blockNumber}`);

    for (let i = 0; i < uplineChain.length && i < 10; i++) {
      const upline = uplineChain[i];
      const uplineUser = await prisma.user.findUnique({
        where: { walletAddress: upline.address }
      });

      if (uplineUser?.hasReTopup) {
        const percentage = levelPercentages[i];
        const levelIncomeBNB = (RETOPUP_PRICE_BNB * percentage) / 10000;

        await prisma.user.update({
          where: { id: upline.userId },
          data: {
            totalLevelIncome: {
              increment: levelIncomeBNB
            }
          }
        });

        await prisma.transaction.create({
          data: {
            txHash: result.transactionHash,
            userId: upline.userId,
            walletAddress: upline.address,
            type: 'LEVEL_INCOME',
            amount: levelIncomeBNB,
            blockNumber: BigInt(blockNumber || 0),
            description: `Level ${i + 1} income from retopup`
          }
        });
      }
    }

    console.log(`✅ Retopup payout distribution completed`);

  } catch (error) {
    console.error('❌ Error processing retopup payout:', error);
    throw error;
  }
};

const getPoolEntryPrice = (poolLevel: number): number => {
  return ENTRY_PRICE_BNB * Math.pow(2, poolLevel - 1);
};

const processAutoPoolPayout = async (
  newUserWalletAddress: string,
  parentWalletAddress: string
): Promise<void> => {
  try {
    if (!parentWalletAddress || !newUserWalletAddress) {
      console.log(`⚠️  Parent or new user not found: ${parentWalletAddress} or ${newUserWalletAddress}`);
      return;
    }

    parentWalletAddress = parentWalletAddress.toLowerCase();
    newUserWalletAddress = newUserWalletAddress.toLowerCase();

    const parentUser = await prisma.user.findUnique({
      where: { walletAddress: parentWalletAddress }
    });

    const newUser = await prisma.user.findUnique({
      where: { walletAddress: newUserWalletAddress }
    });

    if (!parentUser || !newUser) {
      console.log(`⚠️  Parent or new user not found: ${parentWalletAddress} or ${newUserWalletAddress}`);
      return;
    }

    await placeUserInAutoPool(newUser, 1);
    
  } catch (error) {
    console.error('❌ Error processing auto pool payout:', error);
    throw error;
  }
};

const placeUserInAutoPool = async (
  newUser: User,
  poolLevel: number
): Promise<void> => {
  try {
    const slotData = await findNextAvailableSlot(poolLevel);
    
    const currentTree = await getCurrentTree(poolLevel);

    const newNode = await placeUserInTree(newUser, slotData, poolLevel, currentTree.treeNumber);
    
    const poolValue = getPoolEntryPrice(poolLevel);
    
    await distributePoolIncomeLayered(newNode, poolLevel, poolValue, currentTree);
       
    if (slotData.parentNodeId) {
      const parentNode = await prisma.autoPoolNode.findUnique({
        where: { id: slotData.parentNodeId }
      });
      
      if (parentNode) {
        const children = await prisma.autoPoolNode.findMany({
          where: { parentNodeId: parentNode.id }
        });
        
        if (children.length === 2) {
          await prisma.autoPoolNode.update({
            where: { id: parentNode.id },
            data: { isComplete: true, completedAt: new Date() }
          });
          
          await handleNodeCompletion(parentNode, poolLevel, currentTree);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error placing user in auto pool:', error);
    throw error;
  }
};

const findNextAvailableSlot = async (poolLevel: number = 1): Promise<{
  parentNodeId: string | null;
  position: 'left' | 'right' | 'root';
  level: number;
}> => {
  const redisKey = `${AUTO_POOL_REDIS_KEY}:level:${poolLevel}`;
  const redisClient = getRedisClient();
  const slotData = await redisClient?.lPop(redisKey);
  
  if (!slotData) {
    return await createNewTreeOrFallback(poolLevel);
  }
  
  const slot = JSON.parse(slotData);
  return slot;
};

const createNewTreeOrFallback = async (poolLevel: number): Promise<{
  parentNodeId: string | null;
  position: 'left' | 'right' | 'root';
  level: number;
}> => {
  const availableParent = await prisma.autoPoolNode.findFirst({
    where: {
      poolLevel: poolLevel,
      isComplete: false,
      OR: [
        { position: 'left' },
        { position: 'right' }
      ]
    },
    orderBy: { createdAt: 'asc' }
  });
  
  if (availableParent) {
    const children = await prisma.autoPoolNode.findMany({
      where: { parentNodeId: availableParent.id }
    });
    
    const hasLeft = children.some(c => c.position === 'left');
    const hasRight = children.some(c => c.position === 'right');
    
    return {
      parentNodeId: availableParent.id,
      position: !hasLeft ? 'left' : 'right',
      level: availableParent.level + 1
    };
  }
  
  return {
    parentNodeId: null,
    position: 'root',
    level: 1
  };
};

const placeUserInTree = async (
  userData: User,
  slot: { parentNodeId: string | null; position: string; level: number },
  poolLevel: number,
  treeNumber: number
) => {
  const newNode = await prisma.autoPoolNode.create({
    data: {
      userId: userData.id,
      walletAddress: userData.walletAddress,
      parentNodeId: slot.parentNodeId,
      position: slot.position,
      level: slot.level,
      poolLevel: poolLevel,
      treeNumber: treeNumber,
      isComplete: false
    }
  });
  
  const leftSlot = {
    parentNodeId: newNode.id,
    position: 'left',
    level: slot.level + 1,
  };
  
  const rightSlot = {
    parentNodeId: newNode.id,
    position: 'right',
    level: slot.level + 1,
  };
  
  const redisKey = `${AUTO_POOL_REDIS_KEY}:level:${poolLevel}`;
  const redisClient = getRedisClient();
  await redisClient?.rPush(redisKey, JSON.stringify(leftSlot));
  await redisClient?.rPush(redisKey, JSON.stringify(rightSlot));
  
  return newNode;
};

const handleNodeCompletion = async (
  completedNode: any,
  poolLevel: number,
  currentTree: any
): Promise<void> => {
  const newCompletedCount = currentTree.completedNodesCount + 1;
  
  await prisma.autoPoolTree.update({
    where: { id: currentTree.id },
    data: { completedNodesCount: newCompletedCount }
  });
  
  if (newCompletedCount === COMPLETE_POOL_SIZE) {
    await handleTreeCompletion(poolLevel, currentTree);
  } else {
    await checkAutoProgression(completedNode, poolLevel);
  }
};

const handleTreeCompletion = async (
  poolLevel: number,
  completedTree: any
): Promise<void> => {
  const completedNodes = await prisma.autoPoolNode.findMany({
    where: {
      poolLevel: poolLevel,
      treeNumber: completedTree.treeNumber,
      isComplete: true
    },
    orderBy: { completedAt: 'asc' },
    take: COMPLETE_POOL_SIZE
  });
  
  const lastFourNodes = completedNodes.slice(-LAST_NODES_COUNT);
  const lastFourUserIds = lastFourNodes.map(node => node.userId);
  
  await prisma.autoPoolTree.update({
    where: { id: completedTree.id },
    data: {
      isComplete: true,
      completedAt: new Date(),
      lastFourNodes: lastFourUserIds
    }
  });
  
  console.log(`✅ Tree ${completedTree.treeNumber} completed at level ${poolLevel}`);
  console.log(`📋 Last 4 nodes: ${lastFourUserIds.join(', ')}`);
  
  const nextPoolLevel = poolLevel + 1;
  const nextLevelTreeCount = await prisma.autoPoolTree.count({
    where: { poolLevel: nextPoolLevel }
  });
  
  if (nextLevelTreeCount < MAX_TREES_PER_LEVEL) {
    await formNewTreeFromLastFour(poolLevel, lastFourUserIds);
  } else {
    console.log(`⚠️  Max trees reached for level ${nextPoolLevel}`);
  }
};

const formNewTreeFromLastFour = async (
  fromPoolLevel: number,
  lastFourUserIds: string[]
): Promise<void> => {
  const nextPoolLevel = fromPoolLevel + 1;
  const nextPoolEntryPrice = getPoolEntryPrice(nextPoolLevel);
  
  console.log(`🌳 Forming new tree at level ${nextPoolLevel} from last 4 nodes`);
  console.log(`💰 Entry price: ${nextPoolEntryPrice} BNB (doubled from level ${fromPoolLevel})`);
  
  const nextLevelTreeCount = await prisma.autoPoolTree.count({
    where: { poolLevel: nextPoolLevel }
  });
  
  if (nextLevelTreeCount >= MAX_TREES_PER_LEVEL) {
    console.log(`⚠️  Max trees (${MAX_TREES_PER_LEVEL}) reached for level ${nextPoolLevel}`);
    return;
  }
  
  const newTree = await prisma.autoPoolTree.create({
    data: {
      poolLevel: nextPoolLevel,
      treeNumber: nextLevelTreeCount + 1,
      completedNodesCount: 0,
      lastFourNodes: []
    }
  });
  
  for (const userId of lastFourUserIds) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) continue;
    
    const reservedIncome = await prisma.autoPoolReservedIncome.findUnique({
      where: {
        userId_poolLevel: {
          userId: userId,
          poolLevel: fromPoolLevel
        }
      }
    });
    
    if (reservedIncome && Number(reservedIncome.amount) >= nextPoolEntryPrice) {
      const amountUsed = nextPoolEntryPrice;
      
      await prisma.autoPoolReservedIncome.update({
        where: { id: reservedIncome.id },
        data: {
          amount: {
            decrement: amountUsed
          }
        }
      });
      
      console.log(`✅ User ${user.walletAddress} using ${amountUsed} BNB reserved income for level ${nextPoolLevel}`);
      
      if (newTree.completedNodesCount === 0) {
        const rootNode = await placeUserInTree(user, {
          parentNodeId: null,
          position: 'root',
          level: 1
        }, nextPoolLevel, newTree.treeNumber);
        
        const rootPoolValue = getPoolEntryPrice(nextPoolLevel);
        await distributePoolIncomeLayered(rootNode, nextPoolLevel, rootPoolValue, newTree);
      } else {
        const slotData = await findNextAvailableSlot(nextPoolLevel);
        const newNode = await placeUserInTree(user, slotData, nextPoolLevel, newTree.treeNumber);
        
        const poolValue = getPoolEntryPrice(nextPoolLevel);
        await distributePoolIncomeLayered(newNode, nextPoolLevel, poolValue, newTree);
        
        if (slotData.parentNodeId) {
          const parentNode = await prisma.autoPoolNode.findUnique({
            where: { id: slotData.parentNodeId }
          });
          
          if (parentNode) {
            const children = await prisma.autoPoolNode.findMany({
              where: { parentNodeId: parentNode.id }
            });
            
            if (children.length === 2) {
              await prisma.autoPoolNode.update({
                where: { id: parentNode.id },
                data: { isComplete: true, completedAt: new Date() }
              });
              
              await handleNodeCompletion(parentNode, nextPoolLevel, newTree);
            }
          }
        }
      }
    } else {
      console.warn(`⚠️  User ${user.walletAddress} has insufficient reserved income (${reservedIncome?.amount || 0} < ${nextPoolEntryPrice})`);
    }
  }
  
  console.log(`✅ New tree ${newTree.treeNumber} formed at level ${nextPoolLevel}`);
};

const distributePoolIncomeLayered = async (
  newNode: any,
  poolLevel: number,
  poolValue: number,
  currentTree: any
): Promise<void> => {
  const companyWallet = await getCompanyWallet();
  
  const layer1Amount = (poolValue * LAYER_1_PERCENT) / 100;
  const layer2Amount = (poolValue * LAYER_2_PERCENT) / 100;
  const layer3Amount = (poolValue * LAYER_3_PERCENT) / 100;
  const companyFee = (poolValue * COMPANY_FEE_PERCENT) / 100;
  
  const immediateParent = newNode.parentNodeId 
    ? await prisma.autoPoolNode.findUnique({
        where: { id: newNode.parentNodeId },
        include: { user: true }
      })
    : null;
  
  const isTreeComplete = currentTree.isComplete;
  const lastFourUserIds = currentTree.lastFourNodes || [];
  
  const users: string[] = [];
  const amounts: bigint[] = [];
  const rewardTypes: string[] = [];
  
  if (immediateParent) {
    const isLastFour = lastFourUserIds.includes(immediateParent.userId);
    // Reserve income only when tree is complete AND node is in last 4
    const shouldReserve = isTreeComplete && isLastFour;
    
    if (shouldReserve) {
      await reserveIncome(immediateParent.userId, poolLevel, layer1Amount);
      console.log(`💾 Reserved ${layer1Amount} BNB for ${immediateParent.user.walletAddress} (last 4 node)`);
    } else {
      users.push(immediateParent.user.walletAddress);
      amounts.push(bnbToWei(layer1Amount));
      rewardTypes.push('AUTO_POOL_INCOME');
      
      await prisma.user.update({
        where: { id: immediateParent.userId },
        data: {
          totalAutoPoolIncome: { increment: layer1Amount }
        }
      });
    }
    
    if (immediateParent.parentNodeId) {
      const layer2Parent = await prisma.autoPoolNode.findUnique({
        where: { id: immediateParent.parentNodeId },
        include: { user: true }
      });
      
      if (layer2Parent) {
        const isLayer2LastFour = lastFourUserIds.includes(layer2Parent.userId);
        const shouldReserveLayer2 = isTreeComplete && isLayer2LastFour;
        
        if (shouldReserveLayer2) {
          await reserveIncome(layer2Parent.userId, poolLevel, layer2Amount);
          console.log(`💾 Reserved ${layer2Amount} BNB for ${layer2Parent.user.walletAddress} (last 4 node)`);
        } else {
          users.push(layer2Parent.user.walletAddress);
          amounts.push(bnbToWei(layer2Amount));
          rewardTypes.push('AUTO_POOL_INCOME');
          
          await prisma.user.update({
            where: { id: layer2Parent.userId },
            data: {
              totalAutoPoolIncome: { increment: layer2Amount }
            }
          });
        }
        
        if (layer2Parent.parentNodeId) {
          const layer3Parent = await prisma.autoPoolNode.findUnique({
            where: { id: layer2Parent.parentNodeId },
            include: { user: true }
          });
          
          if (layer3Parent) {
            const isLayer3LastFour = lastFourUserIds.includes(layer3Parent.userId);
            const shouldReserveLayer3 = isTreeComplete && isLayer3LastFour;
            
            if (shouldReserveLayer3) {
              await reserveIncome(layer3Parent.userId, poolLevel, layer3Amount);
              console.log(`💾 Reserved ${layer3Amount} BNB for ${layer3Parent.user.walletAddress} (last 4 node)`);
            } else {
              users.push(layer3Parent.user.walletAddress);
              amounts.push(bnbToWei(layer3Amount));
              rewardTypes.push('AUTO_POOL_INCOME');
              
              await prisma.user.update({
                where: { id: layer3Parent.userId },
                data: {
                  totalAutoPoolIncome: { increment: layer3Amount }
                }
              });
            }
          }
        }
      }
    }
  }
  
  users.push(companyWallet);
  amounts.push(bnbToWei(companyFee));
  rewardTypes.push('COMPANY_FEE');
  
  if (users.length > 0) {
    const contractBalance = await getContractBalance();
    const totalPayout = amounts.reduce((sum, amt) => sum + amt, BigInt(0));
    
    if (contractBalance < totalPayout) {
      throw new Error(`Insufficient contract balance for auto pool payout. Required: ${ethers.formatEther(totalPayout)} BNB, Available: ${ethers.formatEther(contractBalance)} BNB`);
    }
    
    const result = await executeBatchPayouts(users, amounts, rewardTypes);
    const receipt = result.receipt;
    const blockNumber = receipt?.blockNumber || receipt?.block || 'unknown';
    
    console.log(`✅ Layered income distribution completed: ${blockNumber}`);
    
    for (let i = 0; i < users.length; i++) {
      if (rewardTypes[i] === 'AUTO_POOL_INCOME') {
        const user = await prisma.user.findUnique({
          where: { walletAddress: users[i].toLowerCase() }
        });
        
        if (user) {
          await prisma.transaction.create({
            data: {
              txHash: result.transactionHash,
              userId: user.id,
              walletAddress: users[i],
              type: 'AUTO_POOL_INCOME',
              amount: Number(ethers.formatEther(amounts[i])),
              blockNumber: BigInt(blockNumber || 0),
              description: `Auto pool income from level ${poolLevel}`
            }
          });
        }
      }
    }
  }
};

const reserveIncome = async (
  userId: string,
  poolLevel: number,
  amount: number
): Promise<void> => {
  await prisma.autoPoolReservedIncome.upsert({
    where: {
      userId_poolLevel: {
        userId: userId,
        poolLevel: poolLevel
      }
    },
    create: {
      userId: userId,
      poolLevel: poolLevel,
      amount: amount
    },
    update: {
      amount: { increment: amount }
    }
  });
};

const getCurrentTree = async (poolLevel: number): Promise<any> => {
  const existingTree = await prisma.autoPoolTree.findFirst({
    where: {
      poolLevel: poolLevel,
      isComplete: false
    },
    orderBy: { createdAt: 'desc' }
  });
  
  if (existingTree) {
    return existingTree;
  }
  
  const treeCount = await prisma.autoPoolTree.count({
    where: { poolLevel: poolLevel }
  });
  
  if (treeCount >= MAX_TREES_PER_LEVEL) {
    throw new Error(`Max trees (${MAX_TREES_PER_LEVEL}) reached for level ${poolLevel}`);
  }
  
  return await prisma.autoPoolTree.create({
    data: {
      poolLevel: poolLevel,
      treeNumber: treeCount + 1,
      completedNodesCount: 0,
      lastFourNodes: []
    }
  });
};

const checkAutoProgression = async (
  completedNode: any,
  poolLevel: number
): Promise<void> => {
  const currentTree = await getCurrentTree(poolLevel);
  const lastFourUserIds = currentTree.lastFourNodes || [];
  
  if (lastFourUserIds.includes(completedNode.userId)) {
    return;
  }
  
  const nextPoolLevel = poolLevel + 1;
  const user = await prisma.user.findUnique({
    where: { id: completedNode.userId }
  });
  
  if (user) {
    await placeUserInAutoPool(user, nextPoolLevel);
  }
};