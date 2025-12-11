import { Request, Response } from 'express';
import prisma from '../config/database';
import { PaymentStatus } from '@prisma/client';
import { Contract } from 'ethers';

import { ethers } from 'ethers';
import { getContract, getContractWithSigner, getTokenContract } from '../config/blockchain';

const RETOPUP_PRICE = process.env.RETOPUP_PRICE;
if (!RETOPUP_PRICE) {
    throw new Error('RETOPUP_PRICE not set in environment');
}

export const registerUser = async (req: Request, res: Response) => {
    try {
        let { walletAddress, uplineId } = req.body;

        // Normalize wallet address to lowercase (Ethereum addresses are case-insensitive)
        walletAddress = walletAddress.toLowerCase();

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
        let walletAddress = req.query.walletAddress as string;

        if(!walletAddress) {
            return res.status(400).json({ error: 'Wallet address is required' });
        }

        // Clean wallet address: remove quotes, trim whitespace, normalize to lowercase
        walletAddress = walletAddress.replace(/['"]/g, '').trim().toLowerCase();
        
        const user = await prisma.user.findUnique({
            where: {
                walletAddress: walletAddress,
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

export const retopupUser = async(req:Request,res:Response)=>{
    try{
        const [walletAddress] = req.body
        const dbUser = await prisma.user.findUnique({
            where: {
                walletAddress: walletAddress,
                paymentStatus:PaymentStatus.COMPLETED
            }
        })

        if (!dbUser) {
            return res.status(404).json({ 
                error: 'User not found or not registered',
                canRetopup: false,
                reason: 'User must be registered and payment must be completed'
            });
        }

        if (dbUser.hasReTopup) {
            return res.status(400).json({ 
                error: 'User has already done retopup',
                canRetopup: false,
                reason: 'Retopup can only be done once per user'
            });
        }

        const contract = getContract();
        const hasRetopup = await contract.hasRetopup(walletAddress);
        if (hasRetopup) {
            return res.status(400).json({ 
                error: 'User has already done retopup',
                canRetopup: false,
                reason: 'Retopup can only be done once per user'
            });
        }

        const retopupPrice = await contract.retopupPrice();
        const contractAddress = process.env.CONTRACT_ADDRESS;
        const tokenAddress = process.env.TOKEN_ADDRESS;
        if (!contractAddress) {
            throw new Error('CONTRACT_ADDRESS not set in environment');
        }
        if (!tokenAddress) {
            throw new Error('TOKEN_ADDRESS not set in environment');
        }

        const tokenContract = getTokenContract();
        const allowance = await tokenContract.allowance(walletAddress, contractAddress);
        if (allowance < retopupPrice) {
            console.log(`❌ Insufficient token allowance for ${walletAddress}`);
            console.log(`   Required: ${ethers.formatEther(retopupPrice)} tokens`);
            console.log(`   Current allowance: ${ethers.formatEther(allowance)} tokens`);
            
            return res.status(400).json({ 
                error: 'Insufficient token allowance',
                canRetopup: false,
                reason: 'Token approval required',
                required: ethers.formatEther(retopupPrice),
                current: ethers.formatEther(allowance),
                contractAddress: contractAddress,
                tokenAddress: tokenAddress
            });
        }

        console.log(`✅ Token allowance verified: ${ethers.formatEther(allowance)} tokens`);
        console.log(`📤 Calling smart contract retopup for ${walletAddress}...`);

        const contractWithSigner = getContractWithSigner();
        const tx = await contractWithSigner.retopup(walletAddress, retopupPrice);
        console.log(`⏳ Waiting for transaction confirmation: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ Retopup transaction confirmed in block ${receipt.blockNumber}`);

        return res.status(200).json({ 
            success: true,
            message: 'Retopup successful',
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber.toString(),
            amount: ethers.formatEther(retopupPrice)
        });

    } catch (error: any) {
        console.error('❌ Error in retopup:', error);
        
        if (error.message && error.message.includes('allowance')) {
            return res.status(400).json({ 
                error: 'Token approval required',
                canRetopup: false,
                details: error.message
            });
        }
        
        if (error.message && error.message.includes('not registered')) {
            return res.status(400).json({ 
                error: 'User not registered on contract',
                canRetopup: false,
                details: error.message
            });
        }
        
        if (error.message && error.message.includes('Insufficient amount')) {
            return res.status(400).json({ 
                error: 'Insufficient amount',
                canRetopup: false,
                details: error.message
            });
        }
        
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message || 'An unexpected error occurred'
        });
    }
}


const createUplineId = (): string => {
    const digits = Math.floor(100 + Math.random() * 900);
    const alphabets = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${digits}-${alphabets}`;
};  