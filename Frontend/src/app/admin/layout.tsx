'use client'

import { AdminProvider } from '@/contexts/AdminContext'
import { Toaster } from 'react-hot-toast'
import '../globals.css'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {children}
      </div>
      <Toaster position="top-right" />
    </AdminProvider>
  )
}

