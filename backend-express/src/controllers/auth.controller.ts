import { Request, Response } from 'express';
import prisma from '../config/database';
import { PaymentStatus } from '@prisma/client';
import { Contract } from 'ethers';

import { ethers } from 'ethers';
import { getContract, getContractWithSigner, getTokenContract } from '../config/blockchain';
import { generateTokens, getTokenExpiry, verifyToken } from '../services/auth.service';

const RETOPUP_PRICE = process.env.RETOPUP_PRICE || '40';
if (!RETOPUP_PRICE) {
    throw new Error('RETOPUP_PRICE not set in environment');
}

export const registerUser = async (req: Request, res: Response) => {
    try {
        let { walletAddress, uplineId } = req.body;

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

        const { accessToken, refreshToken } = generateTokens(newUser.id, newUser.walletAddress);


        const contract = getContract();
        const registrationPrice = await contract.entryPrice();
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
        if (allowance < registrationPrice) {
            console.log(`❌ Insufficient token allowance for ${walletAddress}`);
            console.log(`   Required: ${ethers.formatEther(registrationPrice)} tokens`);
            console.log(`   Current allowance: ${ethers.formatEther(allowance)} tokens`);
            
            return res.status(400).json({ 
                error: 'Insufficient token allowance',
                canRetopup: false,
                reason: 'Token approval required',
                required: ethers.formatEther(registrationPrice),
                current: ethers.formatEther(allowance),
                contractAddress: contractAddress,
                tokenAddress: tokenAddress
            });
        }

        console.log(`✅ Token allowance verified: ${ethers.formatEther(allowance)} tokens`);
        console.log(`📤 Calling smart contract register for ${walletAddress}...`);

        const contractWithSigner = getContractWithSigner();
        const tx = await contractWithSigner.register(walletAddress, registrationPrice);
        console.log(`⏳ Waiting for transaction confirmation: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ Registration transaction confirmed in block ${receipt.blockNumber}`);

        const updatedUser = await prisma.user.update({
            where: { id: newUser.id },
            data: { paymentStatus: PaymentStatus.COMPLETED }
        });

        console.log(`✅ Payment status updated to COMPLETED for user ${walletAddress}`);

        res.status(200).json({
            canRegister: true,
            reason: '',
            user: {
                id: updatedUser.id,
                walletAddress: updatedUser.walletAddress,
                parentId: updatedUser.parentId,
                paymentStatus: updatedUser.paymentStatus
            },
            accessToken,
            refreshToken,
            expiresIn: getTokenExpiry(false), 
            refreshExpiresIn: getTokenExpiry(true), 
            message: 'Registration completed successfully. Payment status updated to COMPLETED.',
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber.toString(),
            amount: ethers.formatEther(registrationPrice)
        });

    } catch (error) {
        console.error('Error validating registration:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Unified endpoint to get user by wallet address or user ID
 * 
 * FLOW EXPLANATION:
 * 1. If user has valid Bearer token → Authenticate them, return user + refreshed tokens (isAuthorized: true)
 * 2. If user searches by wallet/ID (no token) → Find user, generate NEW tokens for first-time login (isAuthorized: false)
 *    - This allows non-logged-in users to get tokens they can use for future authenticated requests
 *    - Frontend should store these tokens and use them in subsequent requests
 * 
 * Supports:
 * - Authorization token (Bearer token) - returns user with refreshed tokens if valid
 * - Query param: walletAddress - find user by wallet address (generates tokens for first-time users)
 * - Query param: id or userId - find user by user ID (generates tokens for first-time users)
 * 
 * Returns user data and tokens in all cases (tokens are always provided for authentication)
 */
export const getRegisterUser = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        let user = null;
        let isAuthorized = false;
        let accessToken: string | undefined;
        let refreshToken: string | undefined;

        // SCENARIO 1: User has a valid Bearer token (already logged in)
        if (authHeader?.startsWith('Bearer ')) {
            try {
                const token = authHeader.substring(7);
                const payload = verifyToken(token);
                
                if (payload.type === 'access') {
                    user = await prisma.user.findUnique({
                        where: { id: payload.userId }
                    });

                    if (!user) {
                        return res.status(404).json({ 
                            error: 'User not found',
                            isAuthorized: false 
                        });
                    }

                    const now = Math.floor(Date.now() / 1000);
                    const timeUntilExpiry = (payload.exp || 0) - now;
                    
                    accessToken = token;
                    refreshToken = req.headers['x-refresh-token'] as string;
                    
                    // Refresh tokens if they're about to expire (within 5 minutes)
                    if (timeUntilExpiry < 300) { 
                        const tokens = generateTokens(user.id, user.walletAddress);
                        accessToken = tokens.accessToken;
                        refreshToken = tokens.refreshToken;
                    }

                    isAuthorized = true; // User is authenticated via valid token
                }
            } catch (error: any) {
                if (error.message === 'Token has expired' || error.message === 'Invalid token') {
                    return res.status(401).json({ 
                        error: error.message,
                        isAuthorized: false 
                    });
                }
                // If token verification fails, continue to check query params (fallback to scenario 2)
            }
        }

        // SCENARIO 2: User is NOT logged in - searching by wallet address or user ID
        // This is for first-time users or users who don't have tokens yet
        if (!user) {
            const walletAddress = req.query.walletAddress as string;
            const userId = req.query.id as string || req.query.userId as string;

            if (!walletAddress && !userId) {
                return res.status(400).json({ 
                    error: 'Please provide either walletAddress, id/userId query parameter, or a valid authorization token',
                    isAuthorized: false
                });
            }

            // Find user by wallet address
            if (walletAddress) {
                const cleanAddress = walletAddress.replace(/['"]/g, '').trim().toLowerCase();
                user = await prisma.user.findUnique({
                    where: { walletAddress: cleanAddress }
                });
            } 
            // Find user by ID
            else if (userId) {
                user = await prisma.user.findUnique({
                    where: { id: userId }
                });
            }

            if (!user) {
                return res.status(404).json({ 
                    error: 'User not found',
                    isAuthorized: false 
                });
            }

            // IMPORTANT: Generate tokens for first-time users or users without tokens
            // These tokens allow them to authenticate in future requests
            // isAuthorized: false because they haven't proven ownership yet (no token was provided)
            // but tokens are provided so they can use them for next request
            const tokens = generateTokens(user.id, user.walletAddress);
            accessToken = tokens.accessToken;
            refreshToken = tokens.refreshToken;
            isAuthorized = false; // Not authenticated via token, but tokens provided for future use
        }

        // Return user data with tokens (tokens are ALWAYS provided)
        const response: any = {
            user,
            isAuthorized, // true if authenticated via token, false if found via query params
            // Tokens are always included so users can authenticate in future requests
            accessToken,
            refreshToken,
            expiresIn: getTokenExpiry(false),
            refreshExpiresIn: getTokenExpiry(true)
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            isAuthorized: false 
        });
    }
}

/**
 * Legacy endpoint - kept for backward compatibility
 * Use getRegisterUser with query param 'id' instead
 */
export const getUserById = async(req:Request,res:Response)=>{
    try{
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id: id }
        });
        if(!user){
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Generate tokens for the user
        const { accessToken, refreshToken } = generateTokens(user.id, user.walletAddress);
        
        res.status(200).json({
            user,
            accessToken,
            refreshToken,
            expiresIn: getTokenExpiry(false),
            refreshExpiresIn: getTokenExpiry(true),
            isAuthorized: false
        });
    }
    catch(error){
        console.error('Error getting user by id:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export const retopupUser = async(req:Request,res:Response)=>{
    try{
        const authHeader = req.headers.authorization;
        let walletAddress: string | undefined;
        let authorizedWalletAddress: string | undefined;

        if (authHeader?.startsWith('Bearer ')) {
            try {
                const token = authHeader.substring(7);
                const payload = verifyToken(token);
                
                if (payload.type === 'access') {
                    authorizedWalletAddress = payload.walletAddress.toLowerCase();
                    
                    const authorizedUser = await prisma.user.findUnique({
                        where: { id: payload.userId }
                    });

                    if (!authorizedUser) {
                        return res.status(404).json({ 
                            error: 'User not found',
                            canRetopup: false,
                            reason: 'User associated with token not found'
                        });
                    }

                    walletAddress = authorizedWalletAddress;
                }
            } catch (error: any) {
                if (error.message === 'Token has expired' || error.message === 'Invalid token') {
                    return res.status(401).json({ 
                        error: error.message,
                        canRetopup: false,
                        reason: 'Invalid or expired authentication token'
                    });
                }
            }
        }

        if (!walletAddress) {
            const bodyWalletAddress = Array.isArray(req.body) ? req.body[0] : req.body.walletAddress;
            
            if (!bodyWalletAddress) {
                return res.status(400).json({ 
                    error: 'Wallet address is required or provide valid authorization token',
                    canRetopup: false,
                    reason: 'Either provide walletAddress in body or valid Bearer token'
                });
            }

            walletAddress = bodyWalletAddress.toLowerCase();
        }

        if (authorizedWalletAddress && req.body) {
            const bodyWalletAddress = Array.isArray(req.body) ? req.body[0] : req.body.walletAddress;
            if (bodyWalletAddress && bodyWalletAddress.toLowerCase() !== authorizedWalletAddress) {
                return res.status(403).json({ 
                    error: 'Wallet address mismatch',
                    canRetopup: false,
                    reason: 'Wallet address in request body does not match authenticated wallet address'
                });
            }
        }

        if (!walletAddress) {
            return res.status(400).json({ 
                error: 'Wallet address is required',
                canRetopup: false,
                reason: 'Wallet address must be provided'
            });
        }

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