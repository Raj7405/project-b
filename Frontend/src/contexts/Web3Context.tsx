'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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
  connectWallet: async () => {},
  disconnectWallet: () => {},
})

export const useWeb3 = () => useContext(Web3Context)

export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [tokenContract, setTokenContract] = useState<ethers.Contract | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [isOwner, setIsOwner] = useState(false)

  const connectWallet = async () => {
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

      // Check if user is owner
      const owner = await contract.owner()
      const isOwner = owner.toLowerCase() === accounts[0].toLowerCase()

      setAccount(accounts[0])
      setProvider(provider)
      setSigner(signer)
      setContract(contract)
      setTokenContract(tokenContract)
      setChainId(Number(network.chainId))
      setIsOwner(isOwner)

      toast.success('Wallet connected!')
    } catch (error: any) {
      console.error('Connection error:', error)
      toast.error(error.message || 'Failed to connect wallet')
    }
  }

  const disconnectWallet = () => {
    setAccount(null)
    setProvider(null)
    setSigner(null)
    setContract(null)
    setTokenContract(null)
    setChainId(null)
    setIsOwner(false)
    toast.success('Wallet disconnected')
  }

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          connectWallet()
        } else {
          disconnectWallet()
        }
      })

      window.ethereum.on('chainChanged', () => {
        window.location.reload()
      })
    }
  }, [])

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
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </Web3Context.Provider>
  )
}

