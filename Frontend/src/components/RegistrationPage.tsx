'use client'

import { useEffect, useState } from 'react'
import { FaEdit, FaSpinner } from 'react-icons/fa'
import { useWeb3 } from '@/contexts/Web3Context'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { switchToHardhatNetwork, checkHardhatNodeRunning } from '@/utils/networkHelpers'

export default function RegistrationPage() {
  const [uplineId, setUplineId] = useState('1')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState<{
    isWalletConnecting: boolean,
    isRegistrationLoading: boolean,
    isApproving: boolean,
  }>({
    isWalletConnecting: false,
    isRegistrationLoading: false,
    isApproving: false,
  })
  const { connectWallet, account, contract, tokenContract, provider } = useWeb3()

  const handleConnectWallet = async () => {
    setLoading(prev => ({ ...prev, isWalletConnecting: true }))
    await connectWallet()
    setLoading(prev => ({ ...prev, isWalletConnecting: false }))
  }

  if (!account) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 py-12 gap-6" >
        <h1>Connect Your Wallet</h1>
        <button onClick={handleConnectWallet} className="bg-blue-gradient-primary text-white px-6 py-3 rounded-lg transition-all flex gap-2 items-center justify-center">
          Connect MetaMask
          {loading.isWalletConnecting && <FaSpinner className="animate-spin" />}
        </button>
      </div>
    )
  }

  const handleApprove = async () => {
    if (!tokenContract || !contract || !provider) {
      toast.error('Contract not initialized')
      return
    }

    try {
      setLoading(prev => ({ ...prev, isApproving: true }))
      
      // Check if contract is deployed
      const contractAddress = await contract.getAddress()
      const contractCode = await provider.getCode(contractAddress)
      const network = await provider.getNetwork()
      const blockNumber = await provider.getBlockNumber()
      const expectedChainId = BigInt(1337) // Hardhat local network (matches hardhat.config.js)

      console.log("=== Contract Deployment Verification ===")
      console.log("Contract Address:", contractAddress)
      console.log("Contract Code:", contractCode === '0x' ? '❌ EMPTY (Not deployed)' : `✅ DEPLOYED (${contractCode.length} bytes)`)
      console.log("Network:", network.name, `(Chain ID: ${network.chainId})`)
      console.log("Expected Chain ID:", expectedChainId.toString())
      console.log("Current Block:", blockNumber)
      console.log("Expected Address (from .env):", process.env.NEXT_PUBLIC_CONTRACT_ADDRESS)
      console.log("========================================")
      
      // Check if user is on the wrong network
      if (network.chainId !== expectedChainId) {
        toast.dismiss()
        
        // Check if Hardhat node is running
        const isHardhatRunning = await checkHardhatNodeRunning()
        if (!isHardhatRunning) {
          toast.error(
            `❌ Hardhat node is not running!\n\n` +
            `Please start Hardhat node first:\n` +
            `cd Contract && npx hardhat node\n\n` +
            `Then try again.`,
            { duration: 15000 }
          )
          setLoading(prev => ({ ...prev, isApproving: false }))
          return
        }

        // Try to automatically switch network
        try {
          toast.loading('Switching to Hardhat Local network...')
          await switchToHardhatNetwork()
          toast.dismiss()
          toast.success('✅ Switched to Hardhat Local network! Please try again.')
          setLoading(prev => ({ ...prev, isApproving: false }))
          // Reload page after a short delay to pick up the new network
          setTimeout(() => {
            window.location.reload()
          }, 1000)
          return
        } catch (switchError: any) {
          toast.dismiss()
          const errorMsg = `❌ Wrong Network!\n\n` +
            `You're connected to: ${network.name} (Chain ID: ${network.chainId})\n` +
            `Required: Hardhat Local (Chain ID: 1337)\n\n` +
            `Please switch to Hardhat Local network in MetaMask:\n` +
            `1) Click MetaMask network dropdown\n` +
            `2) Select "Hardhat Local" or add it:\n` +
            `   - Network Name: Hardhat Local\n` +
            `   - RPC URL: http://127.0.0.1:8545\n` +
            `   - Chain ID: 1337\n` +
            `   - Currency: ETH\n\n` +
            `Error: ${switchError.message}`
          toast.error(errorMsg, { duration: 20000 })
          setLoading(prev => ({ ...prev, isApproving: false }))
          return
        }
      }
      
      // Check if contract is deployed
      if (contractCode === '0x' || !contractCode) {
        toast.dismiss()
        const errorMsg = `❌ Contract not deployed at ${contractAddress}!\n\n` +
          `Network: ${network.name} (Chain ID: ${network.chainId})\n` +
          `Block: ${blockNumber}\n\n` +
          `⚠️ If you restarted Hardhat node, you need to redeploy:\n` +
          `1) cd Contract && npx hardhat node (keep running)\n` +
          `2) In new terminal: npx hardhat run deploy-local.js --network localhost\n` +
          `3) Update Frontend/.env.local with new addresses`
        toast.error(errorMsg, { duration: 15000 })
        setLoading(prev => ({ ...prev, isApproving: false }))
        return
      }
      
      // Get the 20 USDT amount from contract
      const entryPrice = await contract.entryPrice()
      
      toast.loading('Approving tokens...')
      // Tell USDT contract: "Allow MLM contract to spend 20 USDT"
      const tx = await tokenContract.approve(
        contractAddress, 
        entryPrice
      )
      
      // Wait for transaction to complete on blockchain
      await tx.wait()
      
      toast.dismiss()
      toast.success('✅ Approval successful! Now you can register.')
      setLoading(prev => ({ ...prev, isApproving: false }))
    } catch (error: any) {
      console.error('Approval error:', error)
      toast.dismiss()
      
      // Provide more helpful error messages
      if (error.message && error.message.includes('could not decode result data')) {
        const network = await provider.getNetwork()
        if (network.chainId !== BigInt(1337)) {
          toast.error(
            '❌ Wrong Network! Switch to Hardhat Local (Chain ID: 1337) in MetaMask. The contract is only deployed on the local network.',
            { duration: 15000 }
          )
        } else {
          toast.error(
            '❌ Contract not deployed at this address! Deploy first: 1) cd Contract, 2) npx hardhat run deploy-local.js --network localhost, 3) Update Frontend/.env.local',
            { duration: 10000 }
          )
        }
      } else {
        toast.error('❌ Approval failed: ' + (error.reason || error.message || 'Unknown error'))
      }
       
      setLoading(prev => ({ ...prev, isApproving: false }))
    }
  }

  const handleRegistration = async () => {
    if (!contract || !tokenContract || !account || !provider) {
      toast.error('Contract not initialized')
      return
    }

    // Validate upline ID
    const uplineIdNum = parseInt(uplineId, 10)
    if (isNaN(uplineIdNum) || uplineIdNum < 1) {
      toast.error('Please enter a valid upline ID (must be 1 or greater)')
      return
    }

    try {
      setLoading(prev => ({ ...prev, isRegistrationLoading: true }))

      // Check if contract is deployed
      const contractAddress = await contract.getAddress()
      const contractCode = await provider.getCode(contractAddress)
      const network = await provider.getNetwork()
      const expectedChainId = BigInt(1337) // Hardhat local network (matches hardhat.config.js)
      
      console.log("=== Registration: Contract Check ===")
      console.log("Contract Address:", contractAddress)
      console.log("Contract Code:", contractCode === '0x' ? '❌ EMPTY' : '✅ DEPLOYED')
      console.log("Network:", network.name, `(Chain ID: ${network.chainId})`)
      console.log("Expected Chain ID:", expectedChainId.toString())
      console.log("====================================")
      
      // Check if user is on the wrong network
      if (network.chainId !== expectedChainId) {
        // Check if Hardhat node is running
        const isHardhatRunning = await checkHardhatNodeRunning()
        if (!isHardhatRunning) {
          toast.error(
            `❌ Hardhat node is not running! Please start it first: cd Contract && npx hardhat node`,
            { duration: 10000 }
          )
          setLoading(prev => ({ ...prev, isRegistrationLoading: false }))
          return
        }

        // Try to automatically switch network
        try {
          toast.loading('Switching to Hardhat Local network...')
          await switchToHardhatNetwork()
          toast.dismiss()
          toast.success('✅ Switched to Hardhat Local network! Please try again.')
          setLoading(prev => ({ ...prev, isRegistrationLoading: false }))
          setTimeout(() => {
            window.location.reload()
          }, 1000)
          return
        } catch (switchError: any) {
          toast.error(
            `Wrong Network! Please switch to Hardhat Local (Chain ID: 1337) in MetaMask.\n\nError: ${switchError.message}`,
            { duration: 10000 }
          )
          setLoading(prev => ({ ...prev, isRegistrationLoading: false }))
          return
        }
      }
      
      if (contractCode === '0x' || !contractCode) {
        toast.error(
          'Contract not deployed! Please deploy the contract first. See the error message from "Approve Tokens" for instructions.',
          { duration: 6000 }
        )
        setLoading(prev => ({ ...prev, isRegistrationLoading: false }))
        return
      }

      // Check if already registered
      const userInfo = await contract.getUserInfo(account)
      if (userInfo.isActive) {
        toast.error('You are already registered!')
        setLoading(prev => ({ ...prev, isRegistrationLoading: false }))
        return
      }

      // Convert upline ID to address
      let referrerAddress: string
      try {
        referrerAddress = "0x90f79bf6eb2c4f870365e785982e1f101e93b906"
        // Check if address is valid (not zero address)
        if (!referrerAddress || referrerAddress === ethers.ZeroAddress) {
          toast.error(`Upline ID ${uplineId} does not exist or is invalid`)
          setLoading(prev => ({ ...prev, isRegistrationLoading: false }))
          return
        }
      } catch (error: any) {
        toast.error(`Invalid upline ID: ${error.reason || error.message}`)
        setLoading(prev => ({ ...prev, isRegistrationLoading: false }))
        return
      }

      // Check if referrer is active
      try {
        const referrerInfo = await contract.getUserInfo(referrerAddress)
        if (!referrerInfo.isActive) {
          toast.error('Upline is not registered or inactive')
          setLoading(prev => ({ ...prev, isRegistrationLoading: false }))
          return
        }
      } catch (error: any) {
        toast.error('Failed to verify upline status')
        setLoading(prev => ({ ...prev, isRegistrationLoading: false }))
        return
      }

      // Check if user is trying to refer themselves
      if (referrerAddress.toLowerCase() === account.toLowerCase()) {
        toast.error('Cannot refer yourself')
        setLoading(prev => ({ ...prev, isRegistrationLoading: false }))
        return
      }

      // Check allowance and balance
      const entryPrice = await contract.entryPrice()
      const allowance = await tokenContract.allowance(account, await contract.getAddress())
      const balance = await tokenContract.balanceOf(account)
      const tokenDecimals = await tokenContract.decimals()
      const contractTokenDecimals = await contract.tokenDecimals()
      
      console.log("=== Token Balance Check ===")
      console.log("Account:", account)
      console.log("Entry Price (raw):", entryPrice.toString())
      console.log("Balance (raw):", balance.toString())
      console.log("Allowance (raw):", allowance.toString())
      console.log("Token Decimals (from token contract):", tokenDecimals)
      console.log("Token Decimals (from MLM contract):", contractTokenDecimals)
      console.log("Required (Entry Price):", ethers.formatUnits(entryPrice, tokenDecimals), "tokens")
      console.log("Your Balance:", ethers.formatUnits(balance, tokenDecimals), "tokens")
      console.log("Allowance:", ethers.formatUnits(allowance, tokenDecimals), "tokens")
      console.log("Balance >= Entry Price?", balance >= entryPrice)
      console.log("===========================")
      
      if (allowance < entryPrice) {
        toast.error('Please approve tokens first. Click "Approve Tokens" button above.')
        setLoading(prev => ({ ...prev, isRegistrationLoading: false }))
        return
      }
      
      if (balance < entryPrice) {
        const required = ethers.formatUnits(entryPrice, tokenDecimals)
        const current = ethers.formatUnits(balance, tokenDecimals)
        
        // Check if this is a test account without tokens
        const isZeroBalance = balance === BigInt(0)
        
        const errorMessage = isZeroBalance
          ? `❌ No tokens in your account!\n\n` +
            `Your account (${account.substring(0, 6)}...${account.substring(38)}) has 0 tokens.\n\n` +
            `💡 Solution:\n` +
            `1. Make sure you're using the deployer account (account #0)\n` +
            `2. Or transfer tokens from the deployer account to your account\n` +
            `3. Check the Hardhat node output for test account private keys\n\n` +
            `Required: ${required} tokens\n` +
            `Your Balance: ${current} tokens`
          : `❌ Insufficient token balance!\n\n` +
            `Required: ${required} tokens\n` +
            `Your Balance: ${current} tokens\n\n` +
            `Please get more tokens to register.`
        
        toast.error(errorMessage, { duration: 20000 })
        setLoading(prev => ({ ...prev, isRegistrationLoading: false }))
        return
      }

      // Register
      toast.loading('Registering... This may take a few moments.')
      const tx = await contract.register(referrerAddress)
      await tx.wait()
      
      toast.dismiss()
      toast.success('🎉 Registration successful!')
      setLoading(prev => ({ ...prev, isRegistrationLoading: false }))
      
      // Reload page after 2 seconds to update UI
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error: any) {
      console.error('Registration error:', error)
      toast.dismiss()
      
      // Provide more helpful error messages
      const errorMessage = error.reason || error.message || 'Unknown error'
      
      if (errorMessage.includes('transfer amount exceeds balance') || 
          errorMessage.includes('ERC20: transfer amount exceeds balance')) {
        toast.error(
          `❌ Insufficient Token Balance!\n\n` +
          `You don't have enough tokens to register.\n` +
          `Please check your token balance and get more tokens.`,
          { duration: 15000 }
        )
      } else if (errorMessage.includes('allowance')) {
        toast.error(
          `❌ Insufficient Allowance!\n\n` +
          `Please approve tokens first by clicking "Approve Tokens" button.`,
          { duration: 10000 }
        )
      } else {
        toast.error('❌ Registration failed: ' + errorMessage)
      }
      
      setLoading(prev => ({ ...prev, isRegistrationLoading: false }))
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

              <div className="space-y-4">
                <button
                  onClick={handleApprove}
                  disabled={loading.isApproving || loading.isRegistrationLoading}
                  className="flex items-center justify-center space-x-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg transition-all w-full text-lg font-bold shadow-lg uppercase"
                >
                  {loading.isApproving ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      <span>APPROVING TOKENS...</span>
                    </>
                  ) : (
                    <span>1. APPROVE TOKENS</span>
                  )}
                </button>

                <button
                  onClick={handleRegistration}
                  disabled={loading.isRegistrationLoading || loading.isApproving}
                  className="flex items-center justify-center space-x-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg transition-all w-full text-lg font-bold shadow-lg uppercase"
                >
                  {loading.isRegistrationLoading ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      <span>REGISTERING...</span>
                    </>
                  ) : (
                    <span>2. AUTOMATIC REGISTRATION</span>
                  )}
                </button>
              </div>
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

