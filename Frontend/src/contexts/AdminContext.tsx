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

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Load admin from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(ADMIN_TOKEN_KEY)
    const storedUser = localStorage.getItem(ADMIN_USER_KEY)

    if (storedToken && storedUser) {
      try {
        setAccessToken(storedToken)
        setAdmin(JSON.parse(storedUser))
      } catch (error) {
        console.error('Error loading admin from storage:', error)
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        localStorage.removeItem(ADMIN_USER_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const response = await adminApi.login(username, password)
      
      if (response.success && response.accessToken) {
        setAccessToken(response.accessToken)
        setAdmin(response.admin)
        
        localStorage.setItem(ADMIN_TOKEN_KEY, response.accessToken)
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(response.admin))
        
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
    toast.success('Logged out successfully')
    router.push('/admin/login')
  }

  return (
    <AdminContext.Provider
      value={{
        admin,
        accessToken,
        login,
        logout,
        isAuthenticated: !!admin && !!accessToken,
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

