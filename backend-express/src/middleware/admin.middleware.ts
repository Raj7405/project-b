import { Request, Response, NextFunction } from 'express';
import { verifyAdminToken } from '../services/admin.service';

/**
 * Extended Request interface to include admin information
 */
export interface AdminRequest extends Request {
  admin?: {
    adminId: string;
  };
}

/**
 * Middleware to authenticate admin requests.
 * Verifies the admin JWT token from the Authorization header.
 * 
 * Usage:
 * - Place this middleware before admin routes
 * - Token must be in format: "Bearer <token>"
 * - Sets req.admin with admin information if valid
 * 
 * Error Responses:
 * - 401: Missing or invalid token
 * - 401: Token expired
 * - 401: Not an admin token
 * 
 * @example
 * router.get('/admin/users', adminAuth, adminController.getAllUsers);
 */
export const adminAuth = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Admin authentication required. Bearer token is required in Authorization header.',
          traceId: req.headers['x-request-id'] as string || 'unknown',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const payload = verifyAdminToken(token);
      req.admin = {
        adminId: payload.adminId
      };
      next();
    } catch (error: any) {
      const statusCode = error.message.includes('expired') ? 401 : 401;
      res.status(statusCode).json({
        error: {
          code: 'INVALID_TOKEN',
          message: error.message || 'Invalid admin token',
          traceId: req.headers['x-request-id'] as string || 'unknown',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred during authentication',
        traceId: req.headers['x-request-id'] as string || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }
};

