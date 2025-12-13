'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import toast from 'react-hot-toast'
import { API_URL } from '@/utils/constants'

interface User {
  id: string
  walletAddress: string
  parentId: string | null
  sponsorCount: number
  hasReTopup: boolean
  hasAutoPoolEntry: boolean
  totalDirectIncome: string
  totalLevelIncome: string
  totalAutoPoolIncome: string
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED'
  createdAt: string
  updatedAt: string
}

interface AuthContextType {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthorized: boolean
  isLoading: boolean
  loginByWallet: (walletAddress: string) => Promise<{ user: User; accessToken: string; refreshToken: string }>
  loginById: (userId: string) => Promise<{ user: User; accessToken: string; refreshToken: string }>
  loginWithToken: () => Promise<void>
  logout: () => void
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthorized: false,
  isLoading: false,
  loginByWallet: async () => ({ user: {} as User, accessToken: '', refreshToken: '' }),
  loginById: async () => ({ user: {} as User, accessToken: '', refreshToken: '' }),
  loginWithToken: async () => {},
  logout: () => {},
  refreshAuth: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Refs to prevent infinite loops
  const isInitializing = useRef(false)
  const loginInProgress = useRef(false)
  const hasInitialized = useRef(false)

  // Save tokens to localStorage when they change
  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken)
    } else {
      localStorage.removeItem('accessToken')
    }

    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken)
    } else {
      localStorage.removeItem('refreshToken')
    }
  }, [accessToken, refreshToken])

  /**
   * Login by wallet address (for first-time users or users without tokens)
   */
  const loginByWallet = useCallback(async (walletAddress: string) => {
    // Prevent multiple simultaneous calls
    if (loginInProgress.current) {
      console.log('Login already in progress, skipping...')
      return
    }

    try {
      loginInProgress.current = true
      setIsLoading(true)
      const cleanAddress = walletAddress.replace(/['"]/g, '').trim().toLowerCase()
      
      const response = await fetch(
        `${API_URL}/api/auth/get-register-user?walletAddress=${cleanAddress}`
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch user')
      }

      const data = await response.json()
      
      setUser(data.user)
      setAccessToken(data.accessToken)
      setRefreshToken(data.refreshToken)
      setIsAuthorized(data.isAuthorized || false)

      if (!data.isAuthorized) {
        toast.success('User found! Tokens generated. You can now use authenticated features.')
      }

      // Return user data for immediate use
      return { user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken }
    } catch (error: any) {
      console.error('Login by wallet error:', error)
      toast.error(error.message || 'Failed to login')
      throw error
    } finally {
      setIsLoading(false)
      loginInProgress.current = false
    }
  }, []) // Empty deps - function doesn't depend on state

  /**
   * Login by user ID (for first-time users or users without tokens)
   */
  const loginById = useCallback(async (userId: string) => {
    // Prevent multiple simultaneous calls
    if (loginInProgress.current) {
      console.log('Login already in progress, skipping...')
      return
    }

    try {
      loginInProgress.current = true
      setIsLoading(true)
      
      const response = await fetch(
        `${API_URL}/api/auth/get-register-user?id=${userId}`
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch user')
      }

      const data = await response.json()
      
      setUser(data.user)
      setAccessToken(data.accessToken)
      setRefreshToken(data.refreshToken)
      setIsAuthorized(data.isAuthorized || false)

      if (!data.isAuthorized) {
        toast.success('User found! Tokens generated. You can now use authenticated features.')
      }

      // Return user data for immediate use
      return { user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken }
    } catch (error: any) {
      console.error('Login by ID error:', error)
      toast.error(error.message || 'Failed to login')
      throw error
    } finally {
      setIsLoading(false)
      loginInProgress.current = false
    }
  }, []) // Empty deps - function doesn't depend on state

  /**
   * Login with existing tokens (for returning users)
   * Handles token expiration gracefully
   */
  const loginWithToken = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isInitializing.current) {
      return
    }

    try {
      isInitializing.current = true
      setIsLoading(true)
      const storedAccessToken = localStorage.getItem('accessToken')
      const storedRefreshToken = localStorage.getItem('refreshToken')

      if (!storedAccessToken || !storedRefreshToken) {
        // No tokens found - user needs to login
        console.log('No tokens found in storage')
        setIsLoading(false)
        isInitializing.current = false
        return
      }

      const response = await fetch(
        `${API_URL}/api/auth/get-register-user`,
        {
          headers: {
            'Authorization': `Bearer ${storedAccessToken}`,
            'x-refresh-token': storedRefreshToken
          }
        }
      )

      if (!response.ok) {
        // Token expired or invalid
        if (response.status === 401 || response.status === 403) {
          console.log('Token expired or invalid, clearing session')
          // Clear all auth data
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          setAccessToken(null)
          setRefreshToken(null)
          setUser(null)
          setIsAuthorized(false)
          // Don't show error toast - this is expected behavior for expired tokens
        }
        setIsLoading(false)
        isInitializing.current = false
        return
      }

      const data = await response.json()
      
      // Successfully authenticated - restore session
      setUser(data.user)
      setAccessToken(data.accessToken)
      setRefreshToken(data.refreshToken)
      setIsAuthorized(data.isAuthorized || false)
      
      console.log('✅ Session restored for user:', data.user?.id)
    } catch (error: any) {
      console.error('Login with token error:', error)
      // Network error or other issue - clear tokens to be safe
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      setAccessToken(null)
      setRefreshToken(null)
      setUser(null)
      setIsAuthorized(false)
    } finally {
      setIsLoading(false)
      isInitializing.current = false
    }
  }, [])

  // Initialize: Load tokens from localStorage on mount (only once)
  // This must be after loginWithToken is defined
  useEffect(() => {
    if (hasInitialized.current) {
      return // Already initialized, don't run again
    }

    const storedAccessToken = localStorage.getItem('accessToken')
    const storedRefreshToken = localStorage.getItem('refreshToken')

    if (storedAccessToken && storedRefreshToken) {
      setAccessToken(storedAccessToken)
      setRefreshToken(storedRefreshToken)
      // Try to authenticate with stored tokens (only once)
      // This will restore the session if tokens are valid
      loginWithToken()
    } else {
      // No tokens found - user needs to login
      setIsLoading(false)
    }

    hasInitialized.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount - loginWithToken is stable (empty deps)

  // Ref to prevent refreshAuth from being called multiple times
  const refreshInProgress = useRef(false)

  /**
   * Refresh authentication tokens
   */
  const refreshAuth = useCallback(async () => {
    if (!accessToken || !refreshToken || refreshInProgress.current) {
      return
    }

    try {
      refreshInProgress.current = true
      const response = await fetch(
        `${API_URL}/api/auth/get-register-user`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-refresh-token': refreshToken
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setAccessToken(data.accessToken)
        setRefreshToken(data.refreshToken)
        setIsAuthorized(data.isAuthorized || false)
      }
    } catch (error) {
      console.error('Refresh auth error:', error)
    } finally {
      refreshInProgress.current = false
    }
  }, [accessToken, refreshToken])

  /**
   * Logout - clear all auth state and persisted data
   */
  const logout = useCallback(() => {
    setUser(null)
    setAccessToken(null)
    setRefreshToken(null)
    setIsAuthorized(false)
    // Clear all persisted auth data
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('walletAddress')
    localStorage.removeItem('walletConnected')
    loginInProgress.current = false
    isInitializing.current = false
    toast.success('Logged out successfully')
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        isAuthorized,
        isLoading,
        loginByWallet,
        loginById,
        loginWithToken,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

