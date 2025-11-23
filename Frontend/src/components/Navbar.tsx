'use client'

import { useState } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { FaWallet, FaSignOutAlt, FaBars, FaTimes, FaSpinner } from 'react-icons/fa'
import Link from 'next/link'

export default function Navbar() {
  const { account, connectWallet, disconnectWallet, chainId } = useWeb3()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

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
    { name: 'Main', href: '#main' },
    { name: 'Partners', href: '#partners' },
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Instructions', href: '#instructions' },
  ]

  const handleConnectWallet = async () => {
    setIsConnecting(true)
    await connectWallet()
    console.log('account:', account)
    setIsConnecting(false)
  }

  return (
    <nav className={`glass-effect sticky w-full top-0 z-50 shadow-lg ${isMobileMenuOpen && 'h-screen'}`}>
      <div className="container mx-auto px-4 py-7">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/">
              <h1 className="text-2xl font-bold text-white">Crypto MLM</h1>
            </Link>
          </div>

          {/* Desktop Menu Items */}
          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-white hover:text-blue-400 transition-colors font-medium"
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
            
            {!account ? (
              <button
                onClick={connectWallet}
                className="flex items-center space-x-2 bg-blue-gradient-primary hover:bg-white text-white px-6 py-5 rounded-lg transition-all cursor-pointer"
                disabled={isConnecting}
              >
                <FaWallet />
                <span>Connect Wallet</span>
                {isConnecting && <FaSpinner className="animate-spin" />}
              </button>
            ) : (
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700 bg-gray-100 px-4 py-2 rounded-lg">
                  {formatAddress(account)}
                </span>
                <button
                  onClick={disconnectWallet}
                  className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all"
                  title="Disconnect"
                >
                  <FaSignOutAlt />
                </button>
              </div>
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
              <a
                key={item.name}
                href={item.href}
                className="block text-white hover:text-blue-400 transition-colors font-medium py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.name}
              </a>
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
              {!account ? (
                <button
                  onClick={() => {
                    connectWallet()
                    setIsMobileMenuOpen(false)
                  }}
                  className="flex items-center justify-center space-x-2 bg-blue-gradient-primary hover:bg-white text-white px-6 py-3 rounded-lg transition-all w-full"
                >
                  <FaWallet />
                  <span>Connect Wallet</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700 bg-gray-100 px-4 py-2 rounded-lg text-center">
                    {formatAddress(account)}
                  </div>
                  <button
                    onClick={() => {
                      disconnectWallet()
                      setIsMobileMenuOpen(false)
                    }}
                    className="flex items-center justify-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all w-full"
                  >
                    <FaSignOutAlt />
                    <span>Disconnect</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

