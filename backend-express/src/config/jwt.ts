// JWT Configuration
export const JWT_CONFIG = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'your-super-secret-access-token-key-change-in-production',
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-token-key-change-in-production',
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '24h',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',   
  algorithm: 'HS256' as const
};

// Validate that secrets are set
if (!process.env.JWT_ACCESS_SECRET && !process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_ACCESS_SECRET or JWT_SECRET not set. Using default (INSECURE for production!)');
}

if (!process.env.JWT_REFRESH_SECRET) {
  console.warn('⚠️  JWT_REFRESH_SECRET not set. Using default (INSECURE for production!)');
}

// Token payload interfaces
export interface AccessTokenPayload {
  userId: string;
  walletAddress: string;
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

