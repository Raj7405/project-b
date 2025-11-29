import { Request, Response } from 'express';
import prisma from '../config/database';
import { PaymentStatus } from '@prisma/client';

export const registerUser = async (req: Request, res: Response) => {
    try {
        const { walletAddress, uplineId } = req.body;

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

        const newUplineId = createUplineId();
        const newUser = await prisma.user.create({
          data: {
            id: newUplineId,
            walletAddress,
            parentId: uplineId,
            paymentStatus: PaymentStatus.PENDING,
            sponsorCount: 0,
            hasReTopup: false,
            hasAutoPoolEntry: false,
            totalDirectIncome: 0,
            totalLevelIncome: 0,
            totalAutoPoolIncome: 0
          }
        });

        // Frontend will call the contract directly
        // Listener will automatically process the RegistrationAccepted event
        // and update payment status + trigger payouts

        res.status(200).json({
            canRegister: true,
            reason: '',
            user: {
                id: newUser.id,
                walletAddress: newUser.walletAddress,
                parentId: newUser.parentId,
                paymentStatus: newUser.paymentStatus
            },
            message: 'User created in database. Please call contract.register() from frontend.'
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


const createUplineId = (): string => {
    const digits = Math.floor(100 + Math.random() * 900);
    const alphabets = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${digits}-${alphabets}`;
};  