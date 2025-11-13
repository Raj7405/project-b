'use client'

import BinaryTreeStructure from '@/components/BinaryTreeStructure'
import Dashboard from '@/components/Dashboard'

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <section className="hero-mask-image w-full h-auto">
        <div className="container mx-auto px-4 py-8">
          {/* Dashboard Stats */}
          <Dashboard />
          
          {/* Binary Tree Visualization */}
          <div className="mt-8">
            <BinaryTreeStructure height="800px" />
          </div>
        </div>
      </section>
    </div>
  )
}

