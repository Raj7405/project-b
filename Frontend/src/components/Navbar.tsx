'use client'

import { useWeb3 } from '@/contexts/Web3Context'
import { FaWallet, FaSignOutAlt } from 'react-icons/fa'

export default function Navbar() {
  const { account, connectWallet, disconnectWallet, chainId } = useWeb3()

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

  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-primary">Crypto MLM</h1>
          </div>

          <div className="flex items-center space-x-4">
            {chainId && (
              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {getNetworkName(chainId)}
              </span>
            )}
            
            {!account ? (
              <button
                onClick={connectWallet}
                className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg transition-all"
              >
                <FaWallet />
                <span>Connect Wallet</span>
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
        </div>
      </div>
    </nav>
  )
}

