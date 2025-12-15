'use client'

import { useEffect, useState } from 'react'
import { FaEdit, FaSpinner } from 'react-icons/fa'
import { useWeb3 } from '@/contexts/Web3Context'
import { useAuth } from '@/contexts/AuthContext'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { switchToHardhatNetwork, checkHardhatNodeRunning } from '@/utils/networkHelpers'
import { useRouter } from 'next/navigation'
import { API_URL } from '@/utils/constants'
import { authApi } from '@/services/api.service'

export default function RegistrationPage() {
  const router = useRouter()
  const [uplineId, setUplineId] = useState('1')
  const [isEditing, setIsEditing] = useState(false)
  const [registerStep, setRegisterStep] = useState<{
    tokenApproval: boolean,
    registration: boolean,
  }>({
    tokenApproval: true,
    registration: false,
  })
  const [loading, setLoading] = useState<{
    isWalletConnecting: boolean,
    isApproving: boolean,
    isRegistering: boolean,
  }>({
    isWalletConnecting: false,
    isApproving: false,
    isRegistering: false,
  })
  const { connectWallet, account, contract, tokenContract, provider } = useWeb3()
  const { loginByWallet } = useAuth()

  const handleConnectWallet = async () => {
    setLoading(prev => ({ ...prev, isWalletConnecting: true }))
    await connectWallet()
    setLoading(prev => ({ ...prev, isWalletConnecting: false }))
  }

  if (!account) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 py-12 gap-6" >
        <h1>Connect Your Wallet</h1>
        <button onClick={handleConnectWallet} className="bg-blue-gradient-primary text-white px-6 py-3 rounded-lg transition-all flex gap-2 items-center justify-center">
          Connect MetaMask
          {loading.isWalletConnecting && <FaSpinner className="animate-spin" />}
        </button>
      </div>
    )
  }

  // This function is no longer needed - backend handles everything
  // Keeping for reference but not used

  const handleApprove = async () => {
    if (!tokenContract || !contract || !provider || !account) {
      toast.error('Contract not initialized or wallet not connected')
      return
    }

    // Validate upline ID first
    const uplineIdValue = uplineId.trim()
    if (!uplineIdValue) {
      toast.error('Please enter a valid upline ID')
      return
    }

    try {
      setLoading(prev => ({ ...prev, isApproving: true }))
      
      // Check if contract is deployed
      const contractAddress = await contract.getAddress()
      const contractCode = await provider.getCode(contractAddress)
      const network = await provider.getNetwork()
      const blockNumber = await provider.getBlockNumber()
      const expectedChainId = BigInt(1337) // Hardhat local network (matches hardhat.config.js)

      // Check if user is on the wrong network
      if (network.chainId !== expectedChainId) {
        toast.dismiss()
        
        // Check if Hardhat node is running
        const isHardhatRunning = await checkHardhatNodeRunning()
        if (!isHardhatRunning) {
          toast.error(
            `❌ Hardhat node is not running!\n\n` +
            `Please start Hardhat node first:\n` +
            `cd Contract && npx hardhat node\n\n` +
            `Then try again.`,
            { duration: 15000 }
          )
          setLoading(prev => ({ ...prev, isApproving: false }))
          return
        }

        // Try to automatically switch network
        try {
          toast.loading('Switching to Hardhat Local network...')
          await switchToHardhatNetwork()
          toast.dismiss()
          toast.success('✅ Switched to Hardhat Local network! Please try again.')
          setLoading(prev => ({ ...prev, isApproving: false }))
          // Reload page after a short delay to pick up the new network
          setTimeout(() => {
            window.location.reload()
          }, 1000)
          return
        } catch (switchError: any) {
          toast.dismiss()
          const errorMsg = `❌ Wrong Network!\n\n` +
            `You're connected to: ${network.name} (Chain ID: ${network.chainId})\n` +
            `Required: Hardhat Local (Chain ID: 1337)\n\n` +
            `Please switch to Hardhat Local network in MetaMask:\n` +
            `1) Click MetaMask network dropdown\n` +
            `2) Select "Hardhat Local" or add it:\n` +
            `   - Network Name: Hardhat Local\n` +
            `   - RPC URL: http://127.0.0.1:8545\n` +
            `   - Chain ID: 1337\n` +
            `   - Currency: ETH\n\n` +
            `Error: ${switchError.message}`
          toast.error(errorMsg, { duration: 20000 })
          setLoading(prev => ({ ...prev, isApproving: false }))
          return
        }
      }
      
      // Check if contract is deployed
      if (contractCode === '0x' || !contractCode) {
        toast.dismiss()
        const errorMsg = `❌ Contract not deployed at ${contractAddress}!\n\n` +
          `Network: ${network.name} (Chain ID: ${network.chainId})\n` +
          `Block: ${blockNumber}\n\n` +
          `⚠️ If you restarted Hardhat node, you need to redeploy:\n` +
          `1) cd Contract && npx hardhat node (keep running)\n` +
          `2) In new terminal: npx hardhat run deploy-local.js --network localhost\n` +
          `3) Update Frontend/.env.local with new addresses`
        toast.error(errorMsg, { duration: 15000 })
        setLoading(prev => ({ ...prev, isApproving: false }))
        return
      }
      
      // Get the 20 USDT amount from contract
      const entryPrice = await contract.entryPrice()
      
      toast.loading('Approving tokens...')
      // Tell USDT contract: "Allow MLM contract to spend 20 USDT"
      const tx = await tokenContract.approve(
        contractAddress, 
        entryPrice
      )
      
      // Wait for transaction to complete on blockchain
      await tx.wait()
      
      toast.dismiss()
      toast.success('✅ Approval successful! Now registering...')
      setLoading(prev => ({ ...prev, isApproving: false }))
      
      // Move to registration step
      setRegisterStep({
        tokenApproval: false,
        registration: true
      })
      
      // Automatically trigger registration after approval
      await handleRegistration()
    } catch (error: any) {
      console.error('Approval error:', error)
      toast.dismiss()
      
      // Provide more helpful error messages
      if (error.message && error.message.includes('could not decode result data')) {
        const network = await provider.getNetwork()
        if (network.chainId !== BigInt(1337)) {
          toast.error(
            '❌ Wrong Network! Switch to Hardhat Local (Chain ID: 1337) in MetaMask. The contract is only deployed on the local network.',
            { duration: 15000 }
          )
        } else {
          toast.error(
            '❌ Contract not deployed at this address! Deploy first: 1) cd Contract, 2) npx hardhat run deploy-local.js --network localhost, 3) Update Frontend/.env.local',
            { duration: 10000 }
          )
        }
      } else {
        toast.error('❌ Approval failed: ' + (error.reason || error.message || 'Unknown error'))
      }
       
      setLoading(prev => ({ ...prev, isApproving: false }))
      setRegisterStep({
        tokenApproval: true,
        registration: false
      })
    }
  }

  // New simplified registration handler - backend does everything
  const handleRegistration = async () => {
    if (!account) {
      toast.error('Please connect your wallet first')
      return
    }

    // Validate upline ID
    const uplineIdValue = uplineId.trim()
    if (!uplineIdValue) {
      toast.error('Please enter a valid upline ID')
      return
    }

    try {
      setLoading(prev => ({ ...prev, isRegistering: true }))
      toast.loading('Registering on blockchain... This may take a few moments.')

      // Call backend API - backend handles DB creation + blockchain registration
      const result = await authApi.registerUser(account, uplineIdValue)

      toast.dismiss()

      if (!result.canRegister) {
        toast.error(result.reason || 'Registration failed')
        setLoading(prev => ({ ...prev, isRegistering: false }))
        return
      }

      // Store tokens in AuthContext for future authenticated requests
      if (result.accessToken && result.refreshToken) {
        await loginByWallet(account)
      }

      toast.success(`🎉 Registration successful! Transaction: ${result.txHash?.substring(0, 10)}...`)
      
      setLoading(prev => ({ ...prev, isRegistering: false }))
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/')
      }, 2000)

    } catch (error: any) {
      console.error('Registration error:', error)
      toast.dismiss()
      
      const errorMessage = error.message || error.reason || 'Registration failed'
      
      if (errorMessage.includes('Insufficient token allowance')) {
        toast.error('Please approve tokens first!')
        setRegisterStep({
          tokenApproval: true,
          registration: false
        })
      } else if (errorMessage.includes('already exists')) {
        toast.error('You are already registered!')
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } else {
        toast.error('❌ Registration failed: ' + errorMessage)
      }
      
      setLoading(prev => ({ ...prev, isRegistering: false }))
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
                {/* Step 1: Approve Tokens */}
                <button
                  onClick={handleApprove}
                  disabled={loading.isApproving || !registerStep.tokenApproval || loading.isRegistering}
                  className="flex items-center justify-center space-x-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg transition-all w-full text-lg font-bold shadow-lg uppercase"
                >
                  {loading.isApproving ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      <span>APPROVING TOKENS...</span>
                    </>
                  ) : loading.isRegistering ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      <span>REGISTERING...</span>
                    </>
                  ) : (
                    <span>1. APPROVE TOKENS & REGISTER</span>
                  )}
                </button>

                {/* Step 2: Manual Registration (if approval succeeded but registration didn't auto-trigger) */}
                {registerStep.registration && !loading.isApproving && (
                  <button
                    onClick={handleRegistration}
                    disabled={loading.isRegistering}
                    className="flex items-center justify-center space-x-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg transition-all w-full text-lg font-bold shadow-lg uppercase"
                  >
                    {loading.isRegistering ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        <span>REGISTERING...</span>
                      </>
                    ) : (
                      <span>2. COMPLETE REGISTRATION</span>
                    )}
                  </button>
                )}
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

