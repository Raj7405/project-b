import { createThirdwebClient, getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import { bsc, bscTestnet, defineChain } from "thirdweb/chains";
import dotenv from "dotenv";

dotenv.config();

/**
 * Creates and returns a ThirdWeb client instance configured for BSC network.
 * The client is used for all blockchain interactions via ThirdWeb SDK.
 * 
 * @returns {ThirdwebClient} Configured ThirdWeb client
 * @throws {Error} If required environment variables are missing
 */
export const getThirdwebClient = () => {
  const clientId = process.env.THIRDWEB_CLIENT_ID;
  const secretKey = process.env.THIRDWEB_SECRET_KEY;
  
  // ThirdWeb requires either clientId or secretKey
  // Get a free client ID from https://thirdweb.com
  if (clientId) {
    return createThirdwebClient({ clientId });
  }
  
  if (secretKey) {
    return createThirdwebClient({ secretKey });
  }
  
  // If neither is provided, throw an error with helpful message
  throw new Error(
    "THIRDWEB_CLIENT_ID or THIRDWEB_SECRET_KEY must be set in environment variables. " +
    "Get a free client ID from https://thirdweb.com"
  );
};

/**
 * Gets the appropriate chain configuration based on environment.
 * Supports BSC Mainnet (chainId: 56) and BSC Testnet (chainId: 97).
 * 
 * @returns {Chain} Chain configuration object
 * @throws {Error} If chain ID is not supported
 */
export const getChain = () => {
  const chainId = parseInt(process.env.CHAIN_ID || "97");
  const rpcUrl = process.env.BSC_RPC_URL;
  
  // If custom RPC URL is provided, use it for all chains
  if (rpcUrl && rpcUrl !== 'http://127.0.0.1:8545') {
    if (chainId === 56) {
      // BSC Mainnet with custom RPC
      return defineChain({
        id: 56,
        rpc: rpcUrl,
      });
    } else if (chainId === 97) {
      // BSC Testnet with custom RPC
      return defineChain({
        id: 97,
        rpc: rpcUrl,
      });
    } else {
      // Custom chain with custom RPC
      return defineChain({
        id: chainId,
        rpc: rpcUrl,
      });
    }
  }
  
  // Use built-in chain definitions if no custom RPC or using localhost
  if (chainId === 56) {
    return bsc;
  } else if (chainId === 97) {
    return bscTestnet;
  } else {
    // For localhost/Hardhat (chainId 31337 or other local chains)
    const localRpcUrl = rpcUrl || 'http://127.0.0.1:8545';
    return defineChain({
      id: chainId,
      rpc: localRpcUrl,
    });
  }
};

/**
 * Creates and returns a wallet account from the backend private key.
 * This account is used to sign transactions for contract interactions.
 * 
 * @returns {Account} Wallet account instance
 * @throws {Error} If BACKEND_PRIVATE_KEY is not set in environment
 */
export const getBackendAccount = () => {
  const privateKey = process.env.BACKEND_PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error("BACKEND_PRIVATE_KEY not set in environment");
  }
  
  // Remove '0x' prefix if present
  const cleanPrivateKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  
  return privateKeyToAccount({
    client: getThirdwebClient(),
    privateKey: cleanPrivateKey,
  });
};

/**
 * Gets a contract instance using ThirdWeb SDK.
 * This contract instance is used for both read and write operations.
 * 
 * @returns {Contract} Contract instance
 * @throws {Error} If CONTRACT_ADDRESS is not set in environment
 */
export const getThirdwebContract = () => {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS not set in environment");
  }
  
  return getContract({
    client: getThirdwebClient(),
    chain: getChain(),
    address: contractAddress,
  });
};

/**
 * Executes batch payouts using ThirdWeb SDK.
 * This function prepares and sends a batch payout transaction to the smart contract.
 * 
 * @param {string[]} users - Array of user wallet addresses to receive payouts
 * @param {bigint[]} amounts - Array of payout amounts in wei (must match users array length)
 * @param {string[]} rewardTypes - Array of reward type strings (must match users array length)
 * @returns {Promise<{transactionHash: string, receipt: any}>} Transaction hash and receipt
 * @throws {Error} If arrays have mismatched lengths or transaction fails
 * 
 * @example
 * const { transactionHash } = await executeBatchPayoutsThirdweb(
 *   ["0x123...", "0x456..."],
 *   [ethers.parseEther("10"), ethers.parseEther("5")],
 *   ["DIRECT_INCOME", "COMPANY_FEE"]
 * );
 */
export const executeBatchPayoutsThirdweb = async (
  users: string[],
  amounts: bigint[],
  rewardTypes: string[]
): Promise<{ transactionHash: string; receipt: any }> => {
  // Validate input arrays have matching lengths
  if (users.length !== amounts.length || amounts.length !== rewardTypes.length) {
    throw new Error(
      `Array length mismatch: users=${users.length}, amounts=${amounts.length}, rewardTypes=${rewardTypes.length}`
    );
  }
  
  // Validate arrays are not empty
  if (users.length === 0) {
    throw new Error("Cannot execute batch payout with empty arrays");
  }
  
  // Validate batch size (contract limit is 50)
  if (users.length > 50) {
    throw new Error(`Batch size exceeds contract limit: ${users.length} > 50`);
  }
  
  const contract = getThirdwebContract();
  const account = getBackendAccount();
  
  try {
    // Prepare the contract call
    const transaction = await prepareContractCall({
      contract,
      method: "function executeBatchPayouts(address[] users, uint256[] amounts, string[] rewardTypes)",
      params: [users, amounts, rewardTypes],
    });
    
    // Send the transaction
    const result = await sendTransaction({
      transaction,
      account,
    });
    
    console.log(`📤 ThirdWeb batch payout transaction sent: ${result.transactionHash}`);
    
    // Note: sendTransaction returns transactionHash immediately
    // The transaction is sent and will be confirmed on-chain
    // You can use waitForReceipt from 'thirdweb' if you need to wait for confirmation
    
    return {
      transactionHash: result.transactionHash,
      receipt: null, // Receipt not available immediately, use waitForReceipt if needed
    };
  } catch (error: any) {
    // Enhanced error handling with context
    const errorMessage = error?.message || "Unknown error";
    const errorCode = error?.code || "UNKNOWN";
    
    console.error("❌ ThirdWeb batch payout failed:", {
      error: errorMessage,
      code: errorCode,
      users: users.length,
      totalAmount: amounts.reduce((sum, amt) => sum + amt, BigInt(0)).toString(),
    });
    
    // Re-throw with more context
    throw new Error(`Failed to execute batch payout via ThirdWeb: ${errorMessage}`);
  }
};

