'use client'

import { useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useAdmin } from '@/contexts/AdminContext'
import { adminApi } from '@/services/api.service'
import toast from 'react-hot-toast'

export default function LevelIncomePage() {
  const { accessToken } = useAdmin()
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [levelData, setLevelData] = useState<any>(null)

  const handleSearch = async () => {
    if (!userId.trim()) {
      toast.error('Please enter a User ID')
      return
    }

    if (!accessToken) return

    try {
      setLoading(true)
      const response = await adminApi.getLevelIncomeEligibleParents(accessToken, userId.trim())
      setLevelData(response)
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch level income data')
      setLevelData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleManualTransfer = async () => {
    if (!accessToken || !levelData) return

    if (!confirm('Are you sure you want to manually transfer level income shares? This action cannot be undone.')) {
      return
    }

    try {
      setTransferring(true)
      const response = await adminApi.manualTransferLevelIncome(accessToken, levelData.retopupUserId)
      toast.success('Manual transfer initiated successfully')
      // Refresh data after transfer
      await handleSearch()
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate manual transfer')
    } finally {
      setTransferring(false)
    }
  }

  const formatCurrency = (value: string) => {
    return parseFloat(value).toFixed(2)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Level Income (Retopup Flow)</h1>
          <p className="text-slate-400">Manage level income distribution based on retopup events</p>
        </div>

        {/* Search Input */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Enter User ID who performed retopup..."
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span>Search</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        {levelData && (
          <div className="space-y-6">
            {/* Retopup Info */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Retopup Information</h2>
                {!levelData.manualShareTransfer && (
                  <button
                    onClick={handleManualTransfer}
                    disabled={transferring}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {transferring ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Transferring...</span>
                      </>
                    ) : (
                      <>
                        <span>💰</span>
                        <span>Manual Transfer</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Retopup User ID</p>
                  <p className="text-white font-semibold">{levelData.retopupUserId}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Retopup Amount</p>
                  <p className="text-white font-semibold">${formatCurrency(levelData.retopupAmount)}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Transfer Mode</p>
                  <p className={`font-semibold ${levelData.manualShareTransfer ? 'text-green-400' : 'text-yellow-400'}`}>
                    {levelData.manualShareTransfer ? 'Automatic' : 'Manual'}
                  </p>
                </div>
              </div>
              {!levelData.manualShareTransfer && (
                <div className="mt-4 p-4 bg-yellow-600/20 border border-yellow-600/50 rounded-lg">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ Manual transfer mode is enabled. You need to manually trigger blockchain transfers for income distribution.
                  </p>
                </div>
              )}
            </div>

            {/* Eligible Parents */}
            {levelData.eligibleParents && levelData.eligibleParents.length > 0 && (
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4">
                  Eligible Parents (Top {levelData.totalLevels || levelData.eligibleParents.length} Levels)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-900/50 border-b border-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Level</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">User ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Wallet Address</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Share %</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Share Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Re-Topup Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {levelData.eligibleParents.map((parent: any, index: number) => (
                        <tr key={index} className="hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-white">{parent.level}</td>
                          <td className="px-4 py-3 text-sm font-medium text-white">{parent.userId}</td>
                          <td className="px-4 py-3 text-sm text-slate-300 font-mono">
                            {parent.walletAddress.slice(0, 6)}...{parent.walletAddress.slice(-4)}
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-400">{parent.sharePercentage.toFixed(2)}%</td>
                          <td className="px-4 py-3 text-sm text-green-400 font-semibold">
                            ${formatCurrency(parent.shareAmount)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              parent.hasReTopup ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                            }`}>
                              {parent.hasReTopup ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="mt-4 p-4 bg-slate-900/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-400">Total Levels:</p>
                    <p className="text-white font-semibold">{levelData.totalLevels || levelData.eligibleParents.length}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-slate-400">Total Distribution:</p>
                    <p className="text-green-400 font-semibold">
                      ${formatCurrency(
                        levelData.eligibleParents.reduce(
                          (sum: number, p: any) => sum + parseFloat(p.shareAmount),
                          0
                        ).toString()
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* No Parents Message */}
            {levelData.eligibleParents && levelData.eligibleParents.length === 0 && (
              <div className="bg-slate-800/50 rounded-xl p-12 border border-slate-700 text-center">
                <p className="text-slate-400">No eligible parents found for this retopup user</p>
              </div>
            )}
          </div>
        )}

        {/* No Results Message */}
        {!loading && !levelData && userId && (
          <div className="bg-slate-800/50 rounded-xl p-12 border border-slate-700 text-center">
            <p className="text-slate-400">No level income data found. Try searching for a different User ID.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

