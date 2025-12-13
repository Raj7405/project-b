'use client'

import { useState, useEffect, useRef } from 'react'
import { FaWallet, FaSearch, FaSpinner, FaCheckCircle } from 'react-icons/fa'
import { useWeb3 } from '@/contexts/Web3Context'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [userId, setUserId] = useState('')
  const [expectedAddress, setExpectedAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState({
    isViewing: false,
    isConnecting: false,
  })
  const { connectWallet, account, disconnectWallet } = useWeb3()
  const { loginById, loginByWallet, user: authUser } = useAuth()
  const router = useRouter()

  // Step 1: Retrieve wallet address from user ID using unified API
  const handleRetrieveAddress = async () => {
    try {
      setLoading(prev => ({ ...prev, isViewing: true }))
      
      if (!userId.trim()) {
        toast.error('Please enter your User ID')
        setLoading(prev => ({ ...prev, isViewing: false }))
        return
      }

      // Use unified API to get user by ID (automatically generates tokens)
      // loginById updates the auth context and returns user data
      const result = await loginById(userId)
      
      // Get the wallet address from the returned user
      const userAddress = result?.user?.walletAddress

      // Check if address is valid (not zero address)
      if (!userAddress || userAddress === '0x0000000000000000000000000000000000000000') {
        toast.error('User ID not found. Please check and try again.')
        setLoading(prev => ({ ...prev, isViewing: false }))
        return
      }

      // Store the expected address
      setExpectedAddress(userAddress)
      toast.success('✅ Wallet address found! Please connect your wallet.')
      
    } catch (error: any) {
      console.error('Error retrieving address:', error)
      toast.error(error?.message || 'Error retrieving user. Please try again.')
    } finally {
      setLoading(prev => ({ ...prev, isViewing: false }))
    }
  }

  // Step 2: Connect wallet and verify it matches the expected address
  const handleConnectAndVerify = async () => {
    try {
      setLoading(prev => ({ ...prev, isConnecting: true }))
      
      if (!expectedAddress) {
        toast.error('Please retrieve your address first by entering your User ID')
        setLoading(prev => ({ ...prev, isConnecting: false }))
        return
      }

      // Connect wallet
      await connectWallet()
      
      // The account will be updated by Web3Context, we'll check in useEffect
      
    } catch (error: any) {
      console.error('Error connecting wallet:', error)
      toast.error(error?.message || 'Failed to connect wallet')
      setLoading(prev => ({ ...prev, isConnecting: false }))
    }
  }

  // Track if we've already processed this account to prevent infinite loops
  const processedAccountRef = useRef<string | null>(null)
  const isProcessingRef = useRef(false)

  // Handle automatic login when wallet connects (no expected address)
  useEffect(() => {
    if (account && !expectedAddress && loading.isConnecting && !isProcessingRef.current) {
      // Check if we've already processed this account
      if (processedAccountRef.current === account.toLowerCase()) {
        return
      }

      isProcessingRef.current = true
      processedAccountRef.current = account.toLowerCase()

      // Automatic login flow - login with connected wallet
      loginByWallet(account)
        .then(() => {
          setLoading(prev => ({ ...prev, isConnecting: false }))
          toast.success('✅ Logged in successfully!')
          setTimeout(() => {
            router.push('/')
          }, 1000)
        })
        .catch((error) => {
          console.error('Login error:', error)
          setLoading(prev => ({ ...prev, isConnecting: false }))
          toast.error('Failed to complete login')
          // Reset on error so user can try again
          processedAccountRef.current = null
        })
        .finally(() => {
          isProcessingRef.current = false
        })
    }
  }, [account, expectedAddress, loading.isConnecting, loginByWallet, router])

  // Track if we've already verified this account+expectedAddress combination
  const verifiedAccountRef = useRef<string | null>(null)
  const isVerifyingRef = useRef(false)

  // Verify wallet address matches after connection (User ID login flow)
  useEffect(() => {
    if (account && expectedAddress && !isVerifyingRef.current) {
      const key = `${account.toLowerCase()}-${expectedAddress.toLowerCase()}`
      
      // Check if we've already verified this combination
      if (verifiedAccountRef.current === key) {
        return
      }

      isVerifyingRef.current = true
      verifiedAccountRef.current = key
      setLoading(prev => ({ ...prev, isConnecting: false }))
      
      if (account.toLowerCase() === expectedAddress.toLowerCase()) {
        // Wallet matches! Login with wallet address to get/refresh tokens
        loginByWallet(account)
          .then(() => {
            toast.success('✅ Wallet verified! Logging you in...')
            // Redirect to dashboard or home after successful login
            setTimeout(() => {
              router.push('/')
            }, 1500)
          })
          .catch((error) => {
            console.error('Login error:', error)
            toast.error('Failed to complete login')
            // Reset on error so user can try again
            verifiedAccountRef.current = null
          })
          .finally(() => {
            isVerifyingRef.current = false
          })
      } else {
        // Show detailed toast message to add the correct wallet to MetaMask
        disconnectWallet()
        toast.error(
          `❌ Wrong wallet connected!\n\n` +
          `Expected wallet: ${expectedAddress}\n\n` +
          `Please add this wallet address to MetaMask:\n` +
          `1. Open MetaMask extension\n` +
          `2. Click account icon → Import Account\n` +
          `3. Enter the private key for: ${expectedAddress.slice(0, 6)}...${expectedAddress.slice(-4)}\n` +
          `4. Connect the correct wallet and try again`,
          {
            duration: 8000,
            style: {
              background: '#ef4444',
              color: '#fff',
              padding: '16px',
              maxWidth: '500px',
              whiteSpace: 'pre-line',
            }
          }
        )
        // Reset so user can try again
        verifiedAccountRef.current = null
        isVerifyingRef.current = false
      }
    }
  }, [account, expectedAddress, router, loginByWallet, disconnectWallet])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-6xl w-full">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Left Section - Automatic Login */}
          <div className="gradient-card hover:scale-105 transition-transform duration-300">
            <div className="gradient-card-inner text-center p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Login to your personal account
              </h2>
              <p className="text-gray-300 text-lg mb-8">
                For access to all the functions of your personal account, use automatic login
              </p>
              <button
                onClick={async () => {
                  try {
                    setLoading(prev => ({ ...prev, isConnecting: true }))
                    await connectWallet()
                    // Account will be set by Web3Context, we'll handle login in useEffect
                  } catch (error: any) {
                    console.error('Connection error:', error)
                    toast.error(error?.message || 'Failed to connect wallet')
                    setLoading(prev => ({ ...prev, isConnecting: false }))
                  }
                }}
                disabled={loading.isConnecting}
                className="flex items-center justify-center space-x-3 bg-blue-gradient-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg transition-all w-full text-lg font-semibold shadow-lg"
              >
                {loading.isConnecting ? (
                  <>
                    <FaSpinner className="text-xl animate-spin" />
                    <span>CONNECTING...</span>
                  </>
                ) : (
                  <>
                    <FaWallet className="text-xl" />
                    <span>AUTOMATIC LOGIN</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Section - Login with User ID */}
          <div className="gradient-card hover:scale-105 transition-transform duration-300">
            <div className="gradient-card-inner text-center p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Login with User ID
              </h2>
              <p className="text-gray-300 text-lg mb-8">
                Enter your ID to retrieve your wallet address
              </p>
              <div className="space-y-4">
                {/* Step 1: Enter User ID */}
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter your User ID"
                  disabled={!!expectedAddress}
                  className="w-full px-6 py-4 rounded-lg bg-black/30 border border-purple-500/30 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                
                {/* Show expected address if found */}
                {expectedAddress && (
                  <div className="rounded-lg p-4 bg-blue-500/10 border border-blue-500/30">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <FaCheckCircle className="text-blue-400" />
                      <span className="font-semibold text-blue-400">
                        Wallet Address Found
                      </span>
                    </div>
                    <p className="text-white text-sm break-all mb-3 font-mono bg-black/30 p-2 rounded">
                      {expectedAddress}
                    </p>
                    <p className="text-gray-300 text-xs text-center">
                      Please connect the wallet with this address to continue
                    </p>
                  </div>
                )}

                {/* Step 1 Button: Retrieve Address */}
                {!expectedAddress && (
                  <button
                    onClick={handleRetrieveAddress}
                    disabled={loading.isViewing || !userId.trim()}
                    className="flex items-center justify-center space-x-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg transition-all w-full text-lg font-semibold shadow-lg"
                  >
                    {loading.isViewing ? (
                      <>
                        <FaSpinner className="text-xl animate-spin" />
                        <span>SEARCHING...</span>
                      </>
                    ) : (
                      <>
                        <FaSearch className="text-xl" />
                        <span>FIND MY WALLET</span>
                      </>
                    )}
                  </button>
                )}

                {/* Step 2 Button: Connect Wallet (always show when address is found) */}
                {expectedAddress && !account && (
                  <button
                    onClick={handleConnectAndVerify}
                    disabled={loading.isConnecting}
                    className="flex items-center justify-center space-x-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg transition-all w-full text-lg font-semibold shadow-lg"
                  >
                    {loading.isConnecting ? (
                      <>
                        <FaSpinner className="text-xl animate-spin" />
                        <span>CONNECTING...</span>
                      </>
                    ) : (
                      <>
                        <FaWallet className="text-xl" />
                        <span>CONNECT WALLET</span>
                      </>
                    )}
                  </button>
                )}

                {/* Reset button */}
                {expectedAddress && (
                  <button
                    onClick={() => {
                      setExpectedAddress(null)
                      setUserId('')
                    }}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Try different ID
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Registration & Telegram */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 mt-12">
          {/* Join/Registration */}
          <div className="text-center">
            <p className="text-gray-400 text-lg mb-3">Join if you are not with us</p>
            <a
              href="/registration"
              className="text-orange-400 hover:text-orange-300 text-xl font-semibold underline transition-colors"
            >
              Registration in crypto_mlm
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

