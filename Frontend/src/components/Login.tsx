'use client'

import { useState } from 'react'
import { FaWallet, FaSearch } from 'react-icons/fa'
import { useWeb3 } from '@/contexts/Web3Context'

export default function Login() {
  const [trxAddress, setTrxAddress] = useState('')
  const { connectWallet } = useWeb3()

  const handleView = () => {
    if (trxAddress.trim()) {
      // Handle viewing logic here
      console.log('Viewing account:', trxAddress)
      // You can add navigation or API call here
    }
  }

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
                onClick={connectWallet}
                className="flex items-center justify-center space-x-3 bg-blue-gradient-primary hover:opacity-90 text-white px-8 py-4 rounded-lg transition-all w-full text-lg font-semibold shadow-lg"
              >
                <FaWallet className="text-xl" />
                <span>AUTOMATIC LOGIN</span>
              </button>
            </div>
          </div>

          {/* Right Section - View Account */}
          <div className="gradient-card hover:scale-105 transition-transform duration-300">
            <div className="gradient-card-inner text-center p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                To view
              </h2>
              <p className="text-gray-300 text-lg mb-8">
                account ID or TRX wallet
              </p>
              <div className="space-y-4">
                <input
                  type="text"
                  value={trxAddress}
                  onChange={(e) => setTrxAddress(e.target.value)}
                  placeholder="Enter TRX Address or ID"
                  className="w-full px-6 py-4 rounded-lg bg-black/30 border border-purple-500/30 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                />
                <button
                  onClick={handleView}
                  className="flex items-center justify-center space-x-3 bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg transition-all w-full text-lg font-semibold shadow-lg"
                >
                  <FaSearch className="text-xl" />
                  <span>VIEWING</span>
                </button>
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
              Registration in tigertron.io
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

