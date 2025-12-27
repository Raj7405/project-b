'use client'

import AdminLayout from '@/components/admin/AdminLayout'
import { useAdmin } from '@/contexts/AdminContext'
import { FaUsers, FaDollarSign, FaSearch, FaClock, FaChartLine } from 'react-icons/fa'

export default function AdminDashboardPage() {
  const { admin } = useAdmin()

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {admin?.username}!</h1>
          <p className="text-blue-100">Manage your Crypto MLM platform from here</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Total Members</p>
                <p className="text-2xl font-bold text-white">-</p>
              </div>
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <FaUsers className="text-2xl text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Total Income</p>
                <p className="text-2xl font-bold text-white">-</p>
              </div>
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                <FaDollarSign className="text-2xl text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Active Slots</p>
                <p className="text-2xl font-bold text-white">-</p>
              </div>
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <FaSearch className="text-2xl text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Pending Transfers</p>
                <p className="text-2xl font-bold text-white">-</p>
              </div>
              <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                <FaClock className="text-2xl text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/admin/members"
              className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-all border border-slate-600 hover:border-blue-500"
            >
              <FaUsers className="text-2xl mb-2 text-blue-400" />
              <h3 className="font-semibold text-white mb-1">View Members</h3>
              <p className="text-sm text-slate-400">Browse all registered users</p>
            </a>

            <a
              href="/admin/income-reports"
              className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-all border border-slate-600 hover:border-green-500"
            >
              <FaChartLine className="text-2xl mb-2 text-green-400" />
              <h3 className="font-semibold text-white mb-1">Income Reports</h3>
              <p className="text-sm text-slate-400">View income analytics</p>
            </a>

            <a
              href="/admin/level-income"
              className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-all border border-slate-600 hover:border-purple-500"
            >
              <FaDollarSign className="text-2xl mb-2 text-purple-400" />
              <h3 className="font-semibold text-white mb-1">Level Income</h3>
              <p className="text-sm text-slate-400">Manage retopup income</p>
            </a>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

