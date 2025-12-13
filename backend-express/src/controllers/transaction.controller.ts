import { Request, Response } from 'express';
import prisma from '../config/database';
import { TransactionType } from '@prisma/client';
import { verifyToken } from '../services/auth.service';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    walletAddress: string;
  };
}

/**
 * Unified transaction API with filters
 * 
 * Query Parameters:
 * - type: TransactionType (optional) - Filter by transaction type
 * - page: number (optional) - Page number for pagination (default: 0)
 * - size: number (optional) - Page size for pagination (default: 20, max: 100)
 * - days: number (optional) - Filter transactions from last N days
 * - aggregate: boolean (optional) - If true, returns total income instead of list
 * - limit: number (optional) - Limit number of results (for non-paginated queries)
 * 
 * Authentication: Requires Bearer token in Authorization header
 */
export const getTransactions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Bearer token is required in Authorization header'
      });
    }

    const token = authHeader.substring(7);
    let payload;
    try {
      payload = verifyToken(token);
    } catch (error: any) {
      return res.status(401).json({ 
        error: error.message || 'Invalid token',
        message: 'Token verification failed'
      });
    }

    if (payload.type !== 'access') {
      return res.status(401).json({ 
        error: 'Invalid token type',
        message: 'Access token required'
      });
    }

    const userId = payload.userId;

    const type = req.query.type as TransactionType | undefined;
    const page = parseInt(req.query.page as string) || undefined;
    const size = Math.min(parseInt(req.query.size as string) || 20, 100); // Max 100
    const days = parseInt(req.query.days as string) || undefined;
    const aggregate = req.query.aggregate === 'true' || req.query.aggregate === '1';
    const limit = parseInt(req.query.limit as string) || undefined;

    const where: any = { userId };

    if (type) {
      where.type = type;
    }

    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      where.createdAt = {
        gte: startDate
      };
    }

    if (aggregate) {
      if (!type) {
        return res.status(400).json({ 
          error: 'Type parameter required',
          message: 'Transaction type is required for aggregate queries'
        });
      }

      const result = await prisma.transaction.aggregate({
        where,
        _sum: { amount: true }
      });

      return res.json({ 
        total: result._sum.amount || 0,
        type,
        userId
      });
    }

    if (page !== undefined) {
      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          skip: page * size,
          take: size,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.transaction.count({ where })
      ]);

      return res.json({
        content: transactions,
        totalElements: total,
        totalPages: Math.ceil(total / size),
        page,
        size
      });
    }

    if (limit) {
      const transactions = await prisma.transaction.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' }
      });

      return res.json({
        transactions,
        count: transactions.length,
        limit
      });
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      transactions,
      count: transactions.length
    });

  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to retrieve transactions'
    });
  }
};

