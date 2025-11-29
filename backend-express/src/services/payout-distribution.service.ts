import { ethers } from 'ethers';
import prisma from '../config/database';
import { getContract, getProvider } from '../config/blockchain';

const ENTRY_PRICE_BNB = 20;
const DIRECT_INCOME_BNB = 18;
const COMPANY_FEE_BNB = 2;
const TOKEN_DECIMALS = 18;

const getSigner = (): ethers.Wallet => {
  const privateKey = process.env.BACKEND_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('BACKEND_PRIVATE_KEY not set in environment');
  }
  const provider = getProvider();
  return new ethers.Wallet(privateKey, provider);
};

const getContractWithSigner = (): ethers.Contract => {
  const signer = getSigner();
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error('CONTRACT_ADDRESS not set in environment');
  }
  
  const CONTRACT_ABI = [
    "function payout(address user, uint256 amount, string calldata rewardType) external",
    "function executeBatchPayouts(address[] calldata users, uint256[] calldata amounts, string[] calldata rewardTypes) external",
    "function companyWallet() view returns (address)",
    "function entryPrice() view returns (uint256)",
    "function getContractBalance() view returns (uint256)",
  ];
  
  return new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
};

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
      // TODO: Trigger auto pool placement service here
      return;
    }

    const contract = getContractWithSigner();
    const companyWallet = await contract.companyWallet();
    
    const directIncomeWei = bnbToWei(DIRECT_INCOME_BNB);
    const companyFeeWei = bnbToWei(COMPANY_FEE_BNB);

    const contractBalance = await contract.getContractBalance();
    if (contractBalance < (directIncomeWei + companyFeeWei)) {
      throw new Error(`Insufficient contract balance. Required: ${ethers.formatEther(directIncomeWei + companyFeeWei)} BNB, Available: ${ethers.formatEther(contractBalance)} BNB`);
    }

    const users = [parentWalletAddress, companyWallet];
    const amounts = [directIncomeWei, companyFeeWei];
    const rewardTypes = ['DIRECT_INCOME', 'COMPANY_FEE'];

    console.log(`💰 Distributing registration payout:`);
    console.log(`   - Parent (${parentWalletAddress}): ${DIRECT_INCOME_BNB} BNB (Direct Income)`);
    console.log(`   - Company (${companyWallet}): ${COMPANY_FEE_BNB} BNB (Company Fee)`);

    const tx = await contract.executeBatchPayouts(users, amounts, rewardTypes);
    console.log(`📤 Batch payout transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Batch payout confirmed in block ${receipt.blockNumber}`);

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
        txHash: receipt.hash,
        userId: parentUser.id,
        walletAddress: parentWalletAddress,
        type: 'DIRECT_INCOME',
        amount: DIRECT_INCOME_BNB,
        blockNumber: BigInt(receipt.blockNumber || 0),
        description: `Direct income from referral #${newSponsorCount}`
      }
    });

    console.log(`✅ Payout distribution completed for registration`);

  } catch (error) {
    console.error('❌ Error processing registration payout:', error);
    throw error;
  }
};

/**
 * Process retopup level income distribution
 * Distributes to 10 upline levels based on configured percentages
 */
export const processRetopupPayout = async (
  retopupUserWalletAddress: string
): Promise<void> => {
  try {
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

    // Level income percentages (in basis points, 10000 = 100%)
    // Same as DecentReferral.sol: [3000, 1500, 1000, 500, 500, 500, 500, 500, 1000, 1000]
    const levelPercentages = [3000, 1500, 1000, 500, 500, 500, 500, 500, 1000, 1000];
    const RETOPUP_PRICE_BNB = 40;
    const retopupPriceWei = bnbToWei(RETOPUP_PRICE_BNB);
    const companyWallet = process.env.COMPANY_WALLET_ADDRESS;

    if (!companyWallet) {
      throw new Error('COMPANY_WALLET_ADDRESS not set in environment');
    }

    // Build upline chain (max 10 levels)
    const uplineChain: Array<{ address: string; userId: string }> = [];
    let currentParent = retopupUser.parent;

    for (let i = 0; i < 10 && currentParent; i++) {
      uplineChain.push({
        address: currentParent.walletAddress,
        userId: currentParent.id
      });
      // Get next parent from database
      const nextParent = await prisma.user.findUnique({
        where: { id: currentParent.id },
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
      });
      currentParent = nextParent?.parent || null;
    }

    const contract = getContractWithSigner();
    const users: string[] = [];
    const amounts: bigint[] = [];
    const rewardTypes: string[] = [];

    let totalDistributed = BigInt(0);

    // Process each upline level
    for (let i = 0; i < Math.min(uplineChain.length, 10); i++) {
      const upline = uplineChain[i];
      const percentage = levelPercentages[i];
      const levelIncomeWei = (retopupPriceWei * BigInt(percentage)) / BigInt(10000);

      // Check if upline has done retopup
      const uplineUser = await prisma.user.findUnique({
        where: { walletAddress: upline.address }
      });

      if (uplineUser?.hasReTopup) {
        // Upline has done retopup: send income to upline
        users.push(upline.address);
        amounts.push(levelIncomeWei);
        rewardTypes.push(`LEVEL_INCOME_${i + 1}`);
        totalDistributed += levelIncomeWei;
      } else {
        // Upline has not done retopup: send to company wallet
        users.push(companyWallet);
        amounts.push(levelIncomeWei);
        rewardTypes.push(`LEVEL_INCOME_FORFEITED_LEVEL_${i + 1}`);
        totalDistributed += levelIncomeWei;
      }
    }

    // Calculate company fee (remaining amount)
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

    // Check contract balance
    const contractBalance = await contract.getContractBalance();
    const totalPayout = amounts.reduce((sum, amt) => sum + amt, BigInt(0));
    if (contractBalance < totalPayout) {
      throw new Error(`Insufficient contract balance for retopup payout`);
    }

    // Execute batch payout
    const tx = await contract.executeBatchPayouts(users, amounts, rewardTypes);
    console.log(`📤 Retopup batch payout transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Retopup batch payout confirmed in block ${receipt.blockNumber}`);

    // Update database records
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
            txHash: receipt.hash,
            userId: upline.userId,
            walletAddress: upline.address,
            type: 'LEVEL_INCOME',
            amount: levelIncomeBNB,
            blockNumber: BigInt(receipt.blockNumber || 0),
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

