'use client'

import { useState } from 'react'
import { FaEdit } from 'react-icons/fa'
import { useWeb3 } from '@/contexts/Web3Context'

export default function RegistrationPage() {
  const [uplineId, setUplineId] = useState('1')
  const [isEditing, setIsEditing] = useState(false)
  const { connectWallet, account } = useWeb3()

  const handleRegistration = async () => {
    if (!account) {
      // If not connected, connect wallet first
      await connectWallet()
    } else {
      // Handle registration logic here
      console.log('Registering with upline:', uplineId)
      // You can navigate to the actual registration form or trigger registration
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-6xl w-full">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
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

              <button
                onClick={handleRegistration}
                className="flex items-center justify-center space-x-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-8 py-4 rounded-lg transition-all w-full text-lg font-bold shadow-lg uppercase"
              >
                <span>AUTOMATIC REGISTRATION</span>
              </button>
            </div>
          </div>

          {/* Right Section - Instructions */}
          <div className="gradient-card hover:scale-105 transition-transform duration-300">
            <div className="gradient-card-inner text-center p-8 md:p-12 flex flex-col justify-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-12">
                Instructions
              </h2>
              
              <div className="space-y-8">
                <a
                  href="#registration-phone"
                  className="block text-white hover:text-blue-400 text-2xl font-semibold underline transition-colors"
                >
                  "Registration by phone"
                </a>
                
                <a
                  href="#registration-pc"
                  className="block text-white hover:text-blue-400 text-2xl font-semibold underline transition-colors"
                >
                  "Registration with a PC"
                </a>
                
                <a
                  href="#register-manually"
                  className="block text-white hover:text-blue-400 text-2xl font-semibold underline transition-colors"
                >
                  "Register manually"
                </a>
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

