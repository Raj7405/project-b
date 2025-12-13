'use client'

import { useState, useEffect, useRef } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { FaArrowUp, FaSpinner, FaCheckCircle, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa'
import { authApi } from '@/services/api.service'

export default function ReTopup() {
  const { account, contract, tokenContract } = useWeb3()
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [hasReTopup, setHasReTopup] = useState(false)
  const [reTopupAmount, setReTopupAmount] = useState('40')
  const [checking, setChecking] = useState(true)

  // Ref to prevent multiple simultaneous calls
  const checkingRef = useRef(false)
  const lastCheckedAccount = useRef<string | null>(null)

  useEffect(() => {
    if (account && !checkingRef.current && lastCheckedAccount.current !== account.toLowerCase()) {
      checkRegistration()
    }
  }, [account])

  const checkRegistration = async () => {
    // Prevent multiple simultaneous calls
    if (checkingRef.current) {
      return
    }

    try {
      checkingRef.current = true
      setChecking(true)
      
      if (!account) {
        console.log(' checkRegistration No account found')
        setIsRegistered(false)
        setChecking(false)
        checkingRef.current = false
        return
      }

      const accountKey = account.toLowerCase()
      lastCheckedAccount.current = accountKey

      // Fetch user data from backend API
      let user
      try {
        const response = await authApi.getUserByWallet(account)
        // API returns { user, accessToken, refreshToken, ... }
        user = response.user || response
      } catch (error: any) {
        // User not found in backend - not registered
        if (error.message.includes('Failed to fetch user')) {
          console.log('checkRegistration User not found in backend')
          setIsRegistered(false)
          setChecking(false)
          checkingRef.current = false
          return
        }
        throw error
      }

      if (!user || !user.id) {
        console.log('checkRegistrationUser not found in backend')
        setIsRegistered(false)
        setChecking(false)
        checkingRef.current = false
        return
      }

      // Check if payment is completed (required for retopup)
      if (user.paymentStatus !== 'COMPLETED') {
        console.log('checkRegistration Payment not completed')
        setIsRegistered(false)
        setChecking(false)
        checkingRef.current = false
        return
      }

      console.log('checkRegistration User found in backend')
      setIsRegistered(true)
      setHasReTopup(user.hasReTopup || false)

      // Get retopup price from contract if available, otherwise use default
      if (contract && tokenContract) {
        try {
          const rtAmount = await contract.retopupPrice()
          const tokenDecimals = await tokenContract.decimals()
          setReTopupAmount(ethers.formatUnits(rtAmount, tokenDecimals))
        } catch (error) {
          console.error('checkRegistration Error fetching retopup price:', error)
          // Keep default value
        }
      }

      setChecking(false)
      checkingRef.current = false
    } catch (error) {
      console.error('checkRegistration Error checking registration:', error)
      setIsRegistered(false)
      setChecking(false)
      checkingRef.current = false
    }
  }

  const handleApprove = async () => {
    if (!tokenContract || !contract) {
      toast.error('Contract not initialized')
      return
    }

    try {
      setApproving(true)
      const amount = await contract.retopupPrice()
      
      toast.loading('Approving tokens...')
      const tx = await tokenContract.approve(await contract.getAddress(), amount)
      await tx.wait()
      
      toast.dismiss()
      toast.success('Tokens approved! Now you can re-topup.')
      setApproving(false)
    } catch (error: any) {
      console.error('Approval error:', error)
      toast.dismiss()
      toast.error(error.reason || error.message || 'Failed to approve tokens')
      setApproving(false)
    }
  }

  const handleReTopup = async () => {
    if (!account) {
      toast.error('Please connect your wallet')
      return
    }

    if (!contract || !tokenContract) {
      toast.error('Contract not initialized')
      return
    }

    try {
      setLoading(true)

      // Check allowance first
      const amount = await contract.retopupPrice()
      const allowance = await tokenContract.allowance(account, await contract.getAddress())
      
      if (allowance < amount) {
        toast.error('Please approve tokens first')
        setLoading(false)
        return
      }

      // Call backend API for retopup (backend handles the contract call)
      toast.loading('Processing re-topup...')
      const result = await authApi.retopupUser(account)
      
      toast.dismiss()
      toast.success(`Re-topup successful! 🎉 Transaction: ${result.txHash.substring(0, 10)}...`)
      setLoading(false)
      
      // Reload data
      await checkRegistration()
    } catch (error: any) {
      console.error('Re-topup error:', error)
      toast.dismiss()
      const errorMessage = error.message || error.reason || 'Re-topup failed'
      toast.error(errorMessage)
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="gradient-card">
          <div className="gradient-card-inner p-12 text-center">
            <div className="relative mx-auto mb-6 w-16 h-16">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500/20"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-purple-500 border-r-purple-600 absolute top-0 left-0"></div>
            </div>
            <p className="text-white text-lg font-semibold animate-pulse">Checking registration status...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isRegistered) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="gradient-card">
          <div className="gradient-card-inner p-12 text-center">
            <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-6 rounded-full inline-block mb-6 shadow-lg shadow-yellow-500/50">
              <FaExclamationTriangle className="text-6xl text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Registration Required</h2>
            <p className="text-gray-300 mb-6 text-lg">
              You need to register and complete payment first before you can re-topup. Please go to the Register tab.
            </p>
            <div className="h-1 w-32 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="gradient-card">
        <div className="gradient-card-inner p-6">
          <div className="flex items-center">
            <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-4 rounded-xl shadow-lg mr-4">
              <FaArrowUp className="text-3xl text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Re-Topup Account</h2>
              <p className="text-gray-300 text-sm mt-1">Complete re-topup to unlock level income eligibility</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Card */}
      {hasReTopup ? (
        <div className="gradient-card overflow-hidden">
          <div className="gradient-card-inner bg-gradient-to-r from-green-900/30 to-green-800/20 border-l-4 border-green-500 p-6">
            <div className="flex items-start">
              <div className="bg-green-500/20 p-3 rounded-full mr-4">
                <FaCheckCircle className="text-3xl text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-300 mb-2">✅ Re-Topup Active</h3>
                <p className="text-green-200">
                  You have already completed re-topup. You are eligible to receive level income from your downline!
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="gradient-card overflow-hidden">
          <div className="gradient-card-inner bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-l-4 border-yellow-500 p-6">
            <div className="flex items-start">
              <div className="bg-yellow-500/20 p-3 rounded-full mr-4">
                <FaExclamationTriangle className="text-3xl text-yellow-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-yellow-300 mb-2">⚠️ Re-Topup Required</h3>
                <p className="text-yellow-200">
                  Complete re-topup to become eligible for receiving level income from your downline.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Cards Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Re-Topup Details Card */}
        <div className="gradient-card">
          <div className="gradient-card-inner p-6">
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-3 rounded-lg mr-3 shadow-lg">
                <FaInfoCircle className="text-xl text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Re-Topup Details</h3>
            </div>
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 p-3 rounded-lg border border-blue-700/30">
                <p className="text-blue-300 text-sm mb-1">Amount Required</p>
                <p className="text-2xl font-bold text-blue-400">${reTopupAmount} tokens</p>
              </div>
              <ul className="text-sm text-gray-300 space-y-2">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                  Distribution: $36 across 10 levels (90%)
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                  Company fee: $4 (10%)
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                  Only eligible ancestors receive income
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Important Note Card */}
        <div className="gradient-card">
          <div className="gradient-card-inner p-6">
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-3 rounded-lg mr-3 shadow-lg">
                <FaExclamationTriangle className="text-xl text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Important Note</h3>
            </div>
            <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 p-4 rounded-lg border border-purple-700/30">
              <p className="text-purple-200 text-sm leading-relaxed">
                To receive re-topup income from your downline, you must complete your own re-topup first. 
                If you haven't re-topped up, your share will go to the company wallet.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Card */}
      {!hasReTopup && (
        <div className="gradient-card">
          <div className="gradient-card-inner p-6">
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={handleApprove}
                disabled={approving || loading || hasReTopup}
                className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-blue-500/50 transition-all flex items-center justify-center disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
              >
                {approving ? (
                  <>
                    <FaSpinner className="animate-spin mr-3 text-xl" />
                    <span>Approving...</span>
                  </>
                ) : (
                  <>
                    <span className="mr-2">1.</span>
                    <span>Approve Tokens</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  </>
                )}
              </button>

              <button
                onClick={handleReTopup}
                disabled={loading || approving || hasReTopup}
                className="group relative overflow-hidden bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-purple-500/50 transition-all flex items-center justify-center disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin mr-3 text-xl" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span className="mr-2">2.</span>
                    <span>Re-Topup</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  </>
                )}
              </button>
            </div>
            <p className="text-gray-400 text-sm mt-4 text-center">
              Step 1: Approve tokens • Step 2: Complete re-topup
            </p>
          </div>
        </div>
      )}

      {/* Level Distribution Table Card */}
      <div className="gradient-card">
        <div className="gradient-card-inner p-6">
          <div className="flex items-center mb-6">
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-700 p-3 rounded-lg mr-3 shadow-lg">
              <FaInfoCircle className="text-xl text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white">Level Income Distribution</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-800/50 to-slate-900/30 border-b border-slate-700/50">
                  <th className="px-6 py-4 text-left text-white font-semibold">Level</th>
                  <th className="px-6 py-4 text-left text-white font-semibold">Percentage</th>
                  <th className="px-6 py-4 text-left text-white font-semibold">Amount ($)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { level: 1, percent: 30, amount: 10.80, color: 'from-blue-600 to-blue-800' },
                  { level: 2, percent: 15, amount: 5.40, color: 'from-green-600 to-green-800' },
                  { level: 3, percent: 10, amount: 3.60, color: 'from-purple-600 to-purple-800' },
                  { level: '4-8', percent: '5 each', amount: '1.80 each', color: 'from-yellow-600 to-yellow-800' },
                  { level: '9-10', percent: '10 each', amount: '3.60 each', color: 'from-orange-600 to-orange-800' },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className={`inline-block bg-gradient-to-r ${row.color} px-3 py-1 rounded-lg text-white font-semibold`}>
                        Level {row.level}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-medium">{row.percent}%</td>
                    <td className="px-6 py-4 text-white font-semibold">${row.amount}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-r from-slate-800/70 to-slate-900/50 border-t-2 border-purple-500/50">
                  <td className="px-6 py-4 text-white font-bold text-lg">Total</td>
                  <td className="px-6 py-4 text-purple-300 font-bold text-lg">100%</td>
                  <td className="px-6 py-4 text-purple-300 font-bold text-lg">$36.00</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="mt-4 p-4 bg-gradient-to-br from-slate-800/30 to-slate-900/20 rounded-lg border border-slate-700/30">
            <p className="text-gray-400 text-sm">
              <span className="text-purple-400 font-semibold">*</span> Company fee of $4 (10%) is deducted from the ${reTopupAmount} re-topup amount
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

