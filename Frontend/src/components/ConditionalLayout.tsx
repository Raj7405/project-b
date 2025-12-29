'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Footer from './Footer'
import WalletControl from './WalletControl'
import { isAdminLoggedIn } from '@/contexts/AdminContext'

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const isAdminRoute = pathname?.startsWith('/admin')

  useEffect(() => {
    // Only check admin login status for non-admin routes
    if (!isAdminRoute) {
      const adminLoggedIn = isAdminLoggedIn()
      
      if (adminLoggedIn) {
        // Admin is logged in, redirect to admin dashboard
        router.replace('/admin/dashboard')
      }
    }
    setIsChecking(false)
  }, [pathname, isAdminRoute, router])

  if (isAdminRoute) {
    // Admin routes have their own layout, just render children
    return <>{children}</>
  }

  // If checking admin status, show loading or nothing
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  // Main app routes - include WalletControl and Footer
  return (
    <div className="flex flex-col min-h-screen">
      <main className="grow">
        {children}
      </main>
      <Footer />
      <WalletControl />
    </div>
  )
}

