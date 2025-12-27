'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useAdmin } from '@/contexts/AdminContext'
import { adminApi } from '@/services/api.service'
import toast from 'react-hot-toast'
import { FaChartBar, FaUsers, FaSearch, FaDollarSign } from 'react-icons/fa'

type ReportType = 'overall' | 'direct' | 'slot' | 'level'

export default function IncomeReportsPage() {
  const { accessToken } = useAdmin()
  const [activeTab, setActiveTab] = useState<ReportType>('overall')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [userId, setUserId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reportData, setReportData] = useState<any>(null)

  useEffect(() => {
    if (accessToken) {
      loadReport()
    }
  }, [accessToken, activeTab, page, size, userId, startDate, endDate])

  const loadReport = async () => {
    if (!accessToken) return

    try {
      setLoading(true)
      const options = {
        page,
        size,
        userId: userId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      }

      let response
      switch (activeTab) {
        case 'overall':
          response = await adminApi.getOverallIncomeReport(accessToken, options)
          break
        case 'direct':
          response = await adminApi.getDirectIncomeReport(accessToken, options)
          break
        case 'slot':
          response = await adminApi.getSlotIncomeReport(accessToken, options)
          break
        case 'level':
          response = await adminApi.getLevelIncomeReport(accessToken, options)
          break
      }

      if (response.success) {
        setReportData(response)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load report')
      setReportData(null)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatCurrency = (value: string | number) => {
    return parseFloat(String(value)).toFixed(2)
  }

  const tabs = [
    { id: 'overall' as ReportType, label: 'Overall Income', icon: FaChartBar },
    { id: 'direct' as ReportType, label: 'Direct Income', icon: FaUsers },
    { id: 'slot' as ReportType, label: 'Slot Income', icon: FaSearch },
    { id: 'level' as ReportType, label: 'Level Income', icon: FaDollarSign },
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Income Reports</h1>
          <p className="text-slate-400">View detailed income analytics and distribution</p>
        </div>

        {/* Tabs */}
        <div className="bg-slate-800/50 rounded-xl p-2 border border-slate-700 flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setPage(0)
              }}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <tab.icon />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">User ID</label>
              <input
                type="text"
                placeholder="Filter by User ID..."
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value)
                  setPage(0)
                }}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setPage(0)
                }}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setPage(0)
                }}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Page Size</label>
              <select
                value={size}
                onChange={(e) => {
                  setSize(Number(e.target.value))
                  setPage(0)
                }}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Report Table */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-4 text-slate-400">Loading report...</p>
            </div>
          ) : reportData && reportData.data && reportData.data.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900/50 border-b border-slate-700">
                    <tr>
                      {activeTab === 'overall' && (
                        <>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">User ID</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Wallet Address</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Direct Income</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Level Income</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Slot Income</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Total Income</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Transactions</th>
                        </>
                      )}
                      {activeTab === 'direct' && (
                        <>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">User ID</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Wallet Address</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Sponsor ID</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Amount</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Tx Hash</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Date</th>
                        </>
                      )}
                      {activeTab === 'slot' && (
                        <>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">User ID</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Wallet Address</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Slot Level</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Pool Level</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Amount</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Tx Hash</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Date</th>
                        </>
                      )}
                      {activeTab === 'level' && (
                        <>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">User ID</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Wallet Address</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Level</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Amount</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Tx Hash</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Date</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {reportData.data.map((item: any, index: number) => (
                      <tr key={index} className="hover:bg-slate-800/50 transition-colors">
                        {activeTab === 'overall' && (
                          <>
                            <td className="px-6 py-4 text-sm font-medium text-white">{item.userId}</td>
                            <td className="px-6 py-4 text-sm text-slate-300 font-mono">
                              {item.walletAddress?.slice(0, 6)}...{item.walletAddress?.slice(-4)}
                            </td>
                            <td className="px-6 py-4 text-sm text-green-400">${formatCurrency(item.directIncome || 0)}</td>
                            <td className="px-6 py-4 text-sm text-purple-400">${formatCurrency(item.levelIncome || 0)}</td>
                            <td className="px-6 py-4 text-sm text-blue-400">${formatCurrency(item.slotIncome || 0)}</td>
                            <td className="px-6 py-4 text-sm font-semibold text-white">${formatCurrency(item.totalIncome || 0)}</td>
                            <td className="px-6 py-4 text-sm text-slate-400">{item.transactionCount || 0}</td>
                          </>
                        )}
                        {activeTab === 'direct' && (
                          <>
                            <td className="px-6 py-4 text-sm font-medium text-white">{item.userId}</td>
                            <td className="px-6 py-4 text-sm text-slate-300 font-mono">
                              {item.walletAddress?.slice(0, 6)}...{item.walletAddress?.slice(-4)}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-300">{item.sponsorId || '-'}</td>
                            <td className="px-6 py-4 text-sm text-green-400 font-semibold">${formatCurrency(item.amount)}</td>
                            <td className="px-6 py-4 text-sm text-slate-400 font-mono text-xs">
                              {item.txHash?.slice(0, 8)}...{item.txHash?.slice(-6)}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-400">{formatDate(item.createdAt)}</td>
                          </>
                        )}
                        {activeTab === 'slot' && (
                          <>
                            <td className="px-6 py-4 text-sm font-medium text-white">{item.userId}</td>
                            <td className="px-6 py-4 text-sm text-slate-300 font-mono">
                              {item.walletAddress?.slice(0, 6)}...{item.walletAddress?.slice(-4)}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-300">{item.slotLevel || '-'}</td>
                            <td className="px-6 py-4 text-sm text-slate-300">{item.poolLevel || '-'}</td>
                            <td className="px-6 py-4 text-sm text-blue-400 font-semibold">${formatCurrency(item.amount)}</td>
                            <td className="px-6 py-4 text-sm text-slate-400 font-mono text-xs">
                              {item.txHash?.slice(0, 8)}...{item.txHash?.slice(-6)}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-400">{formatDate(item.createdAt)}</td>
                          </>
                        )}
                        {activeTab === 'level' && (
                          <>
                            <td className="px-6 py-4 text-sm font-medium text-white">{item.userId}</td>
                            <td className="px-6 py-4 text-sm text-slate-300 font-mono">
                              {item.walletAddress?.slice(0, 6)}...{item.walletAddress?.slice(-4)}
                            </td>
                            <td className="px-6 py-4 text-sm text-purple-400 font-semibold">
                              {item.level ? `Level ${item.level}` : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-purple-400 font-semibold">${formatCurrency(item.amount)}</td>
                            <td className="px-6 py-4 text-sm text-slate-400 font-mono text-xs">
                              {item.txHash?.slice(0, 8)}...{item.txHash?.slice(-6)}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-400">{formatDate(item.createdAt)}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {reportData.pagination && reportData.pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
                  <p className="text-sm text-slate-400">
                    Showing {page * size + 1} to {Math.min((page + 1) * size, reportData.pagination.totalElements)} of {reportData.pagination.totalElements} records
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
                      Page {page + 1} of {reportData.pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(reportData.pagination.totalPages - 1, p + 1))}
                      disabled={page >= reportData.pagination.totalPages - 1}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center">
              <p className="text-slate-400">No data found for the selected filters</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}


