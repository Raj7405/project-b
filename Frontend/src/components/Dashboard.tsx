'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { FaUser, FaUsers, FaCheckCircle, FaCoins, FaLayerGroup } from 'react-icons/fa'
import BinaryTree from './BinaryTree'
import BinaryTreeLive from './BinaryTreeLive'

export default function Dashboard() {
  const { account, contract, tokenContract } = useWeb3()
  const [loading, setLoading] = useState(false)
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
      
      if (!contract || !account) {
        setLoading(false)
        return
      }
      
      // Check if contract is deployed at this address
      const contractCode = await contract.runner?.provider?.getCode(await contract.getAddress())
      if (!contractCode || contractCode === '0x') {
        toast.error('Contract not deployed at this address. Please deploy contracts and update .env.local')
        setLoading(false)
        return
      }
      
      // Get user info - if user is not registered, this will return default values
      let userInfo
      try {
        userInfo = await contract.getUserInfo(account)
      } catch (error: any) {
        // If contract doesn't exist or call fails, handle gracefully
        if (error.message?.includes('could not decode') || error.message?.includes('BAD_DATA')) {
          toast.error('Contract not found at this address. Please check .env.local and redeploy contracts.')
          setLoading(false)
          return
        }
        throw error
      }
      
      if (!userInfo.isActive) {
        setUserData(null)
        setLoading(false)
        return
      }

      // Get token balance and decimals
      const balance = await tokenContract.balanceOf(account)
      const tokenDecimals = await tokenContract.decimals()
      
      // Get package and retopup amounts (using lowercase function names for immutable variables)
      const entryPrice = await contract.entryPrice()
      const retopupPrice = await contract.retopupPrice()

      // Get total earnings
      const totalEarnings = await contract.getTotalEarnings(account)

      setUserData({
        id: userInfo.id.toString(),
        wallet: account,
        referrer: userInfo.referrer,
        referralCount: userInfo.referralCount.toString(),
        directIncome: ethers.formatUnits(userInfo.directIncomeAmount, tokenDecimals),
        poolIncome: ethers.formatUnits(userInfo.poolIncomeAmount, tokenDecimals),
        levelIncome: ethers.formatUnits(userInfo.levelIncomeAmount, tokenDecimals),
        totalEarnings: ethers.formatUnits(totalEarnings, tokenDecimals),
        retopupCount: userInfo.retopupCount.toString(),
        hasReTopup: userInfo.retopupCount > 0,
      })
      
      setTokenBalance(ethers.formatUnits(balance, tokenDecimals))
      setPackageAmount(ethers.formatUnits(entryPrice, tokenDecimals))
      setReTopupAmount(ethers.formatUnits(retopupPrice, tokenDecimals))
      
      // Pool info - we'll need to implement if needed, or remove this
      setPoolInfo({
        queueLength: 0, // Not available in current contract
        nodesCount: 0,  // Not available in current contract
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
              <p className="text-gray-600 text-sm">Direct Referrals</p>
              <p className="text-2xl font-bold text-success">{userData.referralCount}</p>
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
      <div className="gradient-card overflow-hidden h-full">
        <div className="bg-secondary rounded-lg shadow-lg p-6 gradient-card-inner h-full">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <FaUser className="mr-2" /> User Information
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600 text-sm">Wallet Address</p>
              <p className="font-mono text-sm break-all">{userData.wallet}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Referrer Address</p>
              <p className="font-mono text-sm break-all">{userData.referrer || 'Company (Root)'}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Direct Income</p>
              <p className="font-semibold">${parseFloat(userData.directIncome).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Pool Income</p>
              <p className="font-semibold">${parseFloat(userData.poolIncome).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Level Income</p>
              <p className="font-semibold">${parseFloat(userData.levelIncome).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total Earnings</p>
              <p className="font-semibold text-success">${parseFloat(userData.totalEarnings).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Re-Topup Count</p>
              <p className="font-semibold">{userData.retopupCount}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Re-Topup Amount</p>
              <p className="font-semibold">${reTopupAmount} tokens</p>
            </div>
          </div>
        </div>
      </div>

      {/* Income Breakdown */}
      <div className="gradient-card overflow-hidden h-full">
        <div className="bg-secondary rounded-lg shadow-lg p-6 gradient-card-inner h-full">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <FaCoins className="mr-2" /> Income Breakdown
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-gray-600 text-sm">Direct Income</p>
              <p className="text-2xl font-bold text-blue-600">${parseFloat(userData.directIncome).toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">From direct referrals</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <p className="text-gray-600 text-sm">Pool Income</p>
              <p className="text-2xl font-bold text-green-600">${parseFloat(userData.poolIncome).toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">From auto pool</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <p className="text-gray-600 text-sm">Level Income</p>
              <p className="text-2xl font-bold text-purple-600">${parseFloat(userData.levelIncome).toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">From retopups</p>
            </div>
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

      {/* Binary Tree Visualization */}
      <BinaryTree height="700px" />

      <BinaryTreeLive/>

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

