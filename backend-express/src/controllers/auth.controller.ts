import { Request, Response } from 'express';
import { getContract } from '../config/blockchain';
import prisma from '../config/database';
import { processRegistrationPayout } from '../services/payout-distribution.service';

export const validateRegistration = async (req: Request, res: Response) => {
    try {
        const { walletAddress, uplineId } = req.body;

        //write logic to check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: {
                walletAddress: walletAddress
            }
        })

        if (existingUser) {
            return res.status(409).json({
                    canRegister: false,
                    reason: 'User already exists'
                });
        }

        //Check if referrer upline exists and is active
        const refereUpline =  await prisma.user.findUnique({
            where: {
                id: uplineId
            }
        });

        if (!refereUpline) {
            return res.status(409).json({
                    canRegister: false,
                    reason: 'Referrer Upline does not exist'
                });
        }

        res.status(200).json({
            canRegister: true,
            reason: ''
        });

    } catch (error) {
        console.error('Error validating registration:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export const getRegisterUser = async (req: Request, res: Response) => {
    try {
        const { walletAddress, uplineId } = req.body;
        // TODO: Implement logic to get registered user
        const user = await prisma.user.findUnique({
            where: {
                walletAddress: walletAddress
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('Error getting register user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export const linkUserToParentUser = async (req: Request, res: Response) => {
    try {
        const { walletAddress, parentId } = req.body;
        const user = await prisma.user.findUnique({
            where: {
                walletAddress: walletAddress
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        await prisma.user.update({
            where: {
                walletAddress: walletAddress
            },
            data: {
                parentId: parentId
            }
        });

        const parentUser = await prisma.user.findUnique({
            where: {
                id: parentId
            }
        });
        if (!parentUser) {
            return res.status(404).json({ error: 'Parent user not found' });
        }
        await processRegistrationPayout(walletAddress, parentUser.walletAddress);
        res.status(200).json({ message: 'User linked to parent user' });
    } catch (error) {
        console.error('Error linking user to parent:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export const register = async (req: Request, res: Response) => {
    try {
        const { walletAddress, uplineId } = req.body;

        const contract = getContract();
        const referrerAddress = await contract.idToAddress(BigInt(uplineId));
        if (!referrerAddress) {
            return res.status(400).json({ error: 'Invalid upline ID' });
        }
        const userId = await contract.register(referrerAddress);

        res.status(200).json({ userId });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export const login = async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.body;
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}