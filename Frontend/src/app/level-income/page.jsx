'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { transactionApi } from '@/services/api.service'
import { FaLayerGroup, FaSpinner, FaChevronLeft, FaChevronRight, FaCalendar } from 'react-icons/fa'
import toast from 'react-hot-toast'

export default function LevelIncomePage() {
  const { user, accessToken } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [totalIncome, setTotalIncome] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const size = 10

  useEffect(() => {
    if (user && accessToken) {
      fetchLevelIncome()
      fetchTotalIncome()
    }
  }, [user, accessToken, page])

  const fetchLevelIncome = async () => {
    try {
      setLoading(true)
      const response = await transactionApi.getTransactions(accessToken, {
        type: 'LEVEL_INCOME',
        page: page,
        size: size
      })

      if (response.content) {
        setTransactions(response.content)
        setTotalPages(response.totalPages || 0)
        setTotalElements(response.totalElements || 0)
      } else if (response.transactions) {
        setTransactions(response.transactions)
      }
    } catch (error) {
      console.error('Error fetching level income:', error)
      toast.error('Failed to load level income transactions')
    } finally {
      setLoading(false)
    }
  }

  const fetchTotalIncome = async () => {
    try {
      const response = await transactionApi.getTransactions(accessToken, {
        type: 'LEVEL_INCOME',
        aggregate: true
      })
      setTotalIncome(response.total || 0)
    } catch (error) {
      console.error('Error fetching total income:', error)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const formatAmount = (amount) => {
    return Number(amount).toFixed(2)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please Login</h2>
          <p className="text-gray-400">You need to login to view your level income</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Level Income
          </h1>
          <p className="text-gray-400">
            Earnings from your downline network across multiple levels
          </p>
        </div>

        {/* Total Income Card */}
        <div className="gradient-card mb-8">
          <div className="gradient-card-inner p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Level Income</p>
                <h2 className="text-3xl font-bold text-white flex items-center">
                  <FaLayerGroup className="text-blue-400 mr-3" />
                  {formatAmount(totalIncome)} TWBNB
                </h2>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm mb-1">Total Transactions</p>
                <p className="text-2xl font-bold text-white">{totalElements}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="gradient-card">
          <div className="gradient-card-inner p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              Transaction History
            </h3>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <FaSpinner className="text-4xl text-purple-500 animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <FaLayerGroup className="text-6xl text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No level income transactions yet</p>
                <p className="text-gray-500 text-sm mt-2">
                  Build your downline network to earn level income
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold">
                          Date
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold">
                          Transaction ID
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold">
                          Amount
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx, index) => (
                        <tr 
                          key={tx.id || index} 
                          className="border-b border-gray-800 hover:bg-purple-500/10 transition-colors"
                        >
                          <td className="py-4 px-4 text-gray-300">
                            <div className="flex items-center">
                              <FaCalendar className="text-gray-500 mr-2" />
                              {formatDate(tx.createdAt)}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-400 font-mono text-sm">
                            {tx.id.substring(0, 8)}...
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-blue-400 font-bold text-lg">
                              +{formatAmount(tx.amount)} TWBNB
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-500/20 text-green-400">
                              Completed
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {transactions.map((tx, index) => (
                    <div 
                      key={tx.id || index}
                      className="bg-black/30 rounded-lg p-4 border border-purple-500/30"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Transaction ID</p>
                          <p className="text-white font-mono text-sm">
                            {tx.id.substring(0, 12)}...
                          </p>
                        </div>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                          Completed
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-gray-400 text-sm">Amount</p>
                        <p className="text-blue-400 font-bold text-lg">
                          +{formatAmount(tx.amount)} TWBNB
                        </p>
                      </div>
                      <div className="flex items-center text-gray-400 text-sm">
                        <FaCalendar className="mr-2" />
                        {formatDate(tx.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-800">
                    <p className="text-gray-400 text-sm">
                      Page {page + 1} of {totalPages} ({totalElements} total)
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                        className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                      >
                        <FaChevronLeft className="mr-2" />
                        Previous
                      </button>
                      <button
                        onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                        disabled={page >= totalPages - 1}
                        className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                      >
                        Next
                        <FaChevronRight className="ml-2" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
