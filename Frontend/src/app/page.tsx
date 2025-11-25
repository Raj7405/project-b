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
          {!account ? (
            <div className="">
              {/* Hero Section with 3D Coin */}
              <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-12 items-center mb-20 lg:min-h-[600px]">
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
          ) : (
            <>
              {/* Tabs */}
              <div className="flex space-x-4 mb-8 border-b">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-4 py-2 font-medium ${
                    activeTab === 'dashboard'
                      ? 'text-white border-b-2 border-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('retopup')}
                  className={`px-4 py-2 font-medium ${
                    activeTab === 'retopup'
                      ? 'text-white border-b-2 border-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Re-Topup
                </button>
                {isOwner && (
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`px-4 py-2 font-medium ${
                      activeTab === 'admin'
                        ? 'text-white border-b-2 border-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Admin
                  </button>
                )}
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

