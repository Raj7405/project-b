/**
 * Helper functions for network management
 */

const HARDHAT_NETWORK = {
  chainId: '0x539', // 1337 in hex
  chainName: 'Hardhat Local',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['http://127.0.0.1:8545'],
  blockExplorerUrls: null,
}

const BSC_TESTNET = {
  chainId: '0x61', // 97 in hex
  chainName: 'BSC Testnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: [
    'https://bsc-testnet.publicnode.com',
    'https://data-seed-prebsc-1-s1.binance.org:8545',
  ],
  blockExplorerUrls: ['https://testnet.bscscan.com'],
}

/**
 * Switch to Hardhat Local network in MetaMask
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function switchToHardhatNetwork(): Promise<boolean> {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed')
  }

  try {
    // Try to switch to the network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: HARDHAT_NETWORK.chainId }],
    })
    return true
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        // Add the network
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [HARDHAT_NETWORK],
        })
        return true
      } catch (addError) {
        console.error('Failed to add network:', addError)
        throw new Error('Failed to add Hardhat Local network to MetaMask')
      }
    } else if (switchError.code === 4001) {
      // User rejected the request
      throw new Error('Network switch rejected by user')
    } else {
      console.error('Failed to switch network:', switchError)
      throw new Error('Failed to switch to Hardhat Local network')
    }
  }
}

/**
 * Switch to BSC Testnet in MetaMask
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function switchToBSCTestnet(): Promise<boolean> {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed')
  }

  try {
    // Try to switch to the network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BSC_TESTNET.chainId }],
    })
    return true
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        // Add the network
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [BSC_TESTNET],
        })
        return true
      } catch (addError) {
        console.error('Failed to add network:', addError)
        throw new Error('Failed to add BSC Testnet to MetaMask')
      }
    } else if (switchError.code === 4001) {
      // User rejected the request
      throw new Error('Network switch rejected by user')
    } else {
      console.error('Failed to switch network:', switchError)
      throw new Error('Failed to switch to BSC Testnet')
    }
  }
}

/**
 * Check if Hardhat node is running by attempting to fetch the chain ID
 * @returns Promise<boolean> - true if Hardhat node is accessible
 */
export async function checkHardhatNodeRunning(): Promise<boolean> {
  try {
    const response = await fetch('http://127.0.0.1:8545', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 1,
      }),
    })
    const data = await response.json()
    return data.result === '0x539' // 1337 in hex
  } catch (error) {
    return false
  }
}

