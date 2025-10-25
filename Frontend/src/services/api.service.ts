// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// User API
export const userApi = {
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

// Transaction API
export const transactionApi = {
  getUserTransactions: async (userId: string | number) => {
    const response = await fetch(`${API_BASE_URL}/transactions/user/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  },

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

  getUserTransactionsByType: async (userId: string | number, type: string) => {
    const response = await fetch(`${API_BASE_URL}/transactions/user/${userId}/type/${type}`);
    if (!response.ok) throw new Error('Failed to fetch transactions by type');
    return response.json();
  },

  getRecentTransactions: async (days: number = 7, limit: number = 100) => {
    const response = await fetch(
      `${API_BASE_URL}/transactions/recent?days=${days}&limit=${limit}`
    );
    if (!response.ok) throw new Error('Failed to fetch recent transactions');
    return response.json();
  },

  getTotalIncomeByType: async (userId: string | number, type: string) => {
    const response = await fetch(
      `${API_BASE_URL}/transactions/user/${userId}/income/${type}`
    );
    if (!response.ok) throw new Error('Failed to fetch total income');
    const data = await response.json();
    return data.total;
  },
};

// Stats API
export const statsApi = {
  getStats: async (recentDays: number = 7) => {
    const response = await fetch(`${API_BASE_URL}/stats?recentDays=${recentDays}`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  healthCheck: async () => {
    const response = await fetch(`${API_BASE_URL}/stats/health`);
    if (!response.ok) throw new Error('Health check failed');
    return response.json();
  },
};

