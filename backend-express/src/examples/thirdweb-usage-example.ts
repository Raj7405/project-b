/**
 * ThirdWeb Integration Example
 * 
 * This file demonstrates how to use ThirdWeb SDK for batch payouts.
 * 
 * Prerequisites:
 * 1. Install ThirdWeb: npm install thirdweb
 * 2. Set USE_THIRDWEB=true in .env
 * 3. Set CHAIN_ID (56 for BSC Mainnet, 97 for BSC Testnet)
 * 
 * Usage:
 * The payout-distribution.service.ts automatically uses ThirdWeb when
 * USE_THIRDWEB=true is set in environment variables.
 */

import { executeBatchPayoutsThirdweb } from '../config/blockchain-thirdweb';
import { ethers } from 'ethers';

/**
 * Example: Execute batch payouts using ThirdWeb
 * 
 * This example shows how to manually call the ThirdWeb batch payout function.
 * In production, this is handled automatically by the payout-distribution.service.ts
 */
async function exampleBatchPayout() {
  try {
    // Example data
    const users = [
      '0x1234567890123456789012345678901234567890',
      '0x0987654321098765432109876543210987654321',
    ];
    
    // Convert BNB amounts to wei (18 decimals)
    const amounts = [
      ethers.parseEther('10.0'),  // 10 BNB
      ethers.parseEther('5.0'),    // 5 BNB
    ];
    
    const rewardTypes = [
      'DIRECT_INCOME',
      'COMPANY_FEE',
    ];
    
    console.log('🚀 Executing batch payout with ThirdWeb...');
    console.log(`   Users: ${users.length}`);
    console.log(`   Total amount: ${ethers.formatEther(
      amounts.reduce((sum, amt) => sum + amt, BigInt(0))
    )} BNB`);
    
    // Execute the batch payout
    const result = await executeBatchPayoutsThirdweb(
      users,
      amounts,
      rewardTypes
    );
    
    console.log('✅ Batch payout successful!');
    console.log(`   Transaction Hash: ${result.transactionHash}`);
    console.log(`   Block Number: ${result.receipt?.blockNumber || 'N/A'}`);
    
    return result;
  } catch (error: any) {
    console.error('❌ Batch payout failed:', error.message);
    throw error;
  }
}

/**
 * How ThirdWeb Works:
 * 
 * 1. prepareContractCall():
 *    - Validates the method signature matches the contract
 *    - Encodes the function parameters (users, amounts, rewardTypes)
 *    - Creates a transaction object ready to be sent
 *    - Does NOT execute the transaction yet
 * 
 * 2. sendTransaction():
 *    - Takes the prepared transaction
 *    - Estimates gas automatically
 *    - Signs the transaction with the backend wallet
 *    - Broadcasts to the blockchain network
 *    - Waits for confirmation (by default)
 *    - Returns transaction hash and receipt
 * 
 * Benefits over ethers.js:
 * - Simpler API: Less boilerplate code
 * - Better error messages: More descriptive errors
 * - Automatic gas estimation: No need to manually estimate
 * - Better TypeScript support: Stronger type safety
 * - Transaction status tracking: Built-in status updates
 * 
 * Example Flow:
 * 
 * User Registration → processRegistrationPayout() 
 *   → executeBatchPayouts() [helper function]
 *     → executeBatchPayoutsThirdweb() [if USE_THIRDWEB=true]
 *       → prepareContractCall() [prepares transaction]
 *       → sendTransaction() [sends and confirms]
 *         → Returns { transactionHash, receipt }
 */

export { exampleBatchPayout };

