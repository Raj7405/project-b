'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { adminApi } from '@/services/api.service'
import toast from 'react-hot-toast'

interface Admin {
  id: string
  username: string
}

interface AdminContextType {
  admin: Admin | null
  accessToken: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

const ADMIN_TOKEN_KEY = 'admin_access_token'
const ADMIN_USER_KEY = 'admin_user'
const ADMIN_EXPIRY_KEY = 'admin_expiry'

// 24 hours in milliseconds
const ADMIN_SESSION_DURATION = 24 * 60 * 60 * 1000

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Check if session is still valid
  const checkSessionValidity = () => {
    const storedExpiry = localStorage.getItem(ADMIN_EXPIRY_KEY)
    if (!storedExpiry) return false

    try {
      const expiryTime = parseInt(storedExpiry, 10)
      const now = Date.now()

      if (now >= expiryTime) {
        // Session expired, clear everything
        setAdmin(null)
        setAccessToken(null)
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        localStorage.removeItem(ADMIN_USER_KEY)
        localStorage.removeItem(ADMIN_EXPIRY_KEY)
        return false
      }
      return true
    } catch (error) {
      return false
    }
  }

  // Load admin from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(ADMIN_TOKEN_KEY)
    const storedUser = localStorage.getItem(ADMIN_USER_KEY)
    const storedExpiry = localStorage.getItem(ADMIN_EXPIRY_KEY)

    if (storedToken && storedUser && storedExpiry) {
      try {
        const expiryTime = parseInt(storedExpiry, 10)
        const now = Date.now()

        // Check if session has expired
        if (now < expiryTime) {
          setAccessToken(storedToken)
          setAdmin(JSON.parse(storedUser))
        } else {
          // Session expired, clear storage
          localStorage.removeItem(ADMIN_TOKEN_KEY)
          localStorage.removeItem(ADMIN_USER_KEY)
          localStorage.removeItem(ADMIN_EXPIRY_KEY)
        }
      } catch (error) {
        console.error('Error loading admin from storage:', error)
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        localStorage.removeItem(ADMIN_USER_KEY)
        localStorage.removeItem(ADMIN_EXPIRY_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  // Periodically check session validity (every 5 minutes)
  useEffect(() => {
    if (!admin || !accessToken) return

    const interval = setInterval(() => {
      if (!checkSessionValidity()) {
        toast.error('Your admin session has expired. Please login again.')
        router.push('/admin/login')
      }
    }, 5 * 60 * 1000) // Check every 5 minutes

    return () => clearInterval(interval)
  }, [admin, accessToken, router])

  const login = async (username: string, password: string) => {
    try {
      const response = await adminApi.login(username, password)
      
      if (response.success && response.accessToken) {
        setAccessToken(response.accessToken)
        setAdmin(response.admin)
        
        const expiryTime = Date.now() + ADMIN_SESSION_DURATION
        
        localStorage.setItem(ADMIN_TOKEN_KEY, response.accessToken)
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(response.admin))
        localStorage.setItem(ADMIN_EXPIRY_KEY, expiryTime.toString())
        
        toast.success('Admin login successful')
        router.push('/admin/dashboard')
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error: any) {
      console.error('Admin login error:', error)
      toast.error(error.message || 'Login failed. Please check your credentials.')
      throw error
    }
  }

  const logout = () => {
    setAdmin(null)
    setAccessToken(null)
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    localStorage.removeItem(ADMIN_USER_KEY)
    localStorage.removeItem(ADMIN_EXPIRY_KEY)
    toast.success('Logged out successfully')
    router.push('/admin/login')
  }

  // Check authentication status with expiration
  const isAuthenticated = () => {
    if (!admin || !accessToken) return false
    return checkSessionValidity()
  }

  return (
    <AdminContext.Provider
      value={{
        admin,
        accessToken,
        login,
        logout,
        isAuthenticated: isAuthenticated(),
        isLoading
      }}
    >
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}

/**
 * Check if admin is logged in (for use outside AdminProvider)
 * Checks localStorage for valid admin session with expiration
 */
export function isAdminLoggedIn(): boolean {
  if (typeof window === 'undefined') return false

  const storedToken = localStorage.getItem(ADMIN_TOKEN_KEY)
  const storedUser = localStorage.getItem(ADMIN_USER_KEY)
  const storedExpiry = localStorage.getItem(ADMIN_EXPIRY_KEY)

  if (!storedToken || !storedUser || !storedExpiry) {
    return false
  }

  try {
    const expiryTime = parseInt(storedExpiry, 10)
    const now = Date.now()

    // Check if session has expired
    if (now >= expiryTime) {
      // Session expired, clear storage
      localStorage.removeItem(ADMIN_TOKEN_KEY)
      localStorage.removeItem(ADMIN_USER_KEY)
      localStorage.removeItem(ADMIN_EXPIRY_KEY)
      return false
    }

    return true
  } catch (error) {
    return false
  }
}

