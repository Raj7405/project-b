import { Request, Response } from 'express';
import prisma from '../config/database';
import { TransactionType } from '@prisma/client';

export const getUserTransactions = async (req: Request, res: Response) => {
  try {
    const userId = BigInt(req.params.userId);
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error getting user transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserTransactionsPaginated = async (req: Request, res: Response) => {
  try {
    const userId = BigInt(req.params.userId);
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        skip: page * size,
        take: size,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.transaction.count({ where: { userId } })
    ]);

    res.json({
      content: transactions,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      page,
      size
    });
  } catch (error) {
    console.error('Error getting user transactions paginated:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserTransactionsByType = async (req: Request, res: Response) => {
  try {
    const userId = BigInt(req.params.userId);
    const type = req.params.type as TransactionType;

    const transactions = await prisma.transaction.findMany({
      where: { userId, type },
      orderBy: { createdAt: 'desc' }
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error getting user transactions by type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRecentTransactions = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const limit = parseInt(req.query.limit as string) || 100;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error getting recent transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTotalIncomeByType = async (req: Request, res: Response) => {
  try {
    const userId = BigInt(req.params.userId);
    const type = req.params.type as TransactionType;

    const result = await prisma.transaction.aggregate({
      where: { userId, type },
      _sum: { amount: true }
    });

    res.json({ total: result._sum.amount || 0 });
  } catch (error) {
    console.error('Error getting total income by type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

