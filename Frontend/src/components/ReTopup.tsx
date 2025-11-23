'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { FaArrowUp, FaSpinner, FaCheckCircle } from 'react-icons/fa'

export default function ReTopup() {
  const { account, contract, tokenContract } = useWeb3()
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [hasReTopup, setHasReTopup] = useState(false)
  const [reTopupAmount, setReTopupAmount] = useState('0')

  useEffect(() => {
    if (contract && tokenContract && account) {
      checkRegistration()
    }
  }, [contract, tokenContract, account])

  const checkRegistration = async () => {
    try {
      if (!contract || !tokenContract || !account) return
      
      // Check if contract exists
      try {
        const contractCode = await contract.runner?.provider?.getCode(await contract.getAddress())
        if (!contractCode || contractCode === '0x') {
          console.error('Contract not deployed at this address')
          setIsRegistered(false)
          return
        }
      } catch (checkError) {
        console.error('Error checking contract:', checkError)
        setIsRegistered(false)
        return
      }
      
      // Get user info
      let userInfo
      try {
        userInfo = await contract.getUserInfo(account)
      } catch (error: any) {
        // Handle contract not found error
        if (error.message?.includes('could not decode') || error.message?.includes('BAD_DATA')) {
          console.error('Contract not found. Please check deployment and .env.local')
          setIsRegistered(false)
          return
        }
        throw error
      }
      
      if (!userInfo.isActive) {
        setIsRegistered(false)
        return
      }

      setIsRegistered(true)
      setHasReTopup(userInfo.retopupCount > 0)

      const rtAmount = await contract.retopupPrice()
      const tokenDecimals = await tokenContract.decimals()
      setReTopupAmount(ethers.formatUnits(rtAmount, tokenDecimals))
    } catch (error) {
      console.error('Error checking registration:', error)
      setIsRegistered(false)
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
    if (!contract || !tokenContract) {
      toast.error('Contract not initialized')
      return
    }

    try {
      setLoading(true)

      // Check allowance
      const amount = await contract.retopupPrice()
      const allowance = await tokenContract.allowance(account, await contract.getAddress())
      
      if (allowance < amount) {
        toast.error('Please approve tokens first')
        setLoading(false)
        return
      }

      // Re-topup
      toast.loading('Processing re-topup...')
      const tx = await contract.retopup()
      await tx.wait()
      
      toast.dismiss()
      toast.success('Re-topup successful! 🎉 You can now receive level income.')
      setLoading(false)
      
      // Reload data
      checkRegistration()
    } catch (error: any) {
      console.error('Re-topup error:', error)
      toast.dismiss()
      toast.error(error.reason || error.message || 'Re-topup failed')
      setLoading(false)
    }
  }

  if (!isRegistered) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Registration Required</h2>
          <p className="text-gray-600">
            You need to register first before you can re-topup. Please go to the Register tab.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center mb-6">
          <FaArrowUp className="text-3xl text-primary mr-3" />
          <h2 className="text-2xl font-bold text-gray-800">Re-Topup Account</h2>
        </div>

        {/* Status */}
        {hasReTopup ? (
          <div className="bg-green-50 border-l-4 border-success p-4 mb-6">
            <div className="flex items-center">
              <FaCheckCircle className="text-success text-2xl mr-3" />
              <div>
                <h3 className="font-semibold text-green-900">Re-Topup Active</h3>
                <p className="text-sm text-green-800">
                  You have already completed re-topup. You are eligible to receive level income!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border-l-4 border-warning p-4 mb-6">
            <h3 className="font-semibold text-yellow-900 mb-2">Re-Topup Required</h3>
            <p className="text-sm text-yellow-800">
              Complete re-topup to become eligible for receiving level income from your downline.
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border-l-4 border-primary p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Re-Topup Details:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Amount required: ${reTopupAmount} (in tokens)</li>
            <li>• Distribution: $36 across 10 levels (90%)</li>
            <li>• Company fee: $4 (10%)</li>
            <li>• Level 1: 30% ($10.80)</li>
            <li>• Level 2: 15% ($5.40)</li>
            <li>• Level 3-8: 5% each ($1.80 each)</li>
            <li>• Level 9-10: 10% each ($3.60 each)</li>
            <li>• Only eligible ancestors receive income</li>
          </ul>
        </div>

        {/* Eligibility Note */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-purple-900 mb-2">📌 Important Note:</h3>
          <p className="text-sm text-purple-800">
            To receive re-topup income from your downline, you must complete your own re-topup first. 
            If you haven't re-topped up, your share will go to the company wallet.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex space-x-4">
            <button
              onClick={handleApprove}
              disabled={approving || loading || hasReTopup}
              className="flex-1 bg-secondary hover:bg-secondary/90 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center"
            >
              {approving ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Approving...
                </>
              ) : (
                '1. Approve Tokens'
              )}
            </button>

            <button
              onClick={handleReTopup}
              disabled={loading || approving || hasReTopup}
              className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                '2. Re-Topup'
              )}
            </button>
          </div>
        </div>

        {/* Level Distribution Table */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-3">Level Income Distribution:</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Level</th>
                  <th className="px-4 py-2 text-left">Percentage</th>
                  <th className="px-4 py-2 text-left">Amount ($)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { level: 1, percent: 30, amount: 10.80 },
                  { level: 2, percent: 15, amount: 5.40 },
                  { level: 3, percent: 10, amount: 3.60 },
                  { level: '4-8', percent: '5 each', amount: '1.80 each' },
                  { level: '9-10', percent: '10 each', amount: '3.60 each' },
                ].map((row, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-2">{row.level}</td>
                    <td className="px-4 py-2">{row.percent}%</td>
                    <td className="px-4 py-2">${row.amount}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 font-semibold">
                <tr>
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2">100%</td>
                  <td className="px-4 py-2">$36.00</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            * Company fee of $4 (10%) is deducted from the $40 re-topup amount
          </p>
        </div>
      </div>
    </div>
  )
}

