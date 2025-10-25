'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { FaUser, FaUsers, FaCheckCircle, FaCoins, FaLayerGroup } from 'react-icons/fa'

export default function Dashboard() {
  const { account, contract, tokenContract } = useWeb3()
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<any>(null)
  const [tokenBalance, setTokenBalance] = useState('0')
  const [packageAmount, setPackageAmount] = useState('0')
  const [reTopupAmount, setReTopupAmount] = useState('0')
  const [poolInfo, setPoolInfo] = useState({ queueLength: 0, nodesCount: 0 })

  useEffect(() => {
    if (contract && tokenContract && account) {
      loadDashboardData()
    }
  }, [contract, tokenContract, account])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Get user ID
      const userId = await contract.getUserId(account)
      
      if (userId.toString() === '0') {
        setUserData(null)
        setLoading(false)
        return
      }

      // Get user info
      const userInfo = await contract.userInfo(userId)
      const [wallet, parentId, sponsorCount, exists, hasReTopup] = userInfo

      // Get token balance
      const balance = await tokenContract.balanceOf(account)
      
      // Get package and retopup amounts
      const pkgAmt = await contract.packageAmount()
      const rtAmt = await contract.reTopupAmount()
      
      // Get pool info
      const qLen = await contract.getPoolQueueLength()
      const nCount = await contract.getPoolNodesCount()

      setUserData({
        id: userId.toString(),
        wallet,
        parentId: parentId.toString(),
        sponsorCount: sponsorCount.toString(),
        hasReTopup,
      })
      
      setTokenBalance(ethers.formatUnits(balance, 18))
      setPackageAmount(ethers.formatUnits(pkgAmt, 18))
      setReTopupAmount(ethers.formatUnits(rtAmt, 18))
      setPoolInfo({
        queueLength: Number(qLen),
        nodesCount: Number(nCount),
      })

      setLoading(false)
    } catch (error: any) {
      console.error('Error loading dashboard:', error)
      toast.error('Failed to load dashboard data')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <FaUser className="text-6xl text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Not Registered</h2>
        <p className="text-gray-600 mb-4">
          You haven't registered yet. Go to the Register tab to join the platform.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">User ID</p>
              <p className="text-2xl font-bold text-primary">{userData.id}</p>
            </div>
            <FaUser className="text-4xl text-primary/20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Sponsors</p>
              <p className="text-2xl font-bold text-success">{userData.sponsorCount}</p>
            </div>
            <FaUsers className="text-4xl text-success/20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Token Balance</p>
              <p className="text-2xl font-bold text-warning">{parseFloat(tokenBalance).toFixed(2)}</p>
            </div>
            <FaCoins className="text-4xl text-warning/20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Re-Topup Status</p>
              <p className={`text-2xl font-bold ${userData.hasReTopup ? 'text-success' : 'text-gray-400'}`}>
                {userData.hasReTopup ? 'Active' : 'Inactive'}
              </p>
            </div>
            <FaCheckCircle className={`text-4xl ${userData.hasReTopup ? 'text-success/20' : 'text-gray-200'}`} />
          </div>
        </div>
      </div>

      {/* User Details */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <FaUser className="mr-2" /> User Information
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600 text-sm">Wallet Address</p>
            <p className="font-mono text-sm break-all">{userData.wallet}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Parent ID</p>
            <p className="font-semibold">{userData.parentId === '0' ? 'Company (Root)' : userData.parentId}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Registration Package</p>
            <p className="font-semibold">${packageAmount} tokens</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Re-Topup Amount</p>
            <p className="font-semibold">${reTopupAmount} tokens</p>
          </div>
        </div>
      </div>

      {/* Auto Pool Info */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <FaLayerGroup className="mr-2" /> Auto Pool Information
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600 text-sm">Pool Queue Length</p>
            <p className="text-2xl font-bold text-primary">{poolInfo.queueLength}</p>
            <p className="text-xs text-gray-500 mt-1">Users waiting to be placed</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Total Pool Nodes</p>
            <p className="text-2xl font-bold text-secondary">{poolInfo.nodesCount}</p>
            <p className="text-xs text-gray-500 mt-1">Users in the binary tree</p>
          </div>
        </div>
      </div>

      {/* Re-Topup Eligibility Warning */}
      {!userData.hasReTopup && (
        <div className="bg-yellow-50 border-l-4 border-warning p-6 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-warning" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <strong>Re-Topup Required:</strong> You need to complete re-topup to become eligible for receiving level income from your downline.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={loadDashboardData}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg transition-all"
        >
          Refresh Data
        </button>
      </div>
    </div>
  )
}

