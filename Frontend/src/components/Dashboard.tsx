'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useWeb3 } from '@/contexts/Web3Context'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { FaUser, FaUsers, FaCheckCircle, FaCoins, FaLayerGroup } from 'react-icons/fa'
import BinaryTree from './BinaryTree'
import BinaryTreeLive from './BinaryTreeLive'
import { authApi, transactionApi } from '@/services/api.service'
import { useAuth } from '@/contexts/AuthContext'

export default function Dashboard() {
  const { account, tokenContract } = useWeb3()
  const [loading, setLoading] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [tokenBalance, setTokenBalance] = useState('0')
  const [packageAmount, setPackageAmount] = useState('20')
  const [reTopupAmount, setReTopupAmount] = useState('40')
  const [retopupCount, setRetopupCount] = useState(0)
  const { user, loginByWallet } = useAuth()

  useEffect(() => {
    if (tokenContract && account) {
      loadDashboardData()
    }
  }, [tokenContract, account])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      if (!account) {
        setLoading(false)
        return
      }
      
      // Use user data from AuthContext if available and matches current account
      let currentUser = user

      // If no user in store or wallet changed, fetch from backend via AuthContext
      if (
        !currentUser ||
        !currentUser.walletAddress ||
        currentUser.walletAddress.toLowerCase() !== account.toLowerCase()
      ) {
        try {
          const result = await loginByWallet(account)
          currentUser = result?.user
        } catch (error: any) {
          // User not found in backend - not registered
          if (error.message?.includes('Failed to fetch user')) {
            setUserData(null)
            setLoading(false)
            return
          }
          throw error
        }
      }

      if (!currentUser || !currentUser.id) {
        setUserData(null)
        setLoading(false)
        return
      }

      // Get token balance from blockchain (real-time)
      let balance = '0'
      let tokenDecimals = 18
      if (tokenContract) {
        try {
          const bal = await tokenContract.balanceOf(account)
          tokenDecimals = await tokenContract.decimals()
          balance = ethers.formatUnits(bal, tokenDecimals)
        } catch (error) {
          console.error('Error fetching token balance:', error)
        }
      }

      // Count retopup transactions (Note: transactionApi not mounted yet, so this will fail gracefully)
      let retopupTransactions = 0
      // try {
      //   const transactions = await transactionApi.getUserTransactionsByType(user.id, 'RETOPUP')
      //   retopupTransactions = transactions.length
      // } catch (error) {
      //   console.error('Error fetching retopup count (transactionApi not mounted):', error)
      //   // Fall back to hasReTopup flag - if true, assume 1 retopup
      //   retopupTransactions = user.hasReTopup ? 1 : 0
      // }

      // Calculate total earnings from backend data
      const totalEarnings = (
        parseFloat(currentUser.totalDirectIncome || '0') +
        parseFloat(currentUser.totalLevelIncome || '0') +
        parseFloat(currentUser.totalAutoPoolIncome || '0')
      ).toFixed(2)

      // Get parent user info for referrer display
      let referrerAddress = 'Company (Root)'
      if (currentUser.parentId) {
        try {
          const parentResponse = await authApi.getUserById(currentUser.parentId)
          // API returns { user, accessToken, refreshToken, ... }
          const parentUser = parentResponse.user || parentResponse
          referrerAddress = parentUser?.walletAddress || 'Company (Root)'
        } catch (error) {
          console.error('Error fetching parent user:', error)
        }
      }

      // Store normalized user data for this dashboard
      setUserData({
        id: currentUser.id || '',
        wallet: currentUser.walletAddress || account,
        referrer: referrerAddress,
        referralCount: (currentUser.sponsorCount ?? 0).toString(),
        directIncome: parseFloat(currentUser.totalDirectIncome || '0').toFixed(2),
        poolIncome: parseFloat(currentUser.totalAutoPoolIncome || '0').toFixed(2),
        levelIncome: parseFloat(currentUser.totalLevelIncome || '0').toFixed(2),
        totalEarnings: totalEarnings,
        retopupCount: retopupTransactions,
        hasReTopup: currentUser.hasReTopup || false,
      })
      
      setTokenBalance(balance)
      setRetopupCount(retopupTransactions)

      setLoading(false)
    } catch (error: any) {
      console.error('Error loading dashboard:', error)
      toast.error('Failed to load dashboard data. Please make sure backend server is running.')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-20">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500/20"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-blue-500 border-r-purple-500 absolute top-0 left-0"></div>
        </div>
        <p className="text-white mt-6 text-lg font-semibold animate-pulse">Loading Dashboard...</p>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="gradient-card">
        <div className="gradient-card-inner p-12 text-center">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-6 rounded-full inline-block mb-6 shadow-lg shadow-blue-500/50">
            <FaUser className="text-6xl text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Not Registered</h2>
          <p className="text-gray-300 mb-6 text-lg">
            You haven't registered yet. Go to the Register tab to join the platform.
          </p>
          <div className="h-1 w-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* User ID Card - Blue Gradient */}
        <div className="gradient-card group hover:scale-105 transition-all duration-300">
          <div className="gradient-card-inner h-full bg-gradient-to-br from-blue-500/10 to-blue-600/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm mb-1">User ID</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">{userData.id}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-4 rounded-xl shadow-lg group-hover:shadow-blue-500/50 transition-all">
                <FaUser className="text-3xl text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Direct Referrals Card - Green Gradient */}
        <div className="gradient-card group hover:scale-105 transition-all duration-300">
          <div className="gradient-card-inner h-full bg-gradient-to-br from-green-500/10 to-green-600/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm mb-1">Direct Referrals</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">{userData.referralCount}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-700 p-4 rounded-xl shadow-lg group-hover:shadow-green-500/50 transition-all">
                <FaUsers className="text-3xl text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Token Balance Card - Gold Gradient */}
        <div className="gradient-card group hover:scale-105 transition-all duration-300">
          <div className="gradient-card-inner h-full bg-gradient-to-br from-yellow-500/10 to-yellow-600/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm mb-1">Token Balance</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">{parseFloat(tokenBalance).toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-700 p-4 rounded-xl shadow-lg group-hover:shadow-yellow-500/50 transition-all">
                <FaCoins className="text-3xl text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Re-Topup Status Card - Purple/Gray Gradient */}
        <div className="gradient-card group hover:scale-105 transition-all duration-300">
          <div className={`gradient-card-inner h-full ${userData.hasReTopup ? 'bg-gradient-to-br from-purple-500/10 to-purple-600/5' : 'bg-gradient-to-br from-gray-500/10 to-gray-600/5'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm mb-1">Re-Topup Status</p>
                <p className={`text-3xl font-bold ${userData.hasReTopup ? 'bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent' : 'text-gray-400'}`}>
                  {userData.hasReTopup ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className={`${userData.hasReTopup ? 'bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg group-hover:shadow-purple-500/50' : 'bg-gradient-to-br from-gray-500 to-gray-700'} p-4 rounded-xl transition-all`}>
                <FaCheckCircle className="text-3xl text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Details */}
      <div className="gradient-card overflow-hidden h-full">
        <div className="gradient-card-inner h-full p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center text-white">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-3 rounded-lg mr-3 shadow-lg">
              <FaUser className="text-xl text-white" />
            </div>
            User Information
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 p-4 rounded-lg border border-slate-700/50 hover:border-blue-500/50 transition-all">
              <p className="text-gray-400 text-sm mb-2">Wallet Address</p>
              <p className="font-mono text-sm break-all text-blue-300">{userData.wallet}</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 p-4 rounded-lg border border-slate-700/50 hover:border-blue-500/50 transition-all">
              <p className="text-gray-400 text-sm mb-2">Referrer Address</p>
              <p className="font-mono text-sm break-all text-blue-300">{userData.referrer || 'Company (Root)'}</p>
            </div> */}
            <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 p-4 rounded-lg border border-blue-700/30 hover:border-blue-500/50 transition-all">
              <p className="text-gray-400 text-sm mb-2">Direct Income</p>
              <p className="text-xl font-bold text-blue-400">${parseFloat(userData.directIncome).toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 p-4 rounded-lg border border-green-700/30 hover:border-green-500/50 transition-all">
              <p className="text-gray-400 text-sm mb-2">Pool Income</p>
              <p className="text-xl font-bold text-green-400">${parseFloat(userData.poolIncome).toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 p-4 rounded-lg border border-purple-700/30 hover:border-purple-500/50 transition-all">
              <p className="text-gray-400 text-sm mb-2">Level Income</p>
              <p className="text-xl font-bold text-purple-400">${parseFloat(userData.levelIncome).toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 p-4 rounded-lg border border-yellow-700/30 hover:border-yellow-500/50 transition-all">
              <p className="text-gray-400 text-sm mb-2">Total Earnings</p>
              <p className="text-xl font-bold text-yellow-400">${parseFloat(userData.totalEarnings).toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 p-4 rounded-lg border border-slate-700/50 hover:border-purple-500/50 transition-all">
              <p className="text-gray-400 text-sm mb-2">Re-Topup Count</p>
              <p className="text-xl font-bold text-purple-300">{userData.retopupCount}</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 p-4 rounded-lg border border-slate-700/50 hover:border-purple-500/50 transition-all">
              <p className="text-gray-400 text-sm mb-2">Re-Topup Amount</p>
              <p className="text-xl font-bold text-purple-300">${reTopupAmount} tokens</p>
            </div>
          </div>
        </div>
      </div>

      {/* Income Breakdown */}
      <div className="gradient-card overflow-hidden h-full">
        <div className="gradient-card-inner h-full p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center text-white">
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-700 p-3 rounded-lg mr-3 shadow-lg">
              <FaCoins className="text-xl text-white" />
            </div>
            Income Breakdown
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Direct Income Card */}
            <Link href="/direct-income" className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 p-6 shadow-lg hover:shadow-blue-500/50 transition-all group cursor-pointer hover:scale-105">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-blue-400/20 blur-2xl"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-blue-200 text-sm font-medium">Direct Income</p>
                  <div className="bg-blue-500/30 p-2 rounded-lg">
                    <FaUsers className="text-white text-lg" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-white mb-2">${parseFloat(userData.directIncome).toFixed(2)}</p>
                <p className="text-xs text-blue-200">From direct referrals</p>
                <div className="mt-4 h-1 bg-blue-400/30 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-300 to-white w-full transform origin-left group-hover:scale-x-110 transition-transform"></div>
                </div>
              </div>
            </Link>

            {/* Pool Income Card */}
            <Link href="/pool-income" className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-600 to-green-800 p-6 shadow-lg hover:shadow-green-500/50 transition-all group cursor-pointer hover:scale-105">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-green-400/20 blur-2xl"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-green-200 text-sm font-medium">Pool Income</p>
                  <div className="bg-green-500/30 p-2 rounded-lg">
                    <FaLayerGroup className="text-white text-lg" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-white mb-2">${parseFloat(userData.poolIncome).toFixed(2)}</p>
                <p className="text-xs text-green-200">From auto pool</p>
                <div className="mt-4 h-1 bg-green-400/30 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-300 to-white w-full transform origin-left group-hover:scale-x-110 transition-transform"></div>
                </div>
              </div>
            </Link>

            {/* Level Income Card */}
            <Link href="/level-income" className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 p-6 shadow-lg hover:shadow-purple-500/50 transition-all group cursor-pointer hover:scale-105">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-purple-400/20 blur-2xl"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-purple-200 text-sm font-medium">Level Income</p>
                  <div className="bg-purple-500/30 p-2 rounded-lg">
                    <FaCheckCircle className="text-white text-lg" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-white mb-2">${parseFloat(userData.levelIncome).toFixed(2)}</p>
                <p className="text-xs text-purple-200">From retopups</p>
                <div className="mt-4 h-1 bg-purple-400/30 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-300 to-white w-full transform origin-left group-hover:scale-x-110 transition-transform"></div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Re-Topup Eligibility Warning */}
      {!userData.hasReTopup && (
        <div className="gradient-card overflow-hidden">
          <div className="gradient-card-inner bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-l-4 border-yellow-500 p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-yellow-500/20 p-3 rounded-full">
                <svg className="h-6 w-6 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-bold text-yellow-300 mb-1">⚠️ Re-Topup Required</h3>
                <p className="text-sm text-yellow-100/90">
                  You need to complete re-topup to become eligible for receiving level income from your downline.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <BinaryTreeLive/>

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={loadDashboardData}
          className="bg-blue-gradient-primary hover:scale-105 text-white px-8 py-3 rounded-lg transition-all font-semibold text-lg shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-2 mx-auto group"
        >
          <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Data
        </button>
      </div>
    </div>
  )
}

