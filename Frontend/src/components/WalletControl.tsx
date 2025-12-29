'use client'

import { useState } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { useAuth } from '@/contexts/AuthContext'
import { FaSignInAlt, FaSignOutAlt, FaWallet, FaSpinner, FaTimes, FaChevronDown } from 'react-icons/fa'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function WalletControl() {
  const { account, connectWallet, disconnectWallet, chainId } = useWeb3()
  const { user, logout: authLogout } = useAuth()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
  }

  const getNetworkName = (chainId: number | null) => {
    if (!chainId) return ''
    switch (chainId) {
      case 97: return 'BSC Testnet'
      case 56: return 'BSC Mainnet'
      case 1337: return 'Hardhat Local ✅'
      default: return `Chain ID: ${chainId}`
    }
  }

  const handleConnectWallet = async () => {
    try {
      setIsConnecting(true)
      await connectWallet()
      setIsMenuOpen(false)
    } catch (error) {
      console.error('Connection error:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleLogout = () => {
    authLogout()
    disconnectWallet()
    setIsMenuOpen(false)
    toast.success('Logged out successfully. All data cleared.')
    router.push('/')
  }

  const handleDisconnectWallet = () => {
    disconnectWallet()
    setIsMenuOpen(false)
    
    if (user) {
      authLogout()
      toast.success('Wallet disconnected and logged out. All data cleared.')
    } else {
      toast.success('Wallet disconnected.')
    }
    
    router.push('/')
  }

  const isLoggedIn = user !== null

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Wallet Button */}
      {!account ? (
        <button
          onClick={handleConnectWallet}
          disabled={isConnecting}
          className="flex items-center bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          {isConnecting ? (
            <>
              <FaSpinner className="animate-spin" />
              <span className="hidden sm:inline">Connecting...</span>
            </>
          ) : (
            <>
              <FaWallet />
              <span className="hidden sm:inline">Connect Wallet</span>
            </>
          )}
        </button>
      ) : (
        <div className="relative">
          {/* Main Wallet Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            <FaWallet />
            <span className="hidden sm:inline font-medium">{formatAddress(account)}</span>
            <FaChevronDown className={`transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsMenuOpen(false)}
              />
              
              {/* Menu */}
              <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 z-50 overflow-hidden">
                {/* Wallet Info */}
                <div className="p-4 border-b border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Wallet Address</div>
                  <div className="text-sm font-mono text-white break-all">{account}</div>
                  {chainId && (
                    <div className="mt-2 text-xs text-gray-400">
                      Network: {getNetworkName(chainId)}
                    </div>
                  )}
                </div>

                {/* Quick Links */}
                <div className="p-2">
                  <Link
                    href="/"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/direct-income"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                  >
                    Direct Income
                  </Link>
                  <Link
                    href="/level-income"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                  >
                    Level Income
                  </Link>
                  <Link
                    href="/pool-income"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                  >
                    Pool Income
                  </Link>
                </div>

                {/* Actions */}
                <div className="p-2 border-t border-gray-700 space-y-2">
                  {isLoggedIn && (
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all text-sm"
                    >
                      <FaSignOutAlt />
                      <span>Logout</span>
                    </button>
                  )}
                  <button
                    onClick={handleDisconnectWallet}
                    className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-all text-sm ${
                      isLoggedIn 
                        ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                  >
                    <FaWallet />
                    <span>Disconnect Wallet</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

