'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Dashboard from '@/components/Dashboard'
import Register from '@/components/Register'
import ReTopup from '@/components/ReTopup'
import AdminPanel from '@/components/AdminPanel'
import { useWeb3 } from '@/contexts/Web3Context'

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const { account, isOwner } = useWeb3()

  return (
    <div className="min-h-screen">      
      <section className="hero-mask-image w-full h-auto">
        <div className="container mx-auto px-4 py-18">
          {!account ? (
            <div className="text-center py-20 ">
              <div>
                <h1 className="text-7xl gradient-color-1 font-bold text-white mb-4">
                  Welcome to Crypto MLM Platform
                </h1>
                <p className="text-6xl text-white mb-8">
                  Connect your wallet to get started
                </p>
              </div>
              <div className='max-w-4xl mx-auto py-10 flex flex-col justify-center items-center gap-10'>
                <p>For Your Own Decentralized Business Matrix Platform</p>
                <div className='flex justify-center items-center space-x-4'>
                  <Link href="/registration" className="flex items-center justify-center space-x-2 bg-blue-gradient-primary hover:bg-white text-white px-6 py-3 rounded-lg transition-all w-full">
                    <span>Registration</span>
                  </Link>
                  <Link href="/login" className="flex items-center justify-center space-x-2 bg-transparent border  hover:bg-white hover:text-black text-white px-6 py-3 rounded-lg transition-all w-full">
                    <span>Login</span>
                  </Link>     
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="gradient-card hover:scale-105 transition-transform duration-300">
                  <div className="gradient-card-inner">
                    <h3 className="text-xl font-semibold mb-2 text-white">📊 Direct Income</h3>
                    <p className="text-gray-300">Earn $18 from each direct referral</p>
                  </div>
                </div>
                <div className="gradient-card hover:scale-105 transition-transform duration-300">
                  <div className="gradient-card-inner">
                    <h3 className="text-xl font-semibold mb-2 text-white">🎯 Auto Pool</h3>
                    <p className="text-gray-300">Enter auto pool after 2 sponsors</p>
                  </div>
                </div>
                <div className="gradient-card hover:scale-105 transition-transform duration-300">
                  <div className="gradient-card-inner">
                    <h3 className="text-xl font-semibold mb-2 text-white">💰 Level Income</h3>
                    <p className="text-gray-300">Earn from 10 levels with re-topup</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex space-x-4 mb-8 border-b">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-4 py-2 font-medium ${
                    activeTab === 'dashboard'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('register')}
                  className={`px-4 py-2 font-medium ${
                    activeTab === 'register'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Register
                </button>
                <button
                  onClick={() => setActiveTab('retopup')}
                  className={`px-4 py-2 font-medium ${
                    activeTab === 'retopup'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Re-Topup
                </button>
                {isOwner && (
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`px-4 py-2 font-medium ${
                      activeTab === 'admin'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Admin
                  </button>
                )}
              </div>

              {/* Content */}
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'register' && <Register />}
              {activeTab === 'retopup' && <ReTopup />}
              {activeTab === 'admin' && isOwner && <AdminPanel />}
            </>
          )}
        </div>
      </section>
    </div>
  )
}

