'use client'

import { useState } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { FaShieldAlt, FaPause, FaPlay, FaCoins, FaCog } from 'react-icons/fa'

export default function AdminPanel() {
  const { contract } = useWeb3()
  const [loading, setLoading] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [newCompanyWallet, setNewCompanyWallet] = useState('')
  const [withdrawAddress, setWithdrawAddress] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  const checkPauseStatus = async () => {
    try {
      const paused = await contract.paused()
      setIsPaused(paused)
    } catch (error) {
      console.error('Error checking pause status:', error)
    }
  }

  const handlePause = async () => {
    if (!contract) return

    try {
      setLoading(true)
      toast.loading('Pausing contract...')
      const tx = await contract.pause()
      await tx.wait()
      toast.dismiss()
      toast.success('Contract paused successfully')
      checkPauseStatus()
      setLoading(false)
    } catch (error: any) {
      console.error('Pause error:', error)
      toast.dismiss()
      toast.error(error.reason || error.message || 'Failed to pause')
      setLoading(false)
    }
  }

  const handleUnpause = async () => {
    if (!contract) return

    try {
      setLoading(true)
      toast.loading('Unpausing contract...')
      const tx = await contract.unpause()
      await tx.wait()
      toast.dismiss()
      toast.success('Contract unpaused successfully')
      checkPauseStatus()
      setLoading(false)
    } catch (error: any) {
      console.error('Unpause error:', error)
      toast.dismiss()
      toast.error(error.reason || error.message || 'Failed to unpause')
      setLoading(false)
    }
  }

  const handleUpdateCompanyWallet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contract || !newCompanyWallet) return

    try {
      setLoading(true)
      toast.loading('Updating company wallet...')
      const tx = await contract.setCompanyWallet(newCompanyWallet)
      await tx.wait()
      toast.dismiss()
      toast.success('Company wallet updated successfully')
      setNewCompanyWallet('')
      setLoading(false)
    } catch (error: any) {
      console.error('Update error:', error)
      toast.dismiss()
      toast.error(error.reason || error.message || 'Failed to update')
      setLoading(false)
    }
  }

  const handleEmergencyWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contract || !withdrawAddress || !withdrawAmount) return

    try {
      setLoading(true)
      const amount = ethers.parseUnits(withdrawAmount, 18)
      toast.loading('Processing withdrawal...')
      const tx = await contract.emergencyWithdraw(withdrawAddress, amount)
      await tx.wait()
      toast.dismiss()
      toast.success('Emergency withdrawal successful')
      setWithdrawAddress('')
      setWithdrawAmount('')
      setLoading(false)
    } catch (error: any) {
      console.error('Withdrawal error:', error)
      toast.dismiss()
      toast.error(error.reason || error.message || 'Failed to withdraw')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow-lg p-6">
        <div className="flex items-center">
          <FaShieldAlt className="text-4xl mr-4" />
          <div>
            <h2 className="text-2xl font-bold">Admin Panel</h2>
            <p className="text-red-100">Manage contract settings and emergency functions</p>
          </div>
        </div>
      </div>

      {/* Pause/Unpause */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <FaPause className="mr-2" /> Emergency Pause Control
        </h3>
        <p className="text-gray-600 mb-4">
          Pause or unpause all contract operations in case of emergency.
        </p>
        <div className="flex space-x-4">
          <button
            onClick={handlePause}
            disabled={loading || isPaused}
            className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-all flex items-center"
          >
            <FaPause className="mr-2" />
            Pause Contract
          </button>
          <button
            onClick={handleUnpause}
            disabled={loading || !isPaused}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-all flex items-center"
          >
            <FaPlay className="mr-2" />
            Unpause Contract
          </button>
        </div>
        {isPaused && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded">
            ⚠️ Contract is currently paused
          </div>
        )}
      </div>

      {/* Update Company Wallet */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <FaCog className="mr-2" /> Update Company Wallet
        </h3>
        <form onSubmit={handleUpdateCompanyWallet} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Company Wallet Address
            </label>
            <input
              type="text"
              value={newCompanyWallet}
              onChange={(e) => setNewCompanyWallet(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="0x..."
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary/90 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-all"
          >
            Update Company Wallet
          </button>
        </form>
      </div>

      {/* Emergency Withdraw */}
      <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-red-200">
        <h3 className="text-xl font-bold mb-4 flex items-center text-red-600">
          <FaCoins className="mr-2" /> Emergency Withdrawal
        </h3>
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded mb-4">
          ⚠️ Warning: This function should only be used in emergencies. Use with caution!
        </div>
        <form onSubmit={handleEmergencyWithdraw} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Withdrawal Address
            </label>
            <input
              type="text"
              value={withdrawAddress}
              onChange={(e) => setWithdrawAddress(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="0x..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (in tokens)
            </label>
            <input
              type="number"
              step="0.01"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="100.00"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-all"
          >
            Emergency Withdraw
          </button>
        </form>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 border-l-4 border-warning p-6 rounded-lg">
        <h3 className="font-semibold text-yellow-900 mb-2">Admin Guidelines:</h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Use pause function only in case of discovered vulnerabilities</li>
          <li>• Update company wallet through multisig consensus</li>
          <li>• Emergency withdraw should be a last resort</li>
          <li>• Always verify addresses before executing transactions</li>
          <li>• Keep transaction records for audit purposes</li>
        </ul>
      </div>
    </div>
  )
}

