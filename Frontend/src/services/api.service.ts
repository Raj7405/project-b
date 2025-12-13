// API Configuration
const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL}/api` || 'http://localhost:5000/api';

// Auth/User API - ACTIVE ROUTES (mounted in server.ts)
export const authApi = {
  /**
   * Unified endpoint to get user by wallet address, user ID, or token
   * Returns user data and tokens automatically
   */
  getRegisterUser: async (options: {
    walletAddress?: string
    userId?: string
    accessToken?: string
    refreshToken?: string
  }) => {
    const { walletAddress, userId, accessToken, refreshToken } = options

    let url = `${API_BASE_URL}/auth/get-register-user`
    const headers: HeadersInit = {}

    // If tokens provided, use authenticated request
    if (accessToken && refreshToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
      headers['x-refresh-token'] = refreshToken
    }
    // Otherwise, use query params
    else if (walletAddress) {
      const cleanAddress = walletAddress.replace(/['"]/g, '').trim().toLowerCase()
      url += `?walletAddress=${cleanAddress}`
    } else if (userId) {
      url += `?id=${userId}`
    } else {
      throw new Error('Please provide walletAddress, userId, or tokens')
    }

    const response = await fetch(url, { headers })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch user')
    }
    return response.json()
  },

  // Legacy: Get user by ID (uses unified endpoint internally)
  getUserById: async (userId: string | number) => {
    return authApi.getRegisterUser({ userId: String(userId) })
  },

  // Legacy: Get user by wallet (uses unified endpoint internally)
  getUserByWallet: async (walletAddress: string) => {
    return authApi.getRegisterUser({ walletAddress })
  },

  // POST /api/auth/register-user
  registerUser: async (walletAddress: string, uplineId: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/register-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        walletAddress: walletAddress.toLowerCase(), 
        uplineId 
      })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.reason || 'Failed to register user');
    }
    return response.json();
  },

  // POST /api/auth/retopup
  retopupUser: async (walletAddress: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/retopup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([walletAddress])
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.reason || error.error || 'Failed to retopup');
    }
    return response.json();
  },
};

// User API - NOT MOUNTED YET (exists in code but not in server.ts)
// Uncomment when these routes are added to server.ts with: app.use('/api/users', userRoutes);
export const userApi = {
  // Note: These endpoints exist in user.controller.ts but are NOT mounted in server.ts
  // To enable, add to server.ts: app.use('/api/users', userRoutes);
  
  getUserById: async (userId: string | number) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  },

  getUserByWallet: async (walletAddress: string) => {
    const response = await fetch(`${API_BASE_URL}/users/wallet/${walletAddress}`);
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  },

  getChildren: async (parentId: string | number) => {
    const response = await fetch(`${API_BASE_URL}/users/children/${parentId}`);
    if (!response.ok) throw new Error('Failed to fetch children');
    return response.json();
  },

  getAllUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/users`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  getRecentRegistrations: async (days: number = 7) => {
    const response = await fetch(`${API_BASE_URL}/users/recent?days=${days}`);
    if (!response.ok) throw new Error('Failed to fetch recent registrations');
    return response.json();
  },

  getTotalUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/users/count`);
    if (!response.ok) throw new Error('Failed to fetch total users');
    const data = await response.json();
    return data.count;
  },

  getActiveReTopupCount: async () => {
    const response = await fetch(`${API_BASE_URL}/users/retopup/count`);
    if (!response.ok) throw new Error('Failed to fetch active re-topup count');
    const data = await response.json();
    return data.count;
  },
};

// Transaction API - NOT MOUNTED YET (exists in code but not in server.ts)
// Uncomment when these routes are added to server.ts with: app.use('/api/transactions', transactionRoutes);
export const transactionApi = {
  // Note: These endpoints exist in transaction.controller.ts but are NOT mounted in server.ts
  // To enable, add to server.ts: 
  // import transactionRoutes from './routes/transaction.routes';
  // app.use('/api/transactions', transactionRoutes);

  // GET /api/transactions/user/:userId
  getUserTransactions: async (userId: string | number) => {
    const response = await fetch(`${API_BASE_URL}/transactions/user/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  },

  // GET /api/transactions/user/:userId/paginated?page=0&size=20
  getUserTransactionsPaginated: async (
    userId: string | number,
    page: number = 0,
    size: number = 20
  ) => {
    const response = await fetch(
      `${API_BASE_URL}/transactions/user/${userId}/paginated?page=${page}&size=${size}`
    );
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  },

  // GET /api/transactions/user/:userId/type/:type
  getUserTransactionsByType: async (userId: string | number, type: string) => {
    const response = await fetch(`${API_BASE_URL}/transactions/user/${userId}/type/${type}`);
    if (!response.ok) throw new Error('Failed to fetch transactions by type');
    return response.json();
  },

  // GET /api/transactions/recent?days=7&limit=100
  getRecentTransactions: async (days: number = 7, limit: number = 100) => {
    const response = await fetch(
      `${API_BASE_URL}/transactions/recent?days=${days}&limit=${limit}`
    );
    if (!response.ok) throw new Error('Failed to fetch recent transactions');
    return response.json();
  },

  // GET /api/transactions/user/:userId/income/:type
  getTotalIncomeByType: async (userId: string | number, type: string) => {
    const response = await fetch(
      `${API_BASE_URL}/transactions/user/${userId}/income/${type}`
    );
    if (!response.ok) throw new Error('Failed to fetch total income');
    const data = await response.json();
    return data.total;
  },
};

// Stats API - NOT MOUNTED YET (exists in code but not in server.ts)
// Uncomment when these routes are added to server.ts with: app.use('/api/stats', statsRoutes);
export const statsApi = {
  // Note: These endpoints exist in stats.controller.ts but are NOT mounted in server.ts
  // To enable, add to server.ts:
  // import statsRoutes from './routes/stats.routes';
  // app.use('/api/stats', statsRoutes);

  // GET /api/stats?recentDays=7
  getStats: async (recentDays: number = 7) => {
    const response = await fetch(`${API_BASE_URL}/stats?recentDays=${recentDays}`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  // GET /api/stats/health
  healthCheck: async () => {
    const response = await fetch(`${API_BASE_URL}/stats/health`);
    if (!response.ok) throw new Error('Health check failed');
    return response.json();
  },
};

// Server Health Check - ACTIVE ROUTE
export const healthApi = {
  // GET /health (root level, not /api/health)
  checkHealth: async () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const response = await fetch(`${baseUrl}/health`);
    if (!response.ok) throw new Error('Health check failed');
    return response.json();
  },
};

// Transaction Types (for reference when using transaction APIs)
export const TransactionTypes = {
  REGISTRATION: 'REGISTRATION',
  DIRECT_INCOME: 'DIRECT_INCOME',
  LEVEL_INCOME: 'LEVEL_INCOME',
  AUTO_POOL_INCOME: 'AUTO_POOL_INCOME',
  RETOPUP: 'RETOPUP',
  RETOPUP_SKIPPED: 'RETOPUP_SKIPPED',
} as const;

export type TransactionType = typeof TransactionTypes[keyof typeof TransactionTypes];
