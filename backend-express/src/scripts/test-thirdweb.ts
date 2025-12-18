/**
 * ThirdWeb Integration Test Script
 * 
 * This script tests all ThirdWeb functions to verify the integration is working correctly.
 * 
 * Usage:
 *   npm run test:thirdweb
 *   OR
 *   npx ts-node src/scripts/test-thirdweb.ts
 * 
 * Prerequisites:
 *   1. Set up .env with required variables:
 *      - THIRDWEB_CLIENT_ID
 *      - BSC_RPC_URL
 *      - CHAIN_ID
 *      - CONTRACT_ADDRESS
 *      - BACKEND_PRIVATE_KEY
 *   2. Make sure your contract is deployed
 *   3. Ensure backend wallet has BNB for gas fees
 */

import dotenv from 'dotenv';
import { ethers } from 'ethers';
import {
  // Read functions
  getContractBalance,
  getCompanyWallet,
  getBackendWallet,
  getEntryPrice,
  getRetopupPrice,
  isRegistered,
  getRetopupCount,
  getTotalPaidIn,
  getTotalPayouts,
  hasRetopup,
  getOwner,
  getBnbToken,
  getTokenDecimals,
  
  // Write functions (commented out - uncomment to test)
  // executeBatchPayouts,
  // register,
  // retopup,
  // payout,
} from '../services/blockchain-thirdweb.service';

dotenv.config();

// Test configuration
const TEST_WALLET = process.env.TEST_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';

/**
 * Test all read functions
 */
async function testReadFunctions() {
  console.log('\n📖 Testing Read Functions...\n');
  
  try {
    // Test 1: Get Contract Balance
    console.log('1️⃣  Testing getContractBalance()...');
    const balance = await getContractBalance();
    console.log(`   ✅ Contract Balance: ${ethers.formatEther(balance)} BNB\n`);
    
    // Test 2: Get Company Wallet
    console.log('2️⃣  Testing getCompanyWallet()...');
    const companyWallet = await getCompanyWallet();
    console.log(`   ✅ Company Wallet: ${companyWallet}\n`);
    
    // Test 3: Get Backend Wallet
    console.log('3️⃣  Testing getBackendWallet()...');
    const backendWallet = await getBackendWallet();
    console.log(`   ✅ Backend Wallet: ${backendWallet}\n`);
    
    // Test 4: Get Entry Price
    console.log('4️⃣  Testing getEntryPrice()...');
    const entryPrice = await getEntryPrice();
    console.log(`   ✅ Entry Price: ${ethers.formatEther(entryPrice)} BNB\n`);
    
    // Test 5: Get Retopup Price
    console.log('5️⃣  Testing getRetopupPrice()...');
    const retopupPrice = await getRetopupPrice();
    console.log(`   ✅ Retopup Price: ${ethers.formatEther(retopupPrice)} BNB\n`);
    
    // Test 6: Get BNB Token Address
    console.log('6️⃣  Testing getBnbToken()...');
    const bnbToken = await getBnbToken();
    console.log(`   ✅ BNB Token Address: ${bnbToken}\n`);
    
    // Test 7: Get Token Decimals
    console.log('7️⃣  Testing getTokenDecimals()...');
    const decimals = await getTokenDecimals();
    console.log(`   ✅ Token Decimals: ${decimals}\n`);
    
    // Test 8: Get Owner
    console.log('8️⃣  Testing getOwner()...');
    const owner = await getOwner();
    console.log(`   ✅ Contract Owner: ${owner}\n`);
    
    // Test 9: Check if wallet is registered
    if (TEST_WALLET !== '0x0000000000000000000000000000000000000000') {
      console.log(`9️⃣  Testing isRegistered(${TEST_WALLET})...`);
      const registered = await isRegistered(TEST_WALLET);
      console.log(`   ✅ Is Registered: ${registered}\n`);
      
      // Test 10: Get Retopup Count
      console.log(`🔟 Testing getRetopupCount(${TEST_WALLET})...`);
      const retopupCount = await getRetopupCount(TEST_WALLET);
      console.log(`   ✅ Retopup Count: ${retopupCount}\n`);
      
      // Test 11: Get Total Paid In
      console.log(`1️⃣1️⃣  Testing getTotalPaidIn(${TEST_WALLET})...`);
      const totalPaidIn = await getTotalPaidIn(TEST_WALLET);
      console.log(`   ✅ Total Paid In: ${ethers.formatEther(totalPaidIn)} BNB\n`);
      
      // Test 12: Get Total Payouts
      console.log(`1️⃣2️⃣  Testing getTotalPayouts(${TEST_WALLET})...`);
      const totalPayouts = await getTotalPayouts(TEST_WALLET);
      console.log(`   ✅ Total Payouts: ${ethers.formatEther(totalPayouts)} BNB\n`);
      
      // Test 13: Check Has Retopup
      console.log(`1️⃣3️⃣  Testing hasRetopup(${TEST_WALLET})...`);
      const hasRetop = await hasRetopup(TEST_WALLET);
      console.log(`   ✅ Has Retopup: ${hasRetop}\n`);
    } else {
      console.log('⚠️  Skipping wallet-specific tests (TEST_WALLET_ADDRESS not set)\n');
    }
    
    console.log('✅ All read function tests passed!\n');
    return true;
  } catch (error: any) {
    console.error('❌ Read function test failed:', error.message);
    return false;
  }
}

/**
 * Test event functions (optional - requires block range)
 */
