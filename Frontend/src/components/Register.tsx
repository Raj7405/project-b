'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { FaUserPlus, FaSpinner } from 'react-icons/fa'

export default function Register() {
  const { account, contract, tokenContract } = useWeb3()
  const [referrerAddress, setReferrerAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState(false)
  const [companyWallet, setCompanyWallet] = useState<string | null>(null)

  // Load company wallet address on mount
  useEffect(() => {
    const loadCompanyWallet = async () => {
      if (contract) {
        try {
          const wallet = await contract.companyWallet()
          setCompanyWallet(wallet)
          setReferrerAddress(wallet) // Set as default
        } catch (error) {
          console.error('Failed to load company wallet:', error)
        }
      }
    }
    loadCompanyWallet()
  }, [contract])

  const handleApprove = async () => {
    if (!tokenContract || !contract) {
      toast.error('Contract not initialized')
      return
    }

    try {
      setApproving(true)
      const entryPrice = await contract.entryPrice()
      
      toast.loading('Approving tokens...')
      const tx = await tokenContract.approve(await contract.getAddress(), entryPrice)
      await tx.wait()
      
      toast.dismiss()
      toast.success('Tokens approved! Now you can register.')
      setApproving(false)
    } catch (error: any) {
      console.error('Approval error:', error)
      toast.dismiss()
      toast.error(error.reason || error.message || 'Failed to approve tokens')
      setApproving(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!contract || !tokenContract || !account) {
      toast.error('Contract not initialized')
      return
    }

    if (!referrerAddress) {
      toast.error('Please enter a valid referrer address')
      return
    }

    // Validate Ethereum address format
    if (!ethers.isAddress(referrerAddress)) {
      toast.error('Invalid referrer address format')
      return
    }

    if (referrerAddress.toLowerCase() === account.toLowerCase()) {
      toast.error('Cannot refer yourself')
      return
    }

    try {
      setLoading(true)

      // Check if already registered
      const userInfo = await contract.getUserInfo(account)
      if (userInfo.isActive) {
        toast.error('You are already registered!')
        setLoading(false)
        return
      }

      // Check if referrer is active
      const referrerInfo = await contract.getUserInfo(referrerAddress)
      if (!referrerInfo.isActive) {
        toast.error('Referrer is not registered or inactive')
        setLoading(false)
        return
      }

      // Check allowance
      const entryPrice = await contract.entryPrice()
      const allowance = await tokenContract.allowance(account, await contract.getAddress())
      
      if (allowance < entryPrice) {
        toast.error('Please approve tokens first')
        setLoading(false)
        return
      }

      // Register
      toast.loading('Registering...')
      const tx = await contract.register(referrerAddress)
      await tx.wait()
      
      toast.dismiss()
      toast.success('Registration successful! 🎉')
      setLoading(false)
      
      // Reload page after 2 seconds
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error: any) {
      console.error('Registration error:', error)
      toast.dismiss()
      toast.error(error.reason || error.message || 'Registration failed')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center mb-6">
          <FaUserPlus className="text-3xl text-primary mr-3" />
          <h2 className="text-2xl font-bold text-gray-800">Register New Account</h2>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border-l-4 border-primary p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Registration Details:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Package cost: $20 (in tokens)</li>
            <li>• Your referrer will receive $18</li>
            <li>• Company fee: $2</li>
            <li>• You need to approve tokens before registering</li>
              <li>• Default referrer is company wallet (can be changed)</li>
          </ul>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Referrer Address
            </label>
            <input
              type="text"
              value={referrerAddress}
              onChange={(e) => setReferrerAddress(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
              placeholder="0x..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the Ethereum address of the person who referred you. Default is company wallet.
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={handleApprove}
              disabled={approving || loading}
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
              type="submit"
              disabled={loading || approving}
              className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Registering...
                </>
              ) : (
                '2. Register'
              )}
            </button>
          </div>
        </form>

        {/* Steps Guide */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-3">Registration Steps:</h3>
          <ol className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0 text-xs">1</span>
              <span>Click "Approve Tokens" and confirm the transaction in MetaMask</span>
            </li>
            <li className="flex items-start">
              <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0 text-xs">2</span>
              <span>Wait for the approval transaction to be confirmed</span>
            </li>
            <li className="flex items-start">
              <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0 text-xs">3</span>
              <span>Click "Register" and confirm the transaction</span>
            </li>
            <li className="flex items-start">
              <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0 text-xs">4</span>
              <span>Wait for confirmation and you're all set!</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}

