import jwt from 'jsonwebtoken';
import { JWT_CONFIG, AccessTokenPayload, RefreshTokenPayload } from '../config/jwt';

export function generateTokens(userId: string, walletAddress: string): {
  accessToken: string;
  refreshToken: string;
} {
  const accessTokenOptions: jwt.SignOptions = {
    expiresIn: JWT_CONFIG.accessTokenExpiry as jwt.SignOptions['expiresIn'],
    algorithm: JWT_CONFIG.algorithm
  };

  const refreshTokenOptions: jwt.SignOptions = {
    expiresIn: JWT_CONFIG.refreshTokenExpiry as jwt.SignOptions['expiresIn'],
    algorithm: JWT_CONFIG.algorithm
  };

  const accessToken = jwt.sign(
    {
      userId,
      walletAddress: walletAddress.toLowerCase(),
      type: 'access'
    } as AccessTokenPayload,
    JWT_CONFIG.accessTokenSecret,
    accessTokenOptions
  );

  const refreshToken = jwt.sign(
    {
      userId,
      type: 'refresh'
    } as RefreshTokenPayload,
    JWT_CONFIG.refreshTokenSecret,
    refreshTokenOptions
  );

  return { accessToken, refreshToken };
}

export function verifyToken(token: string, isRefresh = false): AccessTokenPayload | RefreshTokenPayload {
  const secret = isRefresh ? JWT_CONFIG.refreshTokenSecret : JWT_CONFIG.accessTokenSecret;
  
  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: [JWT_CONFIG.algorithm]
    }) as AccessTokenPayload | RefreshTokenPayload;
    
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
}


export function getTokenExpiry(isRefresh = false): number {
  const expiry = isRefresh ? JWT_CONFIG.refreshTokenExpiry : JWT_CONFIG.accessTokenExpiry;
  
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 86400; 
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400
  };
  
  return value * (multipliers[unit] || 86400);
}