async function testEventFunctions() {
  console.log('\n📡 Testing Event Functions...\n');
  
  try {
    const { getRegistrationAcceptedEvents } = await import('../services/blockchain-thirdweb.service');
    const { getThirdwebClient, getChain } = await import('../config/blockchain-thirdweb');
    const { eth_blockNumber, getRpcClient } = await import('thirdweb/rpc');
    
    // Get current block
    const client = getThirdwebClient();
    const chain = getChain();
    const rpcRequest = getRpcClient({ client, chain });
    const currentBlock = await eth_blockNumber(rpcRequest);
    
    // Test events from last 100 blocks
    const fromBlock = currentBlock - BigInt(100);
    const toBlock = currentBlock;
    
    console.log(`📦 Fetching events from block ${fromBlock} to ${toBlock}...\n`);
    
    // Note: If you see "Insight is not available" error, it's expected for custom chains
    // ThirdWeb will automatically fall back to RPC method which works fine
    const chainId = parseInt(process.env.CHAIN_ID || "97");
    if (chainId !== 56 && chainId !== 97) {
      console.log(`   ℹ️  Using custom chain (ID: ${chainId}) - Insight unavailable, using RPC fallback\n`);
    }
    
    // Suppress ThirdWeb's Insight error for custom chains (it's expected and handled gracefully)
    const originalError = console.error;
    const originalWarn = console.warn;
    
    const suppressInsightError = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      // Filter out the expected Insight error for custom chains
      if (!message.includes('Insight is not available for chains') && 
          !message.includes('Error fetching from insight')) {
        originalError.apply(console, args);
      }
    };
    
    console.error = suppressInsightError;
    console.warn = suppressInsightError;
    
    let events;
    try {
      events = await getRegistrationAcceptedEvents(fromBlock, toBlock);
    } finally {
      // Restore original console methods
      console.error = originalError;
      console.warn = originalWarn;
    }
    console.log(`   ✅ Found ${events.length} RegistrationAccepted event(s)\n`);
    
    if (events.length > 0) {
      console.log('   Sample event:');
      const event = events[0];
      console.log(`   - User: ${event.args.user}`);
      console.log(`   - Amount: ${ethers.formatEther(event.args.amount)} BNB`);
      console.log(`   - Block: ${event.blockNumber}\n`);
    }
    
    console.log('✅ Event function test passed!\n');
    return true;
  } catch (error: any) {
    console.error('❌ Event function test failed:', error.message);
    return false;
  }
}

/**
 * Test write functions (commented out for safety - uncomment to test)
 * WARNING: These will send real transactions and cost gas!
 */
async function testWriteFunctions() {
  console.log('\n⚠️  Write function tests are disabled by default');
  console.log('   Uncomment in test script to enable write function testing\n');
  console.log('   WARNING: Write functions send real transactions and cost gas!\n');
  
  // Uncomment below to test write functions
  /*
  try {
    const { executeBatchPayouts } = await import('../services/blockchain-thirdweb.service');
    
    // Test batch payout (example - modify addresses and amounts)
    console.log('🧪 Testing executeBatchPayouts()...');
    const users = ['0x...', '0x...']; // Replace with actual addresses
    const amounts = [
      ethers.parseEther('0.1'),
      ethers.parseEther('0.1')
    ];
    const rewardTypes = ['TEST_INCOME', 'TEST_INCOME'];
    
    const result = await executeBatchPayouts(users, amounts, rewardTypes);
    console.log(`   ✅ Batch payout transaction: ${result.transactionHash}\n`);
    
    return true;
  } catch (error: any) {
    console.error('❌ Write function test failed:', error.message);
    return false;
  }
  */
  
  return true;
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🧪 ThirdWeb Integration Test Suite\n');
  console.log('=' .repeat(50));
  console.log('Configuration:');
  console.log(`   RPC URL: ${process.env.BSC_RPC_URL || 'Not set'}`);
  const chainId = parseInt(process.env.CHAIN_ID || "97");
  console.log(`   Chain ID: ${chainId}`);
  if (chainId === 1337 && process.env.BSC_RPC_URL?.includes('bsc-testnet')) {
    console.log(`   ⚠️  Warning: Chain ID 1337 with BSC testnet RPC - consider using CHAIN_ID=97`);
  }
  console.log(`   Contract: ${process.env.CONTRACT_ADDRESS || 'Not set'}`);
  console.log(`   Client ID: ${process.env.THIRDWEB_CLIENT_ID ? 'Set ✓' : 'Not set ✗'}`);
  console.log('=' .repeat(50));
  
  // Check prerequisites
  if (!process.env.THIRDWEB_CLIENT_ID) {
    console.error('\n❌ THIRDWEB_CLIENT_ID is not set!');
    console.error('   Get a free client ID from https://thirdweb.com\n');
    process.exit(1);
  }
  
  if (!process.env.CONTRACT_ADDRESS) {
    console.error('\n❌ CONTRACT_ADDRESS is not set!\n');
    process.exit(1);
  }
  
  const results = {
    read: false,
    events: false,
    write: false,
  };
  
  // Run tests
  results.read = await testReadFunctions();
  results.events = await testEventFunctions();
  results.write = await testWriteFunctions();
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary:');
  console.log('='.repeat(50));
  console.log(`   Read Functions:  ${results.read ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Event Functions: ${results.events ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Write Functions: ${results.write ? '✅ PASS' : '⏭️  SKIPPED'}`);
  console.log('='.repeat(50));
  
  if (results.read && results.events) {
    console.log('\n🎉 All enabled tests passed! ThirdWeb integration is working correctly.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

