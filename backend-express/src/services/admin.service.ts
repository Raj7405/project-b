import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../config/jwt';

// Admin token payload interface
export interface AdminTokenPayload {
  adminId: string;
  type: 'admin';
  iat?: number;
  exp?: number;
}

/**
 * Generates an admin JWT token after successful authentication.
 * The token includes admin identifier and type for authorization checks.
 *
 * @param adminId - Unique identifier for the admin (can be a simple string like 'admin')
 * @returns Object containing the access token
 *
 * @example
 * const { accessToken } = generateAdminToken('admin');
 */
export function generateAdminToken(adminId: string): { accessToken: string } {
  const accessTokenOptions: jwt.SignOptions = {
    expiresIn: JWT_CONFIG.accessTokenExpiry as jwt.SignOptions['expiresIn'],
    algorithm: JWT_CONFIG.algorithm
  };

  const accessToken = jwt.sign(
    {
      adminId,
      type: 'admin'
    } as AdminTokenPayload,
    JWT_CONFIG.accessTokenSecret,
    accessTokenOptions
  );

  return { accessToken };
}

/**
 * Verifies an admin JWT token and returns the decoded payload.
 * Throws an error if the token is invalid, expired, or not an admin token.
 *
 * @param token - JWT token string to verify
 * @returns Decoded admin token payload
 * @throws Error if token is invalid, expired, or not an admin token
 *
 * @example
 * try {
 *   const payload = verifyAdminToken(token);
 *   console.log('Admin ID:', payload.adminId);
 * } catch (error) {
 *   console.error('Token verification failed:', error.message);
 * }
 */
export function verifyAdminToken(token: string): AdminTokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.accessTokenSecret, {
      algorithms: [JWT_CONFIG.algorithm]
    }) as AdminTokenPayload;

    if (decoded.type !== 'admin') {
      throw new Error('Token is not an admin token');
    }

    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Admin token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid admin token');
    }
    throw error;
  }
}

/**
 * Validates admin credentials against environment variables.
 * Admin username and password are stored in environment variables:
 * - ADMIN_USERNAME
 * - ADMIN_PASSWORD
 *
 * @param username - Username to validate
 * @param password - Password to validate
 * @returns True if credentials match, false otherwise
 *
 * @example
 * const isValid = validateAdminCredentials('admin', 'password123');
 * if (isValid) {
 *   // Generate token and allow access
 * }
 */
export function validateAdminCredentials(username: string, password: string): boolean {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    console.error('❌ ADMIN_USERNAME or ADMIN_PASSWORD not set in environment variables');
    return false;
  }

  return username === adminUsername && password === adminPassword;
}

