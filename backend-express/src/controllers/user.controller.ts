import { Request, Response } from 'express';
import prisma from '../config/database';

export const getUserById = async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        parent: true,
        children: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error getting user by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserByWallet = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: {
        parent: true,
        children: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error getting user by wallet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getChildren = async (req: Request, res: Response) => {
  try {
    const parentId = String(req.params.parentId);
    const children = await prisma.user.findMany({
      where: { parentId }
    });

    res.json(children);
  } catch (error) {
    console.error('Error getting children:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json(users);
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRecentRegistrations = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const users = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(users);
  } catch (error) {
    console.error('Error getting recent registrations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTotalUsers = async (req: Request, res: Response) => {
  try {
    const count = await prisma.user.count();
    res.json({ count });
  } catch (error) {
    console.error('Error getting total users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getActiveReTopupCount = async (req: Request, res: Response) => {
  try {
    const count = await prisma.user.count({
      where: { hasReTopup: true }
    });
    res.json({ count });
  } catch (error) {
    console.error('Error getting active re-topup count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

