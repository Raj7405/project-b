'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useAdmin } from '@/contexts/AdminContext'
import { adminApi } from '@/services/api.service'
import toast from 'react-hot-toast'

interface Member {
  no: number
  userId: string
  walletAddress: string
  parentId: string | null
  parentWalletAddress: string | null
  sponsorCount: number
  directIncome: string
  slotIncome: string
  levelIncome: string
  registrationDate: string
}

export default function MembersPage() {
  const { accessToken } = useAdmin()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [search, setSearch] = useState('')
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [incomeDetails, setIncomeDetails] = useState<any>(null)
  const [showIncomeModal, setShowIncomeModal] = useState(false)

  useEffect(() => {
    if (accessToken) {
      loadMembers()
    }
  }, [accessToken, page, size, search])

  const loadMembers = async () => {
    if (!accessToken) return

    try {
      setLoading(true)
      const response = await adminApi.getMembers(accessToken, {
        page,
        size,
        search: search || undefined
      })

      if (response.success) {
        setMembers(response.data || [])
        setTotalPages(response.pagination?.totalPages || 0)
        setTotalElements(response.pagination?.totalElements || 0)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  const handleViewIncome = async (userId: string) => {
    if (!accessToken) return

    try {
      const response = await adminApi.getUserIncomeDetails(accessToken, userId)
      setIncomeDetails(response)
      setSelectedUser(userId)
      setShowIncomeModal(true)
    } catch (error: any) {
      toast.error(error.message || 'Failed to load income details')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatCurrency = (value: string) => {
    return parseFloat(value).toFixed(2)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Member Register</h1>
            <p className="text-slate-400">View and manage all registered users</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search by User ID or Wallet Address..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value))
                setPage(0)
              }}
              className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-4 text-slate-400">Loading members...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-400">No members found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">No.</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">User ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Wallet Address</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Parent ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Sponsor Count</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Direct Income</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Slot Income</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Level Income</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Registration Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {members.map((member) => (
                    <tr key={member.userId} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-300">{member.no}</td>
                      <td className="px-6 py-4 text-sm font-medium text-white">{member.userId}</td>
                      <td className="px-6 py-4 text-sm text-slate-300 font-mono">
                        {member.walletAddress.slice(0, 6)}...{member.walletAddress.slice(-4)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">{member.parentId || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">{member.sponsorCount}</td>
                      <td className="px-6 py-4 text-sm text-green-400">${formatCurrency(member.directIncome)}</td>
                      <td className="px-6 py-4 text-sm text-blue-400">${formatCurrency(member.slotIncome)}</td>
                      <td className="px-6 py-4 text-sm text-purple-400">${formatCurrency(member.levelIncome)}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">{formatDate(member.registrationDate)}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewIncome(member.userId)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-all"
                        >
                          Income Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Showing {page * size + 1} to {Math.min((page + 1) * size, totalElements)} of {totalElements} members
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-slate-300">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Income Details Modal */}
        {showIncomeModal && incomeDetails && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  Income Details - User {selectedUser}
                </h2>
                <button
                  onClick={() => setShowIncomeModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 space-y-6">
                {/* Direct Income */}
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-400 mb-3">Direct Income</h3>
                  <p className="text-white mb-2">
                    Total: <span className="font-bold">${formatCurrency(incomeDetails.income?.directIncome?.total || '0')}</span>
                  </p>
                  <p className="text-slate-400 text-sm">
                    Transactions: {incomeDetails.income?.directIncome?.transactionCount || 0}
                  </p>
                </div>

                {/* Slot Income */}
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-400 mb-3">Slot Income</h3>
                  <p className="text-white mb-2">
                    Total: <span className="font-bold">${formatCurrency(incomeDetails.income?.slotIncome?.total || '0')}</span>
                  </p>
                  <p className="text-slate-400 text-sm">
                    Transactions: {incomeDetails.income?.slotIncome?.transactionCount || 0}
                  </p>
                </div>

                {/* Level Income */}
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-purple-400 mb-3">Level Income</h3>
                  <p className="text-white mb-2">
                    Total: <span className="font-bold">${formatCurrency(incomeDetails.income?.levelIncome?.total || '0')}</span>
                  </p>
                  <p className="text-slate-400 text-sm">
                    Transactions: {incomeDetails.income?.levelIncome?.transactionCount || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

