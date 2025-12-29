'use client'

import { useState } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { useAuth } from '@/contexts/AuthContext'
import { FaSignInAlt, FaSignOutAlt, FaBars, FaTimes, FaWallet, FaSpinner } from 'react-icons/fa'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function Navbar() {
  const { account, connectWallet, disconnectWallet, chainId } = useWeb3()
  const { user, logout: authLogout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
  }

  const getNetworkName = (chainId: number | null) => {
    if (!chainId) return ''
    switch (chainId) {
      case 97: return 'BSC Testnet'
      case 56: return 'BSC Mainnet'
      default: return `Chain ID: ${chainId}`
    }
  }

  const menuItems = [
    { name: 'Main', href: '/' },
    { name: 'Direct income', href: '/direct-income' },
    { name: 'Pool income', href: '/pool-income' },
    { name: 'Level income', href: '/level-income' },
  ]

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' || pathname === '/dashboard'
    }
    return pathname === href
  }

  const handleConnectWallet = async () => {
    try {
      setIsConnecting(true)
      await connectWallet()
    } catch (error) {
      console.error('Connection error:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleLogout = () => {
    // Clear all data: auth tokens, wallet connection, localStorage
    authLogout() // Clears auth tokens and user data
    disconnectWallet() // Clears wallet connection
    setIsMobileMenuOpen(false)
    toast.success('Logged out successfully. All data cleared.')
    // Redirect to home page
    router.push('/')
  }

  const handleDisconnectWallet = () => {
    // Disconnect wallet only (don't logout if user is not logged in)
    disconnectWallet() // Clears wallet connection
    setIsMobileMenuOpen(false)
    
    // Only logout if user is actually logged in
    if (isLoggedIn) {
      authLogout() // Clear auth data when wallet is disconnected
      toast.success('Wallet disconnected and logged out. All data cleared.')
    } else {
      toast.success('Wallet disconnected.')
    }
    
    // Redirect to home page
    router.push('/')
  }

  const isRegistrationPage = pathname === '/registration'
  const isLoggedIn = user !== null // User is logged in if auth context has user data

  return (
    <nav className={`glass-effect sticky w-full top-0 z-50 shadow-lg ${isMobileMenuOpen && 'h-screen'}`}>
      <div className="container mx-auto px-4 py-7">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/">
              <Image
                src="/images/lxpro-logo.png"
                alt="logo"
                title="LXPRO"
                width={140}
                height={140}
              
              />
            </Link>
          </div>

          {/* Desktop Menu Items */}
          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`transition-colors font-medium ${
                  isActive(item.href)
                    ? 'text-blue-400 font-bold border-b-2 border-blue-400 pb-1'
                    : 'text-white hover:text-blue-400'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right Side: Network Info + Wallet */}
          <div className="hidden md:flex items-center space-x-4">
            {chainId && (
              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {getNetworkName(chainId)}
              </span>
            )}
            
            {account ? (
              // Wallet is connected - show wallet address and disconnect option
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700 bg-gray-100 px-4 py-2 rounded-lg">
                  {formatAddress(account)}
                </span>
                {isLoggedIn ? (
                  // Logged in: Show both Disconnect Wallet and Logout buttons
                  <>
                    <button
                      onClick={handleDisconnectWallet}
                      className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-all"
                      title="Disconnect Wallet"
                    >
                      <FaWallet />
                      <span>Disconnect</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all"
                      title="Logout and clear all data"
                    >
                      <FaSignOutAlt />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  // Wallet connected but NOT logged in: Show only Disconnect Wallet
                  <button
                    onClick={handleDisconnectWallet}
                    className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all"
                    title="Disconnect Wallet"
                  >
                    <FaSignOutAlt />
                    <span>Disconnect</span>
                  </button>
                )}
              </div>
            ) : (
              // No wallet connected
              isRegistrationPage ? (
                <button
                  onClick={handleConnectWallet}
                  disabled={isConnecting}
                  className="flex items-center space-x-2 bg-blue-gradient-primary hover:opacity-90 disabled:opacity-50 text-white px-6 py-3 rounded-lg transition-all"
                >
                  {isConnecting ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <FaWallet />
                      <span>Connect Wallet</span>
                    </>
                  )}
                </button>
              ) : (
                <Link href="/login">
                  <button className="flex items-center space-x-2 bg-blue-gradient-primary hover:opacity-90 text-white px-6 py-3 rounded-lg transition-all">
                    <FaSignInAlt />
                    <span>Sign In</span>
                  </button>
                </Link>
              )
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            className="md:hidden text-white text-2xl"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-4 border-t border-gray-200/20 pt-4">
            {/* Menu Items */}
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block transition-colors font-medium py-2 ${
                  isActive(item.href)
                    ? 'text-blue-400 font-bold'
                    : 'text-white hover:text-blue-400'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            
            {/* Network Info */}
            {chainId && (
              <div className="pt-2">
                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full inline-block">
                  {getNetworkName(chainId)}
                </span>
              </div>
            )}

            {/* Wallet Section */}
            <div className="pt-2">
              {account ? (
                // Wallet is connected
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700 bg-gray-100 px-4 py-2 rounded-lg text-center">
                    {formatAddress(account)}
                  </div>
                  {isLoggedIn ? (
                    // Logged in: Show both Disconnect Wallet and Logout buttons
                    <>
                      <button
                        onClick={() => {
                          handleDisconnectWallet()
                        }}
                        className="flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-all w-full"
                      >
                        <FaWallet />
                        <span>Disconnect Wallet</span>
                      </button>
                      <button
                        onClick={() => {
                          handleLogout()
                        }}
                        className="flex items-center justify-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all w-full"
                      >
                        <FaSignOutAlt />
                        <span>Logout</span>
                      </button>
                    </>
                  ) : (
                    // Wallet connected but NOT logged in: Show only Disconnect Wallet
                    <button
                      onClick={() => {
                        handleDisconnectWallet()
                      }}
                      className="flex items-center justify-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all w-full"
                    >
                      <FaSignOutAlt />
                      <span>Disconnect Wallet</span>
                    </button>
                  )}
                </div>
              ) : (
                // No wallet connected
                isRegistrationPage ? (
                  <button
                    onClick={() => {
                      handleConnectWallet()
                      setIsMobileMenuOpen(false)
                    }}
                    disabled={isConnecting}
                    className="flex items-center justify-center space-x-2 bg-blue-gradient-primary hover:opacity-90 disabled:opacity-50 text-white px-6 py-3 rounded-lg transition-all w-full"
                  >
                    {isConnecting ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <FaWallet />
                        <span>Connect Wallet</span>
                      </>
                    )}
                  </button>
                ) : (
                  <Link href="/login">
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center space-x-2 bg-blue-gradient-primary hover:opacity-90 text-white px-6 py-3 rounded-lg transition-all w-full"
                    >
                      <FaSignInAlt />
                      <span>Sign In</span>
                    </button>
                  </Link>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

