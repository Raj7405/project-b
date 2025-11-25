import { ethers } from 'ethers'
import { CONTRACT_ABI } from './abis'

/**
 * Creates a read-only contract instance that doesn't require wallet connection
 * Used for reading data from the blockchain
 */
export function getReadOnlyContract() {
  try {
    // Use public RPC endpoint for reading
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-testnet.publicnode.com'
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!
    const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider)
    
    return { contract, provider }
  } catch (error) {
    console.error('Error creating read-only contract:', error)
    return { contract: null, provider: null }
  }
}

