import { Request, Response } from 'express';
import prisma from '../config/database';

export const getStats = async (req: Request, res: Response) => {
  try {
    const recentDays = parseInt(req.query.recentDays as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - recentDays);

    const [totalUsers, activeReTopups, totalTransactions, recentRegistrations] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { hasReTopup: true } }),
      prisma.transaction.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: startDate
          }
        }
      })
    ]);

    res.json({
      totalUsers,
      activeReTopups,
      totalTransactions,
      recentRegistrations
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const health = async (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Stats service is healthy' });
};

