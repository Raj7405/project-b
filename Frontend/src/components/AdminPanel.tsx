'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { FaShieldAlt, FaInfoCircle } from 'react-icons/fa'

export default function AdminPanel() {
  const { contract } = useWeb3()
  const [loading, setLoading] = useState(false)
  const [contractInfo, setContractInfo] = useState<any>(null)

  useEffect(() => {
    if (contract) {
      loadContractInfo()
    }
  }, [contract])

  const loadContractInfo = async () => {
    if (!contract) return

    try {
      setLoading(true)
      const companyWallet = await contract.companyWallet()
      const entryPrice = await contract.entryPrice()
      const retopupPrice = await contract.retopupPrice()
      const directIncome = await contract.directIncome()
      const companyFee = await contract.companyFee()
      const lastUserId = await contract.lastUserId()
      const usdtToken = await contract.usdtToken()

      setContractInfo({
        companyWallet,
        entryPrice,
        retopupPrice,
        directIncome,
        companyFee,
        lastUserId,
        usdtToken,
      })
      setLoading(false)
    } catch (error: any) {
      console.error('Error loading contract info:', error)
      toast.error('Failed to load contract information')
      setLoading(false)
    }
  }

  if (loading && !contractInfo) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow-lg p-6">
        <div className="flex items-center">
          <FaShieldAlt className="text-4xl mr-4" />
          <div>
            <h2 className="text-2xl font-bold">Admin Panel</h2>
            <p className="text-red-100">View contract information and settings</p>
          </div>
        </div>
      </div>

      {/* Contract Information */}
      {contractInfo && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center">
            <FaInfoCircle className="mr-2" /> Contract Information
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600 text-sm">Company Wallet</p>
              <p className="font-mono text-sm break-all">{contractInfo.companyWallet}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">USDT Token Address</p>
              <p className="font-mono text-sm break-all">{contractInfo.usdtToken}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Last User ID</p>
              <p className="font-semibold">{contractInfo.lastUserId.toString()}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Entry Price</p>
              <p className="font-semibold">{ethers.formatUnits(contractInfo.entryPrice, 18)} tokens</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Retopup Price</p>
              <p className="font-semibold">{ethers.formatUnits(contractInfo.retopupPrice, 18)} tokens</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Direct Income</p>
              <p className="font-semibold">{ethers.formatUnits(contractInfo.directIncome, 18)} tokens</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Company Fee</p>
              <p className="font-semibold">{ethers.formatUnits(contractInfo.companyFee, 18)} tokens</p>
            </div>
          </div>
          <button
            onClick={loadContractInfo}
            disabled={loading}
            className="mt-4 bg-primary hover:bg-primary/90 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-all"
          >
            {loading ? 'Loading...' : 'Refresh Information'}
          </button>
        </div>
      )}

      {/* Note */}
      <div className="bg-yellow-50 border-l-4 border-warning p-6 rounded-lg">
        <h3 className="font-semibold text-yellow-900 mb-2">Note:</h3>
        <p className="text-sm text-yellow-800">
          This contract does not include admin functions like pause/unpause or emergency withdrawal in the current ABI.
          All contract parameters are immutable and set during deployment.
        </p>
      </div>
    </div>
  )
}

