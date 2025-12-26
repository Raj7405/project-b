'use client'

import { usePathname } from 'next/navigation'
import Footer from './Footer'

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/admin')

  if (isAdminRoute) {
    // Admin routes have their own layout, just render children
    return <>{children}</>
  }

  // Main app routes - include Footer
  return (
    <div className="flex flex-col min-h-screen">
      {/* <Navbar /> */}
      <main className="grow">
        {children}
      </main>
      <Footer />
    </div>
  )
}

