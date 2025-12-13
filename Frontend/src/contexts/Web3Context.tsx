'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { CONTRACT_ABI, TOKEN_ABI } from '@/utils/abis'

interface Web3ContextType {
  account: string | null
  provider: ethers.BrowserProvider | null
  signer: ethers.Signer | null
  contract: ethers.Contract | null
  tokenContract: ethers.Contract | null
  chainId: number | null
  isOwner: boolean
  isInitializing: boolean
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
}

const Web3Context = createContext<Web3ContextType>({
  account: null,
  provider: null,
  signer: null,
  contract: null,
  tokenContract: null,
  chainId: null,
  isOwner: false,
  isInitializing: true,
  connectWallet: async () => {},
  disconnectWallet: () => {},
})

export const  useWeb3 = () => useContext(Web3Context)

export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [tokenContract, setTokenContract] = useState<ethers.Contract | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  const connectWallet = useCallback(async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        toast.error('Please install MetaMask!')
        return
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const accounts = await provider.send('eth_requestAccounts', [])
      const signer = await provider.getSigner()
      const network = await provider.getNetwork()

      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!
      const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS!

      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer)
      const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, signer)

      // Check if contract is actually deployed (has code)
      const contractCode = await provider.getCode(contractAddress)
      // if (contractCode === '0x') {
      //   toast.error('No contract found at this address! Please deploy contracts first.')
      //   throw new Error('Contract not deployed at the specified address.')
      // }

      // Check if user is company wallet (ID 1)
      let isOwner = false
      try {
        const companyWallet = await contract.companyWallet()
        isOwner = companyWallet.toLowerCase() === accounts[0].toLowerCase()
      } catch (error: any) {
        console.warn('Could not fetch company wallet:', error.message)
        // Continue anyway - not critical for wallet connection
      }

      // Normalize wallet address to lowercase for consistency across the app
      const walletAddress = accounts[0].toLowerCase()
      setAccount(walletAddress)
      setProvider(provider)
      setSigner(signer)
      setContract(contract)
      setTokenContract(tokenContract)
      setChainId(Number(network.chainId))
      setIsOwner(isOwner)

      // Persist wallet connection
      localStorage.setItem('walletAddress', walletAddress)
      localStorage.setItem('walletConnected', 'true')

      toast.success('Wallet connected!')
    } catch (error: any) {
      console.error('Connection error:', error)
      toast.error(error.message || 'Failed to connect wallet')
    }
  }, [])

  const disconnectWallet = () => {
    setAccount(null)
    setProvider(null)
    setSigner(null)
    setContract(null)
    setTokenContract(null)
    setChainId(null)
    setIsOwner(false)
    // Clear persisted wallet connection
    localStorage.removeItem('walletAddress')
    localStorage.removeItem('walletConnected')
    toast.success('Wallet disconnected')
  }

  // Restore wallet connection on mount
  useEffect(() => {
    const restoreConnection = async () => {
      if (typeof window.ethereum === 'undefined') {
        setIsInitializing(false)
        return
      }

      try {
        // Check if wallet was previously connected
        const wasConnected = localStorage.getItem('walletConnected') === 'true'
        const savedAddress = localStorage.getItem('walletAddress')

        if (wasConnected && savedAddress) {
          // Check if MetaMask is still connected to this address
          const provider = new ethers.BrowserProvider(window.ethereum)
          const accounts = await provider.send('eth_accounts', [])
          
          if (accounts.length > 0) {
            const currentAddress = accounts[0].toLowerCase()
            
            // If same address, restore connection silently
            if (currentAddress === savedAddress.toLowerCase()) {
              const signer = await provider.getSigner()
              const network = await provider.getNetwork()

              const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!
              const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS!

              const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer)
              const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, signer)

              // Check if user is company wallet
              let isOwner = false
              try {
                const companyWallet = await contract.companyWallet()
                isOwner = companyWallet.toLowerCase() === currentAddress
              } catch (error: any) {
                console.warn('Could not fetch company wallet:', error.message)
              }

              setAccount(currentAddress)
              setProvider(provider)
              setSigner(signer)
              setContract(contract)
              setTokenContract(tokenContract)
              setChainId(Number(network.chainId))
              setIsOwner(isOwner)
              
              console.log('✅ Wallet connection restored:', currentAddress)
            } else {
              // Different address, clear saved connection
              localStorage.removeItem('walletAddress')
              localStorage.removeItem('walletConnected')
            }
          } else {
            // No accounts connected, clear saved connection
            localStorage.removeItem('walletAddress')
            localStorage.removeItem('walletConnected')
          }
        }
      } catch (error) {
        console.error('Error restoring wallet connection:', error)
        // Clear invalid saved connection
        localStorage.removeItem('walletAddress')
        localStorage.removeItem('walletConnected')
      } finally {
        setIsInitializing(false)
      }
    }

    restoreConnection()
  }, [])

  // Listen for account and chain changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          connectWallet()
        } else {
          disconnectWallet()
        }
      }

      const handleChainChanged = () => {
        window.location.reload()
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [connectWallet])

  // Log wallet info for debugging
  useEffect(() => {
    if (account) {
      console.log("🔐 Connected Wallet Address:", account)
      console.log("🌐 Network Chain ID:", chainId)
      console.log("👤 Is Owner:", isOwner)
    }
  }, [account, chainId, isOwner])
  return (
    <Web3Context.Provider
      value={{
        account,
        provider,
        signer,
        contract,
        tokenContract,
        chainId,
        isOwner,
        isInitializing,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </Web3Context.Provider>
  )
}

