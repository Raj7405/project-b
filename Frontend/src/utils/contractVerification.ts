import { ethers } from 'ethers'

/**
 * Verify if a contract is deployed at the given address
 * @param provider - The ethers provider
 * @param contractAddress - The contract address to verify
 * @returns Object with verification details
 */
export async function verifyContractDeployment(
  provider: ethers.Provider,
  contractAddress: string
): Promise<{
  isDeployed: boolean
  contractAddress: string
  contractCode: string
  codeLength: number
  network: { name: string; chainId: bigint }
  blockNumber: number
  expectedAddress?: string
}> {
  const contractCode = await provider.getCode(contractAddress)
  const network = await provider.getNetwork()
  const blockNumber = await provider.getBlockNumber()
  const expectedAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS

  const isDeployed = contractCode !== '0x' && contractCode.length > 2

  return {
    isDeployed,
    contractAddress,
    contractCode,
    codeLength: contractCode.length,
    network: {
      name: network.name,
      chainId: network.chainId,
    },
    blockNumber,
    expectedAddress,
  }
}

/**
 * Print detailed contract verification information to console
 */
export async function printContractVerification(
  provider: ethers.Provider,
  contractAddress: string
): Promise<void> {
  const verification = await verifyContractDeployment(provider, contractAddress)

  console.log('\n' + '='.repeat(60))
  console.log('📋 CONTRACT DEPLOYMENT VERIFICATION')
  console.log('='.repeat(60))
  console.log(`Contract Address: ${verification.contractAddress}`)
  console.log(
    `Status: ${verification.isDeployed ? '✅ DEPLOYED' : '❌ NOT DEPLOYED'}`
  )
  console.log(
    `Code: ${verification.isDeployed ? `${verification.codeLength} bytes` : '0x (empty)'}`
  )
  console.log(`Network: ${verification.network.name}`)
  console.log(`Chain ID: ${verification.network.chainId.toString()}`)
  console.log(`Current Block: ${verification.blockNumber}`)
  if (verification.expectedAddress) {
    console.log(`Expected (from .env): ${verification.expectedAddress}`)
    const addressesMatch =
      verification.contractAddress.toLowerCase() ===
      verification.expectedAddress.toLowerCase()
    console.log(
      `Address Match: ${addressesMatch ? '✅ YES' : '❌ NO (MISMATCH!)'}`
    )
  }
  console.log('='.repeat(60) + '\n')

  if (!verification.isDeployed) {
    console.warn('⚠️  CONTRACT NOT DEPLOYED!')
    console.warn('Possible reasons:')
    console.warn('1. Hardhat node was restarted (local blockchain state reset)')
    console.warn('2. Wrong network selected in MetaMask')
    console.warn('3. Wrong contract address in .env.local')
    console.warn('\nTo fix:')
    console.warn('1. cd Contract && npx hardhat node (keep running)')
    console.warn('2. In new terminal: npx hardhat run deploy-local.js --network localhost')
    console.warn('3. Update Frontend/.env.local with new addresses')
    console.warn('4. Restart frontend: npm run dev\n')
  }
}

