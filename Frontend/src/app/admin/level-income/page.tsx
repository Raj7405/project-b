'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useAdmin } from '@/contexts/AdminContext'
import { adminApi } from '@/services/api.service'
import toast from 'react-hot-toast'
import { FaSearch, FaDollarSign, FaExclamationTriangle, FaCheckCircle, FaSpinner } from 'react-icons/fa'

export default function LevelIncomePage() {
  const { accessToken } = useAdmin()
  const [pendingRetopups, setPendingRetopups] = useState<any[]>([])
  const [loadingPending, setLoadingPending] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState<string | null>(null) // Track which payment is executing
  const [levelData, setLevelData] = useState<any>(null)

  // Load pending retopups on mount
  useEffect(() => {
    if (accessToken) {
      loadPendingRetopups()
    }
  }, [accessToken])

  const loadPendingRetopups = async () => {
    if (!accessToken) return

    try {
      setLoadingPending(true)
      const response = await adminApi.getPendingRetopups(accessToken)
      if (response.success) {
        setPendingRetopups(response.data || [])
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load pending retopups')
      setPendingRetopups([])
    } finally {
      setLoadingPending(false)
    }
  }

  const handleSelectRetopup = async (userId: string) => {
    if (!accessToken) return

    setSelectedUserId(userId)
    setLevelData(null)

    try {
      setLoading(true)
      const response = await adminApi.getLevelIncomeEligibleParents(accessToken, userId)
      setLevelData(response)
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch eligible parents')
      setLevelData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteSingle = async (parentUserId: string, level: number) => {
    if (!accessToken || !selectedUserId) return

    const paymentKey = `${selectedUserId}-${parentUserId}-${level}`
    setExecuting(paymentKey)

    try {
      await adminApi.executeSinglePayment(accessToken, selectedUserId, parentUserId, level)
      toast.success(`Payment executed successfully for Level ${level}`)
      // Refresh eligible parents data
      await handleSelectRetopup(selectedUserId)
      // Refresh pending retopups list
      await loadPendingRetopups()
    } catch (error: any) {
      toast.error(error.message || 'Failed to execute payment')
    } finally {
      setExecuting(null)
    }
  }

  const handleExecuteBatch = async () => {
    if (!accessToken || !selectedUserId) return

    if (!confirm('Are you sure you want to execute batch payment for all eligible parents? This action cannot be undone.')) {
      return
    }

    setExecuting('batch')

    try {
      await adminApi.executeBatchPayment(accessToken, selectedUserId)
      toast.success('Batch payment executed successfully for all eligible parents')
      // Refresh eligible parents data
      await handleSelectRetopup(selectedUserId)
      // Refresh pending retopups list
      await loadPendingRetopups()
    } catch (error: any) {
      toast.error(error.message || 'Failed to execute batch payment')
    } finally {
      setExecuting(null)
    }
  }

  const formatCurrency = (value: string) => {
    return parseFloat(value).toFixed(2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Level Income (Retopup Flow)</h1>
          <p className="text-slate-400">Manage level income distribution based on retopup events</p>
        </div>

        {/* Pending Retopups Section */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Pending Retopups</h2>
            <button
              onClick={loadPendingRetopups}
              disabled={loadingPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loadingPending ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <FaSearch />
                  <span>Refresh</span>
                </>
              )}
            </button>
          </div>

          {loadingPending ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-4 text-slate-400">Loading pending retopups...</p>
            </div>
          ) : pendingRetopups.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-400">No pending retopups found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">User ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Wallet Address</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Retopup Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {pendingRetopups.map((retopup: any) => (
                    <tr
                      key={retopup.userId}
                      className={`hover:bg-slate-800/50 transition-colors ${
                        selectedUserId === retopup.userId ? 'bg-blue-600/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-white">{retopup.userId}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono">
                        {retopup.walletAddress?.slice(0, 6)}...{retopup.walletAddress?.slice(-4)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {retopup.createdAt ? formatDate(retopup.createdAt) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleSelectRetopup(retopup.userId)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-all flex items-center gap-2"
                        >
                          <FaSearch />
                          <span>View Eligible Parents</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Eligible Parents Section */}
        {selectedUserId && (
          <div className="space-y-6">
            {/* Retopup Info */}
            {levelData && (
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Eligible Parents for {selectedUserId}</h2>
                  {!levelData.manualShareTransfer && levelData.eligibleParents && levelData.eligibleParents.length > 0 && (
                    <button
                      onClick={handleExecuteBatch}
                      disabled={executing === 'batch'}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {executing === 'batch' ? (
                        <>
                          <FaSpinner className="animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <FaCheckCircle />
                          <span>Execute Batch Payment</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                  <div className="p-4 bg-yellow-600/20 border border-yellow-600/50 rounded-lg flex items-start gap-2">
                    <FaExclamationTriangle className="text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-yellow-400 text-sm">
                      Manual transfer mode is enabled. Execute payments individually or use batch payment to pay all eligible parents at once.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="bg-slate-800/50 rounded-xl p-12 border border-slate-700 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                <p className="mt-4 text-slate-400">Loading eligible parents...</p>
              </div>
            )}

            {/* Eligible Parents Table */}
            {levelData && levelData.eligibleParents && levelData.eligibleParents.length > 0 && (
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4">
                  Eligible Parents (Top {levelData.totalLevels || levelData.eligibleParents.length} Levels)
                </h3>
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
                        {!levelData.manualShareTransfer && (
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {levelData.eligibleParents.map((parent: any, index: number) => {
                        const paymentKey = `${selectedUserId}-${parent.userId}-${parent.level}`
                        const isExecuting = executing === paymentKey
                        return (
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
                            {!levelData.manualShareTransfer && (
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handleExecuteSingle(parent.userId, parent.level)}
                                  disabled={isExecuting || executing !== null}
                                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                  {isExecuting ? (
                                    <>
                                      <FaSpinner className="animate-spin" />
                                      <span>Processing...</span>
                                    </>
                                  ) : (
                                    <>
                                      <FaDollarSign />
                                      <span>Pay</span>
                                    </>
                                  )}
                                </button>
                              </td>
                            )}
                          </tr>
                        )
                      })}
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
            {levelData && levelData.eligibleParents && levelData.eligibleParents.length === 0 && (
              <div className="bg-slate-800/50 rounded-xl p-12 border border-slate-700 text-center">
                <p className="text-slate-400">No eligible parents found for this retopup user</p>
              </div>
            )}
          </div>
        )}

        {/* No Selection Message */}
        {!selectedUserId && !loadingPending && pendingRetopups.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-12 border border-slate-700 text-center">
            <p className="text-slate-400">Select a pending retopup above to view eligible parents and execute payments</p>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
