import { Request, Response } from 'express';
import prisma from '../config/database';
import { validateAdminCredentials, generateAdminToken } from '../services/admin.service';
import { AdminRequest } from '../middleware/admin.middleware';
import { TransactionType } from '@prisma/client';
import { ethers } from 'ethers';
import { getContractWithSigner } from '../config/blockchain';

/**
 * Admin login endpoint.
 * Validates credentials from environment variables and returns JWT token.
 * 
 * Request Body:
 * - username: Admin username (must match ADMIN_USERNAME env var)
 * - password: Admin password (must match ADMIN_PASSWORD env var)
 * 
 * Response:
 * - 200: Success with access token
 * - 401: Invalid credentials
 * - 500: Server error
 */
export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username and password are required',
          details: [
            {
              field: username ? 'password' : 'username',
              issue: 'Field is required',
              value: ''
            }
          ],
          traceId: req.headers['x-request-id'] as string || 'unknown',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const isValid = validateAdminCredentials(username, password);

    if (!isValid) {
      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid admin username or password',
          traceId: req.headers['x-request-id'] as string || 'unknown',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const { accessToken } = generateAdminToken('admin');

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      accessToken,
      admin: {
        id: 'admin',
        username: username
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred during admin login',
        traceId: req.headers['x-request-id'] as string || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Member Register Panel - Get all registered users with income details.
 * Returns paginated list of all users with their income information.
 * 
 * Query Parameters:
 * - page: Page number (default: 0)
 * - size: Page size (default: 20, max: 100)
 * - search: Search by user ID or wallet address (optional)
 * 
 * Response includes:
 * - User ID, Wallet Address, Parent ID, Sponsor Count
 * - Direct Income, Slot Income (Auto Pool Income), Level Income
 * - Registration Date
 */
export const getMemberRegister = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(0, parseInt(req.query.page as string) || 0);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size as string) || 20));
    const search = req.query.search as string | undefined;

    const where: any = {};

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { walletAddress: { contains: search.toLowerCase(), mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          walletAddress: true,
          parentId: true,
          sponsorCount: true,
          totalDirectIncome: true,
          totalLevelIncome: true,
          totalAutoPoolIncome: true,
          createdAt: true,
          parent: {
            select: {
              id: true,
              walletAddress: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: page * size,
        take: size
      }),
      prisma.user.count({ where })
    ]);

    const formattedUsers = users.map((user, index) => ({
      no: page * size + index + 1,
      userId: user.id,
      walletAddress: user.walletAddress,
      parentId: user.parentId || null,
      parentWalletAddress: user.parent?.walletAddress || null,
      sponsorCount: user.sponsorCount,
      directIncome: user.totalDirectIncome.toString(),
      slotIncome: user.totalAutoPoolIncome.toString(), // Auto Pool Income is slot-based
      levelIncome: user.totalLevelIncome.toString(),
      registrationDate: user.createdAt.toISOString()
    }));

    res.status(200).json({
      success: true,
      data: formattedUsers,
      pagination: {
        page,
        size,
        totalElements: total,
        totalPages: Math.ceil(total / size)
      }
    });
  } catch (error) {
    console.error('Error getting member register:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve member register data',
        traceId: req.headers['x-request-id'] as string || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get detailed income breakdown for a specific user.
 * Returns all income types with transaction details.
 * 
 * Path Parameters:
 * - userId: User ID to get income details for
 */
export const getUserIncomeDetails = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required',
          details: [{
            field: 'userId',
            issue: 'User ID parameter is required',
            value: ''
          }],
          traceId: req.headers['x-request-id'] as string || 'unknown',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        walletAddress: true,
        totalDirectIncome: true,
        totalLevelIncome: true,
        totalAutoPoolIncome: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 100
        }
      }
    });

    if (!user) {
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: `User with ID ${userId} not found`,
          traceId: req.headers['x-request-id'] as string || 'unknown',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const directIncomeTransactions = user.transactions.filter(t => t.type === TransactionType.DIRECT_INCOME);
    const levelIncomeTransactions = user.transactions.filter(t => t.type === TransactionType.LEVEL_INCOME);
    const slotIncomeTransactions = user.transactions.filter(t => t.type === TransactionType.AUTO_POOL_INCOME);

    res.status(200).json({
      success: true,
      user: {
        userId: user.id,
        walletAddress: user.walletAddress
      },
      income: {
        directIncome: {
          total: user.totalDirectIncome.toString(),
          transactionCount: directIncomeTransactions.length,
          transactions: directIncomeTransactions.map(t => ({
            txHash: t.txHash,
            amount: t.amount.toString(),
            blockNumber: t.blockNumber.toString(),
            createdAt: t.createdAt.toISOString(),
            description: t.description
          }))
        },
        levelIncome: {
          total: user.totalLevelIncome.toString(),
          transactionCount: levelIncomeTransactions.length,
          transactions: levelIncomeTransactions.map(t => ({
            txHash: t.txHash,
            amount: t.amount.toString(),
            blockNumber: t.blockNumber.toString(),
            createdAt: t.createdAt.toISOString(),
            description: t.description
          }))
        },
        slotIncome: {
          total: user.totalAutoPoolIncome.toString(),
          transactionCount: slotIncomeTransactions.length,
          transactions: slotIncomeTransactions.map(t => ({
            txHash: t.txHash,
            amount: t.amount.toString(),
            blockNumber: t.blockNumber.toString(),
            createdAt: t.createdAt.toISOString(),
            description: t.description
          }))
        }
      }
    });
  } catch (error) {
    console.error('Error getting user income details:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve user income details',
        traceId: req.headers['x-request-id'] as string || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Slot Report Panel - Analyze user placement in slot-based MLM tree.
 * Returns slot information including position, parent, and children.
 * 
 * Query Parameters:
 * - userId: User ID to analyze (required)
 */
export const getSlotReport = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required',
          details: [{
            field: 'userId',
            issue: 'User ID query parameter is required',
            value: ''
          }],
          traceId: req.headers['x-request-id'] as string || 'unknown',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        autoPoolNode: {
          include: {
            parent: {
              include: {
                user: {
                  select: {
                    id: true,
                    walletAddress: true
                  }
                }
              }
            },
            children: {
              include: {
                user: {
                  select: {
                    id: true,
                    walletAddress: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: `User with ID ${userId} not found`,
          traceId: req.headers['x-request-id'] as string || 'unknown',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    if (!user.autoPoolNode) {
      res.status(404).json({
        error: {
          code: 'SLOT_NOT_FOUND',
          message: `User ${userId} has not been placed in the auto pool (slot) yet`,
          traceId: req.headers['x-request-id'] as string || 'unknown',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const slotNode = user.autoPoolNode;

    res.status(200).json({
      success: true,
      userId: user.id,
      walletAddress: user.walletAddress,
      slot: {
        slotId: slotNode.id,
        slotNumber: slotNode.treeNumber || null,
        slotLevel: slotNode.level,
        poolLevel: slotNode.poolLevel,
        position: slotNode.position,
        isComplete: slotNode.isComplete,
        createdAt: slotNode.createdAt.toISOString(),
        completedAt: slotNode.completedAt?.toISOString() || null
      },
      parentSlot: slotNode.parent ? {
        slotId: slotNode.parent.id,
        userId: slotNode.parent.userId,
        walletAddress: slotNode.parent.user.walletAddress,
        level: slotNode.parent.level,
        position: slotNode.parent.position
      } : null,
      children: slotNode.children.map(child => ({
        slotId: child.id,
        userId: child.userId,
        walletAddress: child.user.walletAddress,
        level: child.level,
        position: child.position,
        isComplete: child.isComplete
      })),
      childrenCount: slotNode.children.length
    });
  } catch (error) {
    console.error('Error getting slot report:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve slot report',
        traceId: req.headers['x-request-id'] as string || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Level Income Panel (Retopup Flow) - Get eligible parents for retopup income distribution.
 * Returns top 10 eligible parents (uplines) when a user performs retopup.
 * 
 * Query Parameters:
 * - userId: User ID who performed retopup (required)
 */
export const getLevelIncomeEligibleParents = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required',
          details: [{
            field: 'userId',
            issue: 'User ID query parameter is required',
            value: ''
          }],
          traceId: req.headers['x-request-id'] as string || 'unknown',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const retopupUser = await prisma.user.findUnique({
      where: { id: userId },
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
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: `User with ID ${userId} not found`,
          traceId: req.headers['x-request-id'] as string || 'unknown',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Traverse tree upwards to get top 10 parents
    const eligibleParents: Array<{
      level: number;
      userId: string;
      walletAddress: string;
      hasReTopup: boolean;
      sharePercentage: number;
      shareAmount: string;
    }> = [];

    const levelPercentages = [30.00, 15.00, 10.00, 5.00, 5.00, 5.00, 5.00, 5.00, 10.00, 10.00];
    const RETOPUP_PRICE_BNB = 40;
    let currentParent = retopupUser.parent;
    let level = 1;

    while (currentParent && eligibleParents.length < 10) {
      const percentage = levelPercentages[level - 1] || 0;
      const shareAmount = (RETOPUP_PRICE_BNB * percentage / 100).toFixed(18);

      eligibleParents.push({
        level,
        userId: currentParent.id,
        walletAddress: currentParent.walletAddress,
        hasReTopup: currentParent.hasReTopup,
        sharePercentage: percentage,
        shareAmount
      });

      // Get next parent
      const nextParent = await prisma.user.findUnique({
        where: { id: currentParent.id },
        include: { parent: true }
      });

      currentParent = nextParent?.parent || null;
      level++;
    }

    res.status(200).json({
      success: true,
      retopupUserId: retopupUser.id,
      retopupAmount: RETOPUP_PRICE_BNB.toString(),
      manualShareTransfer: process.env.MANUAL_SHARE_TRANSFER === 'true',
      eligibleParents,
      totalLevels: eligibleParents.length
    });
  } catch (error) {
    console.error('Error getting level income eligible parents:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve eligible parents for level income',
        traceId: req.headers['x-request-id'] as string || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Manually trigger blockchain transfer for level income distribution.
 * This is used when manualShareTransfer is false.
 * 
 * Request Body:
 * - userId: User ID who performed retopup
 * - parentLevels: Array of level numbers to transfer (optional, defaults to all)
 */
export const manualTransferLevelIncome = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { userId, parentLevels } = req.body;

    if (!userId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required',
          details: [{
            field: 'userId',
            issue: 'User ID is required in request body',
            value: ''
          }],
          traceId: req.headers['x-request-id'] as string || 'unknown',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Get eligible parents (reuse logic from getLevelIncomeEligibleParents)
    const retopupUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { parent: true }
    });

    if (!retopupUser) {
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: `User with ID ${userId} not found`,
          traceId: req.headers['x-request-id'] as string || 'unknown',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // This would trigger the actual blockchain transfer
    // For now, return success (implementation depends on your blockchain service)
    res.status(200).json({
      success: true,
      message: 'Manual transfer initiated',
      userId,
      note: 'This endpoint should be integrated with your blockchain transfer service'
    });
  } catch (error) {
    console.error('Error in manual transfer:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to initiate manual transfer',
        traceId: req.headers['x-request-id'] as string || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Income Report Panel - Get overall income report.
 * Returns total earnings per user from all sources.
 * 
 * Query Parameters:
 * - userId: Filter by specific user ID (optional)
 * - startDate: Start date for filtering (ISO string, optional)
 * - endDate: End date for filtering (ISO string, optional)
 * - page: Page number (default: 0)
 * - size: Page size (default: 20, max: 100)
 */
export const getOverallIncomeReport = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(0, parseInt(req.query.page as string) || 0);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size as string) || 20));
    const userId = req.query.userId as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // Get transactions grouped by user
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            walletAddress: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group by user and calculate totals
    const userIncomeMap = new Map<string, {
      userId: string;
      walletAddress: string;
      directIncome: number;
      levelIncome: number;
      slotIncome: number;
      totalIncome: number;
      transactionCount: number;
    }>();

    transactions.forEach(tx => {
      const userId = tx.userId;
      const amount = parseFloat(tx.amount.toString());

      if (!userIncomeMap.has(userId)) {
        userIncomeMap.set(userId, {
          userId,
          walletAddress: tx.user.walletAddress,
          directIncome: 0,
          levelIncome: 0,
          slotIncome: 0,
          totalIncome: 0,
          transactionCount: 0
        });
      }

      const userIncome = userIncomeMap.get(userId)!;
      userIncome.transactionCount++;

      if (tx.type === TransactionType.DIRECT_INCOME) {
        userIncome.directIncome += amount;
      } else if (tx.type === TransactionType.LEVEL_INCOME) {
        userIncome.levelIncome += amount;
      } else if (tx.type === TransactionType.AUTO_POOL_INCOME) {
        userIncome.slotIncome += amount;
      }

      userIncome.totalIncome = userIncome.directIncome + userIncome.levelIncome + userIncome.slotIncome;
    });

    const incomeReports = Array.from(userIncomeMap.values())
      .sort((a, b) => b.totalIncome - a.totalIncome)
      .slice(page * size, (page + 1) * size);

    const total = userIncomeMap.size;

    res.status(200).json({
      success: true,
      data: incomeReports,
      pagination: {
        page,
        size,
        totalElements: total,
        totalPages: Math.ceil(total / size)
      }
    });
  } catch (error) {
    console.error('Error getting overall income report:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve overall income report',
        traceId: req.headers['x-request-id'] as string || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Income Report Panel - Get direct income report.
 * Returns income from direct referrals only.
 */
export const getDirectIncomeReport = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(0, parseInt(req.query.page as string) || 0);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size as string) || 20));
    const userId = req.query.userId as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const where: any = {
      type: TransactionType.DIRECT_INCOME
    };

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              walletAddress: true,
              parent: {
                select: {
                  id: true,
                  walletAddress: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: page * size,
        take: size
      }),
      prisma.transaction.count({ where })
    ]);

    const formattedData = transactions.map(tx => ({
      userId: tx.userId,
      walletAddress: tx.user.walletAddress,
      sponsorId: tx.user.parent?.id || null,
      sponsorWalletAddress: tx.user.parent?.walletAddress || null,
      amount: tx.amount.toString(),
      txHash: tx.txHash,
      blockNumber: tx.blockNumber.toString(),
      createdAt: tx.createdAt.toISOString(),
      description: tx.description
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
      pagination: {
        page,
        size,
        totalElements: total,
        totalPages: Math.ceil(total / size)
      }
    });
  } catch (error) {
    console.error('Error getting direct income report:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve direct income report',
        traceId: req.headers['x-request-id'] as string || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Income Report Panel - Get slot income report.
 * Returns slot completion-based earnings (Auto Pool Income).
 */
export const getSlotIncomeReport = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(0, parseInt(req.query.page as string) || 0);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size as string) || 20));
    const userId = req.query.userId as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const where: any = {
      type: TransactionType.AUTO_POOL_INCOME
    };

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              walletAddress: true,
              autoPoolNode: {
                select: {
                  id: true,
                  level: true,
                  poolLevel: true,
                  treeNumber: true,
                  position: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: page * size,
        take: size
      }),
      prisma.transaction.count({ where })
    ]);

    const formattedData = transactions.map(tx => ({
      userId: tx.userId,
      walletAddress: tx.user.walletAddress,
      slotId: tx.user.autoPoolNode?.id || null,
      slotLevel: tx.user.autoPoolNode?.level || null,
      poolLevel: tx.user.autoPoolNode?.poolLevel || null,
      treeNumber: tx.user.autoPoolNode?.treeNumber || null,
      position: tx.user.autoPoolNode?.position || null,
      amount: tx.amount.toString(),
      txHash: tx.txHash,
      blockNumber: tx.blockNumber.toString(),
      createdAt: tx.createdAt.toISOString(),
      description: tx.description
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
      pagination: {
        page,
        size,
        totalElements: total,
        totalPages: Math.ceil(total / size)
      }
    });
  } catch (error) {
    console.error('Error getting slot income report:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve slot income report',
        traceId: req.headers['x-request-id'] as string || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Income Report Panel - Get level income report.
 * Returns level-wise earnings from retopup-triggered income.
 */
export const getLevelIncomeReport = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(0, parseInt(req.query.page as string) || 0);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size as string) || 20));
    const userId = req.query.userId as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const where: any = {
      type: TransactionType.LEVEL_INCOME
    };

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              walletAddress: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: page * size,
        take: size
      }),
      prisma.transaction.count({ where })
    ]);

    // Extract level number from description if available
    const formattedData = transactions.map(tx => {
      const levelMatch = tx.description?.match(/LEVEL[_\s]?(\d+)/i);
      const level = levelMatch ? parseInt(levelMatch[1]) : null;

      return {
        userId: tx.userId,
        walletAddress: tx.user.walletAddress,
        level,
        amount: tx.amount.toString(),
        txHash: tx.txHash,
        blockNumber: tx.blockNumber.toString(),
        createdAt: tx.createdAt.toISOString(),
        description: tx.description
      };
    });

    res.status(200).json({
      success: true,
      data: formattedData,
      pagination: {
        page,
        size,
        totalElements: total,
        totalPages: Math.ceil(total / size)
      }
    });
  } catch (error) {
    console.error('Error getting level income report:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve level income report',
        traceId: req.headers['x-request-id'] as string || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }
};

