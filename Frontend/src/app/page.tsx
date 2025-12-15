'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Dashboard from '@/components/Dashboard'
import Register from '@/components/Register'
import ReTopup from '@/components/ReTopup'
import AdminPanel from '@/components/AdminPanel'
import { useWeb3 } from '@/contexts/Web3Context'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'
const ThreeCoin3D = dynamic(() => import('@/components/demos/ThreeCoin3D'), { ssr: false })

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const { account, isOwner, contract } = useWeb3()

  // this for testing purpose, Remove when flow completed
  const getReferrals = async () => {
    if (!contract || !account) {
      toast.error('Contract not initialized')
      return
    }
    console.log("account",account)
    const referrals = await contract.getUserReferrals(account, 10)
    const poolNode = await contract.getPoolNode(account, 10)
    console.log("getUserReferrals",referrals)
    console.log("getPoolNode",poolNode)
  }

  return (
    <div className="min-h-screen">      
      <section className="hero-mask-image w-full h-auto">
        <div className="container mx-auto px-4 lg:px-16 py-18">
            <div className="">
              {/* Hero Section with 3D Coin */}
              <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-12 items-center mb-10 lg:min-h-[600px]">
                {/* Left Side - Text and Buttons (appears second on mobile) */}
                <div className="space-y-8 text-center lg:text-left">
                  <div>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl gradient-color-1 font-bold text-white mb-6 leading-tight">
                      Welcome to Crypto MLM Platform
                    </h1>
                    <p className="text-xl sm:text-2xl lg:text-3xl text-gray-300 mb-4">
                      Connect your wallet to get started
                    </p>
                    <p className="text-base sm:text-lg text-gray-400">
                      For Your Own Decentralized Business Matrix Platform
                    </p>
                  </div>

                  {!account && (
                  <div className='flex flex-col sm:flex-row gap-4 max-w-md mx-auto lg:mx-0'>
                    <Link 
                      href="/registration" 
                      className="flex items-center justify-center space-x-2 bg-blue-gradient-primary hover:bg-white hover:text-black text-white px-8 py-4 rounded-lg transition-all font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span>Registration</span>
                    </Link>
                    <Link 
                      href="/login" 
                      className="flex items-center justify-center space-x-2 bg-transparent border-2 border-white hover:bg-white hover:text-black text-white px-8 py-4 rounded-lg transition-all font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span>Login</span>
                    </Link>     
                  </div>
                  )}
                </div>

                {/* Right Side - 3D BNB Coin (appears first on mobile) */}
                <div className="relative h-[400px] sm:h-[500px] lg:h-[600px] flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-radial from-yellow-500/10 via-transparent to-transparent blur-3xl"></div>
                  <ThreeCoin3D />
                </div>
              </div>

              {/* Feature Cards */}
              <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
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
          {account && (
            <>
              {/* Tabs */}
              <div className="mt-20 mb-8">
                <div className="gradient-card">
                  <div className="gradient-card-inner p-2">
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`relative px-6 py-3 font-semibold rounded-lg transition-all duration-300 transform ${
                          activeTab === 'dashboard'
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50 scale-105'
                            : 'bg-gradient-to-r from-slate-800/50 to-slate-700/50 text-gray-300 hover:text-white hover:from-slate-700/70 hover:to-slate-600/70 hover:scale-102'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Dashboard
                        </span>
                        {activeTab === 'dashboard' && (
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"></div>
                        )}
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('retopup')}
                        className={`relative px-6 py-3 font-semibold rounded-lg transition-all duration-300 transform ${
                          activeTab === 'retopup'
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/50 scale-105'
                            : 'bg-gradient-to-r from-slate-800/50 to-slate-700/50 text-gray-300 hover:text-white hover:from-slate-700/70 hover:to-slate-600/70 hover:scale-102'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Re-Topup
                        </span>
                        {activeTab === 'retopup' && (
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"></div>
                        )}
                      </button>
                      
                      {isOwner && (
                        <button
                          onClick={() => setActiveTab('admin')}
                          className={`relative px-6 py-3 font-semibold rounded-lg transition-all duration-300 transform ${
                            activeTab === 'admin'
                              ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/50 scale-105'
                              : 'bg-gradient-to-r from-slate-800/50 to-slate-700/50 text-gray-300 hover:text-white hover:from-slate-700/70 hover:to-slate-600/70 hover:scale-102'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Admin
                          </span>
                          {activeTab === 'admin' && (
                            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"></div>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* this for testing purpose, Remove when flow completed */}
              {/* <button className='bg-blue-gradient-primary text-white px-6 py-3 rounded-lg transition-all flex gap-2 items-center justify-center my-5' onClick={getReferrals}>Get Referrals</button> */}

              {/* Content */}
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'retopup' && <ReTopup />}
              {activeTab === 'admin' && isOwner && <AdminPanel />}
            </>
          )}
        </div>
      </section>
    </div>
  )
}

