'use client'

import { useState } from 'react'
import { FaEdit, FaSpinner } from 'react-icons/fa'
import { useWeb3 } from '@/contexts/Web3Context'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { authApi } from '@/services/api.service'

export default function RegistrationPage() {
  const router = useRouter()
  const [uplineId, setUplineId] = useState('1')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState<{
    isRegistering: boolean,
  }>({
    isRegistering: false,
  })
  const { connectWallet, account, contract, tokenContract } = useWeb3()
  const { loginByWallet } = useAuth()

  /**
   * Simplified Registration Flow:
   * 1. Connect wallet (if not connected)
   * 2. Check token allowance
   * 3. If insufficient allowance, approve tokens
   * 4. Call backend API to register (backend calls contract.register())
   */
  const handleApproveAndRegister = async () => {
    // Validate upline ID first
    const uplineIdValue = uplineId.trim()
    if (!uplineIdValue) {
      toast.error('Please enter a valid upline ID')
      return
    }

    try {
      setLoading({ isRegistering: true })

      // Step 1: Connect wallet if not connected
      if (!account) {
        toast.loading('Connecting wallet...')
        await connectWallet()
        toast.dismiss()
      }

      // Wait for Web3 context to be ready
      if (!contract || !tokenContract) {
        toast.error('Please wait for wallet to connect, then try again')
        setLoading({ isRegistering: false })
        return
      }

      // Step 2: Get contract address and entry price
      const contractAddress = await contract.getAddress()
      const entryPrice = await contract.entryPrice()
      
      // Step 3: Verify token contract is set up correctly
      if (!tokenContract) {
        throw new Error('Token contract not initialized. Please reconnect your wallet.')
      }
      
      const tokenAddress = await tokenContract.getAddress()
      console.log('🔍 Token Contract Address:', tokenAddress)
      console.log('🔍 MLM Contract Address:', contractAddress)
      console.log('💰 Entry Price:', entryPrice.toString())
      
      // Step 4: Check current token allowance
      let currentAllowance
      try {
        currentAllowance = await tokenContract.allowance(account, contractAddress)
        console.log('✅ Current Allowance:', currentAllowance.toString())
      } catch (error: any) {
        console.error('❌ Error checking allowance:', error)
        // If token contract doesn't exist or has no allowance function, this will fail
        if (error.message?.includes('execution reverted') || error.code === 'CALL_EXCEPTION') {
          throw new Error(`Token contract error: ${error.message}. Please verify TOKEN_ADDRESS is correct.`)
        }
        throw error
      }
      
      // Step 5: If allowance is insufficient, approve tokens
      if (currentAllowance < entryPrice) {
        toast.loading('Approving tokens... Please confirm in MetaMask')
        
        const approveTx = await tokenContract.approve(contractAddress, entryPrice)
        toast.loading('Waiting for approval confirmation...')
        await approveTx.wait()
        
        toast.dismiss()
        toast.success('✅ Token approval successful!')
      } else {
        toast.success('✅ Token allowance already sufficient')
      }
      
      // Step 6: Call backend API to register (backend will call contract.register())
      toast.loading('Registering on blockchain... This may take a few moments.')
      const result = await authApi.registerUser(account, uplineIdValue)

      toast.dismiss()

      if (!result.canRegister) {
        toast.error(result.reason || 'Registration failed')
        setLoading({ isRegistering: false })
        return
      }

      // Step 6: Login the user with tokens from backend
      if (result.accessToken && result.refreshToken) {
        await loginByWallet(account)
      }

      toast.success(`🎉 Registration successful! Transaction: ${result.txHash?.substring(0, 10)}...`)
      
      setLoading({ isRegistering: false })
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/')
      }, 2000)

    } catch (error: any) {
      console.error('Registration error:', error)
      toast.dismiss()
      
      const errorMessage = error.message || error.reason || 'Registration failed'
      
      // Handle specific errors
      if (errorMessage.includes('User denied') || errorMessage.includes('user rejected')) {
        toast.error('❌ Transaction rejected by user')
      } else if (errorMessage.includes('already exists')) {
        toast.error('❌ You are already registered!')
        setTimeout(() => router.push('/'), 2000)
      } else if (errorMessage.includes('Insufficient token allowance')) {
        toast.error('❌ Please try again - token approval may have failed')
      } else {
        toast.error('❌ Registration failed: ' + errorMessage)
      }
      
      setLoading({ isRegistering: false })
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">

      <div className="max-w-6xl w-full">
        <div className="grid md:grid-cols-1 gap-8 md:gap-12">
          {/* Left Section - Automatic Registration */}
          <div className="gradient-card hover:scale-105 transition-transform duration-300">
            <div className="gradient-card-inner text-center p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Automatic registration
              </h2>
              <p className="text-gray-300 text-lg mb-8">
                Check the ID of Your inviter. You can change it before you go for payment.
              </p>
              
              <div className="mb-8">
                <p className="text-white text-xl font-semibold mb-2">UPLINE:</p>
                <p className="text-gray-400 text-sm mb-4">TO CHANGE</p>
                
                <div className="relative">
                  <input
                    type="number"
                    value={uplineId}
                    onChange={(e) => setUplineId(e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-6 py-4 rounded-lg bg-black/30 border border-purple-500/30 text-white text-center text-2xl font-bold focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all disabled:opacity-70"
                    min="1"
                  />
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full transition-all"
                  >
                    <FaEdit className="text-lg" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Single Button: Approve & Register */}
                <button
                  onClick={handleApproveAndRegister}
                  disabled={loading.isRegistering || !uplineId.trim()}
                  className="flex items-center justify-center space-x-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg transition-all w-full text-lg font-bold shadow-lg uppercase"
                >
                  {loading.isRegistering ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      <span>PROCESSING...</span>
                    </>
                  ) : (
                    <span>APPROVE & REGISTER</span>
                  )}
                </button>
                
                <p className="text-gray-400 text-sm text-center">
                  Click to approve tokens and complete registration in one step
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Login & Telegram */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 mt-12">
          {/* Login Link */}
          <div className="text-center">
            <p className="text-gray-400 text-lg mb-3">Already have an account?</p>
            <a
              href="/login"
              className="text-blue-400 hover:text-blue-300 text-xl font-semibold underline transition-colors"
            >
              Login to your account
            </a>
          </div>

          {/* Telegram */}
          <div className="text-center">
            <p className="text-gray-400 text-lg mb-3">Official chat Telegram:</p>
            <a
              href="https://t.me/crypto_mlm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-xl font-semibold underline transition-colors"
            >
              @crypto-mlm
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

