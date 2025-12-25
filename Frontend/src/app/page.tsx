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
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const { account, isOwner, contract } = useWeb3()

  // this for testing purpose, Remove when flow completed
  const getReferrals = async () => {
    if (!contract || !account) {
      toast.error('Contract not initialized')
      return
    }
    console.log("account", account)
    const referrals = await contract.getUserReferrals(account, 10)
    const poolNode = await contract.getPoolNode(account, 10)
    console.log("getUserReferrals", referrals)
    console.log("getPoolNode", poolNode)
  }

  return (
    <div className="min-h-screen">
      <section className="w-full h-auto">
        <div className='font-bold text-white mb-6 leading-tight text-center p-4 bg-blue-gradient-primary sticky top-0 z-1000 opacity-80'>
          MLM platform
        </div>
        <div className="">
          {account ? (
            <>
               <div className="container mx-auto px-4 lg:px-16 py-18">
                  {/* Tabs */}
                  <div className="mt-20 mb-8">
                    <div className="gradient-card">
                      <div className="gradient-card-inner p-2">
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`relative px-6 py-3 font-semibold rounded-lg transition-all duration-300 transform ${activeTab === 'dashboard'
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
                            className={`relative px-6 py-3 font-semibold rounded-lg transition-all duration-300 transform ${activeTab === 'retopup'
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
                              className={`relative px-6 py-3 font-semibold rounded-lg transition-all duration-300 transform ${activeTab === 'admin'
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
               </div>
            </>
          ) : (
            <div className="">
              {/* Hero Section with 3D Coin */}
              <div className="hero-mask-image">
                <div className="container mx-auto px-4 lg:px-16 py-18 flex flex-col-reverse lg:grid lg:grid-cols-2 gap-12 items-center mb-10 lg:min-h-[600px]">
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
              </div>

              <div className="container mx-auto px-4 lg:px-16 py-18">
                {/* Feature Cards Section */}
                <div className="mb-20">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold gradient-color-1 mb-4">
                      International community
                    </h2>
                    <h3 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
                      Global Decentralized Ecosystem
                    </h3>
                    <p className="text-lg sm:text-xl text-gray-300 max-w-4xl mx-auto">
                      Decentralized networking platform based on smart contracts that connects people from all over the world and opens the limitless possibilities of the new economic financial system.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Zero Risk */}
                    <div className="gradient-card">
                      <div className="gradient-card-inner p-6">
                        <div className="flex justify-center mb-4">
                          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                        <h3 className="text-xl font-bold gradient-color-1 mb-3 text-center">Zero Risk</h3>
                        <p className="text-gray-300 text-center">
                          The human factor is excluded. The smart contract does not depend on anyone, there is no way to stop the platform.
                        </p>
                      </div>
                    </div>

                    {/* Instant transactions */}
                    <div className="gradient-card">
                      <div className="gradient-card-inner p-6">
                        <div className="flex justify-center mb-4">
                          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                          </div>
                        </div>
                        <h3 className="text-xl font-bold gradient-color-1 mb-3 text-center">Instant transactions</h3>
                        <p className="text-gray-300 text-center">
                          The profit routes from other members directly into your personal wallet. There is no hoarding in the system, the income belongs only to you.
                        </p>
                      </div>
                    </div>

                    {/* Immutability of conditions */}
                    <div className="gradient-card">
                      <div className="gradient-card-inner p-6">
                        <div className="flex justify-center mb-4">
                          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                        <h3 className="text-xl font-bold gradient-color-1 mb-3 text-center">Immutability of conditions</h3>
                        <p className="text-gray-300 text-center">
                          Nobody can exclude you from the platform, because there is no such function in the contract. And the information recorded in the network blocks cannot be changed.
                        </p>
                      </div>
                    </div>

                    {/* Transparency and Anonymity */}
                    <div className="gradient-card">
                      <div className="gradient-card-inner p-6">
                        <div className="flex justify-center mb-4">
                          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                        </div>
                        <h3 className="text-xl font-bold gradient-color-1 mb-3 text-center">Transparency and Anonymity</h3>
                        <p className="text-gray-300 text-center">
                          The smart contract is public. Anyone can see the code and the entire transaction history. This guarantees the integrity of the system and real project statistics.
                        </p>
                      </div>
                    </div>

                    {/* Decentralization */}
                    <div className="gradient-card">
                      <div className="gradient-card-inner p-6">
                        <div className="flex justify-center mb-4">
                          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                        </div>
                        <h3 className="text-xl font-bold gradient-color-1 mb-3 text-center">Decentralization</h3>
                        <p className="text-gray-300 text-center">
                          There are no managers or administrators, there are only the creators who are equal participants in the project, like everyone else.
                        </p>
                      </div>
                    </div>

                    {/* 100% online */}
                    <div className="gradient-card">
                      <div className="gradient-card-inner p-6">
                        <div className="flex justify-center mb-4">
                          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 012-2h4a2 2 0 012 2v1m-4 0a2 2 0 012 2m-6 0a2 2 0 012-2m0 0V5a2 2 0 012-2h4a2 2 0 012 2v1" />
                            </svg>
                          </div>
                        </div>
                        <h3 className="text-xl font-bold gradient-color-1 mb-3 text-center">100% online</h3>
                        <p className="text-gray-300 text-center">
                          All funds are transferred between members, there are no hidden fees. The contract balance is always zero.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* How Do I Start Earning Section */}
                <div className="mb-20">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-12 text-center">
                    How Do I Start Earning With{' '}
                    <span className="gradient-color-1">Crypto MLM Platform</span>
                    <span className="block w-24 h-1 bg-blue-gradient-primary mx-auto mt-2"></span>
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Step 1: Create Wallet */}
                    <div className="gradient-card">
                      <div className="gradient-card-inner p-8">
                        <div className="flex justify-center mb-6">
                          <div className="w-20 h-20 bg-blue-gradient-primary rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold gradient-color-1 mb-4 text-center">Create Wallet</h3>
                        <p className="text-gray-300 text-center">
                          Create a wallet Tronlink pro. Crypto MLM Platform works with Tronlink pro, Token pocket and Trust wallet.
                        </p>
                      </div>
                    </div>

                    {/* Step 2: Register */}
                    <div className="gradient-card">
                      <div className="gradient-card-inner p-8">
                        <div className="flex justify-center mb-6">
                          <div className="w-20 h-20 bg-blue-gradient-primary rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold gradient-color-1 mb-4 text-center">Register</h3>
                        <p className="text-gray-300 text-center">
                          Register on the site. If someone invited you, use his referral link. Check that your upline is correct.
                        </p>
                      </div>
                    </div>

                    {/* Step 3: Activate */}
                    <div className="gradient-card">
                      <div className="gradient-card-inner p-8">
                        <div className="flex justify-center mb-6">
                          <div className="w-20 h-20 bg-blue-gradient-primary rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                            </svg>
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold gradient-color-1 mb-4 text-center">Activate</h3>
                        <p className="text-gray-300 text-center">
                          Activate levels in Crypto MLM Platform systems to increase your income.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FAQ Section */}
                <div className="mb-20">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-12 text-center">
                    Frequently Asked Questions
                  </h2>

                  <div className="max-w-full mx-auto space-y-4">
                    {[
                      {
                        question: "WHAT IS CRYPTO MLM PLATFORM?",
                        answer: "Crypto MLM Platform is a decentralized networking platform based on smart contracts that connects people from all over the world. It operates on blockchain technology, ensuring transparency, security, and immutability of all transactions."
                      },
                      {
                        question: "WHO MANAGES THE PLATFORM?",
                        answer: "The platform is fully decentralized and operates through smart contracts. There are no managers or administrators - only creators who are equal participants in the project, just like everyone else."
                      },
                      {
                        question: "WHO CREATED CRYPTO MLM PLATFORM?",
                        answer: "Crypto MLM Platform was created by developers who are themselves participants in the platform. They have no special privileges and operate under the same conditions as all other members."
                      },
                      {
                        question: "WHAT IS A SMART CONTRACT? WHAT ARE ITS ADVANTAGES?",
                        answer: "A smart contract is a self-executing contract with the terms of the agreement directly written into code. Advantages include: automation, transparency, security, immutability, and elimination of intermediaries. Once deployed, smart contracts cannot be altered, ensuring fairness for all participants."
                      },
                      {
                        question: "WHAT IS DECENTRALIZATION?",
                        answer: "Decentralization means the platform operates without a central authority. All transactions and operations are handled by smart contracts on the blockchain, ensuring no single entity has control over the system."
                      },
                      {
                        question: "WHAT DO I NEED TO DO IN ORDER TO JOIN THE COMMUNITY?",
                        answer: "To join, you need to: 1) Create a compatible wallet (Tronlink pro, Token pocket, or Trust wallet), 2) Register on the platform using a referral link if you have one, and 3) Activate levels in the system to start earning."
                      },
                      {
                        question: "WHICH WALLET SHOULD I USE?",
                        answer: "Crypto MLM Platform works with Tronlink pro, Token pocket, and Trust wallet. You can use any of these wallets to interact with the platform."
                      },
                      {
                        question: "WHERE CAN I GET MORE INFORMATION ABOUT CRYPTO MLM PLATFORM?",
                        answer: "You can find more information on the official website, community forums, and by examining the smart contract code which is publicly available on the blockchain."
                      },
                      {
                        question: "HOW TO BUY / SELL TRON IF I HAVE NEVER DEALT WITH CRYPTOCURRENCY?",
                        answer: "You can purchase TRON through cryptocurrency exchanges like Binance, Coinbase, or other exchanges. Create an account, complete verification, deposit funds, and then buy TRON. To sell, reverse the process."
                      },
                      {
                        question: "HOW CAN I REGISTER ON THE CRYPTO MLM PLATFORM?",
                        answer: "Register by connecting your wallet to the platform. If someone invited you, use their referral link during registration. Make sure to verify that your upline (referrer) is correct before completing registration."
                      },
                      {
                        question: "CAN I REGISTER ON THE WEBSITE WITHOUT A PARTNER LINK?",
                        answer: "Yes, you can register without a partner link, but using a referral link helps establish your position in the network structure and may provide benefits for both you and your referrer."
                      },
                      {
                        question: "WHAT WILL HAPPEN TO MY ACCOUNT IF I TAKE A BREAK FROM WORKING WITH THE CRYPTO MLM COMMUNITY?",
                        answer: "Your account remains active on the blockchain. Since the platform is decentralized and operates through smart contracts, your account and data are permanently stored. You can return at any time and continue where you left off."
                      },
                      {
                        question: "I HAVE ACTIVATED THE PLATFORM, WHAT SHOULD I DO NEXT?",
                        answer: "After activation, you can start inviting others using your referral link, activate additional levels to increase your earning potential, and monitor your earnings through the dashboard. Focus on building your network and maintaining activity in the platform."
                      }
                    ].map((faq, index) => (
                      <div
                        key={index}
                        className="gradient-card overflow-hidden"
                      >
                        <div className="gradient-card-inner p-0">
                          <button
                            onClick={() => setOpenFaq(openFaq === index ? null : index)}
                            className="w-full px-6 py-4 flex items-center justify-between text-left text-white font-semibold uppercase hover:bg-blue-500/10 transition-all"
                          >
                            <span className="text-sm sm:text-base">{faq.question}</span>
                            <svg
                              className={`w-5 h-5 text-blue-400 transition-transform ${openFaq === index ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {openFaq === index && (
                            <div className="px-6 py-4 text-gray-300 border-t border-blue-500/20 bg-slate-900/30">
                              <p className="text-sm sm:text-base">{faq.answer}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </section>
    </div>
  )
}

