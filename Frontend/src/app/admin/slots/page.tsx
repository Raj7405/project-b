'use client'

import { useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useAdmin } from '@/contexts/AdminContext'
import { adminApi } from '@/services/api.service'
import toast from 'react-hot-toast'
import { FaSearch } from 'react-icons/fa'

export default function SlotsPage() {
  const { accessToken } = useAdmin()
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [slotData, setSlotData] = useState<any>(null)

  const handleSearch = async () => {
    if (!userId.trim()) {
      toast.error('Please enter a User ID')
      return
    }

    if (!accessToken) return

    try {
      setLoading(true)
      const response = await adminApi.getSlotReport(accessToken, userId.trim())
      setSlotData(response)
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch slot report')
      setSlotData(null)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Slot Report</h1>
          <p className="text-slate-400">Analyze user placement in the slot-based MLM tree</p>
        </div>

        {/* Search Input */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Enter User ID..."
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
                  <FaSearch />
                  <span>Search</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        {slotData && (
          <div className="space-y-6">
            {/* User Info */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">User Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-sm mb-1">User ID</p>
                  <p className="text-white font-semibold">{slotData.userId}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Wallet Address</p>
                  <p className="text-white font-mono text-sm">{slotData.walletAddress}</p>
                </div>
              </div>
            </div>

            {/* Current Slot */}
            {slotData.slot && (
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4">Current Slot Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-1">Slot ID</p>
                    <p className="text-white font-semibold">{slotData.slot.slotId}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-1">Slot Number</p>
                    <p className="text-white font-semibold">{slotData.slot.slotNumber || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-1">Slot Level</p>
                    <p className="text-white font-semibold">{slotData.slot.slotLevel}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-1">Pool Level</p>
                    <p className="text-white font-semibold">{slotData.slot.poolLevel}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-1">Position</p>
                    <p className="text-white font-semibold">{slotData.slot.position}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-1">Status</p>
                    <p className={`font-semibold ${slotData.slot.isComplete ? 'text-green-400' : 'text-yellow-400'}`}>
                      {slotData.slot.isComplete ? 'Complete' : 'Incomplete'}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-1">Created At</p>
                    <p className="text-white text-sm">{formatDate(slotData.slot.createdAt)}</p>
                  </div>
                  {slotData.slot.completedAt && (
                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <p className="text-slate-400 text-sm mb-1">Completed At</p>
                      <p className="text-white text-sm">{formatDate(slotData.slot.completedAt)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Parent Slot */}
            {slotData.parentSlot && (
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4">Parent Slot</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Slot ID</p>
                    <p className="text-white font-semibold">{slotData.parentSlot.slotId}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm mb-1">User ID</p>
                    <p className="text-white font-semibold">{slotData.parentSlot.userId}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Wallet Address</p>
                    <p className="text-white font-mono text-sm">{slotData.parentSlot.walletAddress}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Level</p>
                    <p className="text-white font-semibold">{slotData.parentSlot.level}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Children Slots */}
            {slotData.children && slotData.children.length > 0 && (
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4">
                  Children Slots ({slotData.childrenCount || slotData.children.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-900/50 border-b border-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Slot ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">User ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Wallet Address</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Level</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Position</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {slotData.children.map((child: any, index: number) => (
                        <tr key={child.slotId} className="hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-slate-300">{child.slotId}</td>
                          <td className="px-4 py-3 text-sm font-medium text-white">{child.userId}</td>
                          <td className="px-4 py-3 text-sm text-slate-300 font-mono">
                            {child.walletAddress.slice(0, 6)}...{child.walletAddress.slice(-4)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">{child.level}</td>
                          <td className="px-4 py-3 text-sm text-slate-300">{child.position}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              child.isComplete ? 'bg-green-600/20 text-green-400' : 'bg-yellow-600/20 text-yellow-400'
                            }`}>
                              {child.isComplete ? 'Complete' : 'Incomplete'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* No Children Message */}
            {slotData.children && slotData.children.length === 0 && (
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 text-center">
                <p className="text-slate-400">No children slots found</p>
              </div>
            )}
          </div>
        )}

        {/* No Results Message */}
        {!loading && !slotData && userId && (
          <div className="bg-slate-800/50 rounded-xl p-12 border border-slate-700 text-center">
            <p className="text-slate-400">No slot data found. Try searching for a different User ID.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

