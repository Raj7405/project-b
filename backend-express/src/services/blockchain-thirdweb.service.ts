/**
 * ThirdWeb Blockchain Service
 * 
 * This service provides all contract interaction functions using ThirdWeb SDK.
 * It replaces ethers.js for all read, write, and event operations.
 * 
 * All functions use the ThirdWeb SDK for better error handling, type safety,
 * and simpler API compared to raw ethers.js.
 */

import { 
  prepareContractCall, 
  sendTransaction, 
  readContract,
  prepareEvent,
  getContractEvents
} from "thirdweb";
import type { Account } from "thirdweb/wallets";
import { getThirdwebContract, getBackendAccount } from '../config/blockchain-thirdweb';
import { ethers } from 'ethers';

// ============================================================================
// WRITE FUNCTIONS (Transactions)
// ============================================================================

/**
 * Executes a single payout to a user.
 * 
 * @param {string} user - User wallet address to receive payout
 * @param {bigint} amount - Amount in wei to payout
 * @param {string} rewardType - Type of reward (e.g., "DIRECT_INCOME", "LEVEL_INCOME")
 * @returns {Promise<{transactionHash: string, receipt: any}>} Transaction result
 */
export const payout = async (
  user: string,
  amount: bigint,
  rewardType: string
): Promise<{ transactionHash: string; receipt: any }> => {
  const contract = getThirdwebContract();
  const account = getBackendAccount();

  const transaction = await prepareContractCall({
    contract,
    method: "function payout(address user, uint256 amount, string rewardType)",
    params: [user, amount, rewardType],
  });

  const result = await sendTransaction({
    transaction,
    account,
  });

  return {
    transactionHash: result.transactionHash,
    receipt: null, // Receipt not available immediately, use waitForReceipt if needed
  };
};

/**
 * Registers a new user in the contract.
 * 
 * @param {string} user - User wallet address to register
 * @param {bigint} amount - Registration amount in wei
 * @returns {Promise<{transactionHash: string, receipt: any}>} Transaction result
 */
export const register = async (
  user: string,
  amount: bigint
): Promise<{ transactionHash: string; receipt: any }> => {
  const contract = getThirdwebContract();
  const account = getBackendAccount();

  const transaction = await prepareContractCall({
    contract,
    method: "function register(address user, uint256 amount)",
    params: [user, amount],
  });

  const result = await sendTransaction({
    transaction,
    account,
  });

  return {
    transactionHash: result.transactionHash,
    receipt: null, // Receipt not available immediately, use waitForReceipt if needed
  };
};

/**
 * Processes a retopup for a user.
 * 
 * @param {string} user - User wallet address
 * @param {bigint} amount - Retopup amount in wei
 * @returns {Promise<{transactionHash: string, receipt: any}>} Transaction result
 */
export const retopup = async (
  user: string,
  amount: bigint
): Promise<{ transactionHash: string; receipt: any }> => {
  const contract = getThirdwebContract();
  const account = getBackendAccount();

  const transaction = await prepareContractCall({
    contract,
    method: "function retopup(address user, uint256 amount)",
    params: [user, amount],
  });

  const result = await sendTransaction({
    transaction,
    account,
  });

  return {
    transactionHash: result.transactionHash,
    receipt: null, // Receipt not available immediately, use waitForReceipt if needed
  };
};

/**
 * Executes batch payouts to multiple users.
 * 
 * @param {string[]} users - Array of user wallet addresses
 * @param {bigint[]} amounts - Array of amounts in wei (must match users length)
 * @param {string[]} rewardTypes - Array of reward types (must match users length)
 * @returns {Promise<{transactionHash: string, receipt: any}>} Transaction result
 */
export const executeBatchPayouts = async (
  users: string[],
  amounts: bigint[],
  rewardTypes: string[]
): Promise<{ transactionHash: string; receipt: any }> => {
  if (users.length !== amounts.length || amounts.length !== rewardTypes.length) {
    throw new Error(
      `Array length mismatch: users=${users.length}, amounts=${amounts.length}, rewardTypes=${rewardTypes.length}`
    );
  }

  if (users.length === 0) {
    throw new Error("Cannot execute batch payout with empty arrays");
  }

  if (users.length > 50) {
    throw new Error(`Batch size exceeds contract limit: ${users.length} > 50`);
  }

  const contract = getThirdwebContract();
  const account = getBackendAccount();

  const transaction = await prepareContractCall({
    contract,
    method: "function executeBatchPayouts(address[] users, uint256[] amounts, string[] rewardTypes)",
    params: [users, amounts, rewardTypes],
  });

  const result = await sendTransaction({
    transaction,
    account,
  });

  return {
    transactionHash: result.transactionHash,
    receipt: null, // Receipt not available immediately, use waitForReceipt if needed
  };
};

/**
 * Withdraws company share from the contract.
 * 
 * @param {bigint} amount - Amount in wei to withdraw
 * @param {string} recipient - Recipient address (optional, defaults to company wallet)
 * @returns {Promise<{transactionHash: string, receipt: any}>} Transaction result
 */
export const withdrawCompanyShare = async (
  amount: bigint,
  recipient?: string
): Promise<{ transactionHash: string; receipt: any }> => {
  const contract = getThirdwebContract();
  const account = getBackendAccount();

  const transaction = await prepareContractCall({
    contract,
    method: "function withdrawCompanyShare(uint256 amount, address recipient)",
    params: [amount, recipient || ethers.ZeroAddress],
  });

  const result = await sendTransaction({
    transaction,
    account,
  });

  return {
    transactionHash: result.transactionHash,
    receipt: null, // Receipt not available immediately, use waitForReceipt if needed
  };
};

/**
 * Updates the backend wallet address.
 * 
 * @param {string} newBackendWallet - New backend wallet address
 * @returns {Promise<{transactionHash: string, receipt: any}>} Transaction result
 */
export const updateBackendWallet = async (
  newBackendWallet: string
): Promise<{ transactionHash: string; receipt: any }> => {
  const contract = getThirdwebContract();
  const account = getBackendAccount();

  const transaction = await prepareContractCall({
    contract,
    method: "function updateBackendWallet(address newBackendWallet)",
    params: [newBackendWallet],
  });

  const result = await sendTransaction({
    transaction,
    account,
  });

  return {
    transactionHash: result.transactionHash,
    receipt: null, // Receipt not available immediately, use waitForReceipt if needed
  };
};

/**
 * Updates the company wallet address.
 * 
 * @param {string} newCompanyWallet - New company wallet address
 * @returns {Promise<{transactionHash: string, receipt: any}>} Transaction result
 */
export const updateCompanyWallet = async (
  newCompanyWallet: string
): Promise<{ transactionHash: string; receipt: any }> => {
  const contract = getThirdwebContract();
  const account = getBackendAccount();

  const transaction = await prepareContractCall({
    contract,
    method: "function updateCompanyWallet(address newCompanyWallet)",
    params: [newCompanyWallet],
  });

  const result = await sendTransaction({
    transaction,
    account,
  });

  return {
    transactionHash: result.transactionHash,
    receipt: null, // Receipt not available immediately, use waitForReceipt if needed
  };
};

/**
 * Rescues external tokens from the contract.
 * 
 * @param {string} token - Token contract address to rescue
 * @param {bigint} amount - Amount in wei to rescue
 * @param {string} recipient - Recipient address
 * @returns {Promise<{transactionHash: string, receipt: any}>} Transaction result
 */
export const rescueExternalToken = async (
  token: string,
  amount: bigint,
  recipient: string
): Promise<{ transactionHash: string; receipt: any }> => {
  const contract = getThirdwebContract();
  const account = getBackendAccount();

  const transaction = await prepareContractCall({
    contract,
    method: "function rescueExternalToken(address token, uint256 amount, address recipient)",
    params: [token, amount, recipient],
  });

  const result = await sendTransaction({
    transaction,
    account,
  });

  return {
    transactionHash: result.transactionHash,
    receipt: null, // Receipt not available immediately, use waitForReceipt if needed
  };
};

// ============================================================================
// READ FUNCTIONS (View Calls)
// ============================================================================

/**
 * Gets the backend wallet address.
 * 
 * @returns {Promise<string>} Backend wallet address
 */
export const getBackendWallet = async (): Promise<string> => {
  const contract = getThirdwebContract();

  const data = await readContract({
    contract,
    method: "function backendWallet() view returns (address)",
    params: [],
  });

  return data as string;
};

/**
 * Gets the BNB token address.
 * 
 * @returns {Promise<string>} BNB token contract address
 */
export const getBnbToken = async (): Promise<string> => {
  const contract = getThirdwebContract();

  const data = await readContract({
    contract,
    method: "function bnbToken() view returns (address)",
    params: [],
  });

  return data as string;
};

/**
 * Gets the company wallet address.
 * 
 * @returns {Promise<string>} Company wallet address
 */
export const getCompanyWallet = async (): Promise<string> => {
  const contract = getThirdwebContract();

  const data = await readContract({
    contract,
    method: "function companyWallet() view returns (address)",
    params: [],
  });

  return data as string;
};

/**
 * Gets the entry price for registration.
 * 
 * @returns {Promise<bigint>} Entry price in wei
 */
export const getEntryPrice = async (): Promise<bigint> => {
  const contract = getThirdwebContract();

  const data = await readContract({
    contract,
    method: "function entryPrice() view returns (uint256)",
    params: [],
  });

  return data as bigint;
};

/**
 * Gets the contract balance (BNB token balance).
 * 
 * @returns {Promise<bigint>} Contract balance in wei
 */
export const getContractBalance = async (): Promise<bigint> => {
  const contract = getThirdwebContract();

  const data = await readContract({
    contract,
    method: "function getContractBalance() view returns (uint256)",
    params: [],
  });

  return data as bigint;
};

/**
 * Checks if a user has retopup.
 * 
 * @param {string} user - User wallet address
 * @returns {Promise<boolean>} True if user has retopup
 */
export const hasRetopup = async (user: string): Promise<boolean> => {
  const contract = getThirdwebContract();

  const data = await readContract({
    contract,
    method: "function hasRetopup(address user) view returns (bool)",
    params: [user],
  });

  return data as boolean;
};

/**
 * Gets the contract owner address.
 * 
 * @returns {Promise<string>} Owner wallet address
 */
export const getOwner = async (): Promise<string> => {
  const contract = getThirdwebContract();

  const data = await readContract({
    contract,
    method: "function owner() view returns (address)",
    params: [],
  });

  return data as string;
};

/**
 * Checks if a user is registered.
 * 
 * @param {string} user - User wallet address
 * @returns {Promise<boolean>} True if user is registered
 */
export const isRegistered = async (user: string): Promise<boolean> => {
  const contract = getThirdwebContract();

  const data = await readContract({
    contract,
    method: "function registered(address) view returns (bool)",
    params: [user],
  });

  return data as boolean;
};

/**
 * Gets the retopup count for a user.
 * 
 * @param {string} user - User wallet address
 * @returns {Promise<bigint>} Retopup count
 */
export const getRetopupCount = async (user: string): Promise<bigint> => {
  const contract = getThirdwebContract();

  const data = await readContract({
    contract,
    method: "function retopupCount(address) view returns (uint256)",
    params: [user],
  });

  return data as bigint;
};

/**
 * Gets the retopup price.
 * 
 * @returns {Promise<bigint>} Retopup price in wei
 */
export const getRetopupPrice = async (): Promise<bigint> => {
  const contract = getThirdwebContract();

  const data = await readContract({
    contract,
    method: "function retopupPrice() view returns (uint256)",
    params: [],
  });

  return data as bigint;
};

/**
 * Gets the token decimals.
 * 
 * @returns {Promise<number>} Token decimals (typically 18)
 */
export const getTokenDecimals = async (): Promise<number> => {
  const contract = getThirdwebContract();

  const data = await readContract({
    contract,
    method: "function tokenDecimals() view returns (uint8)",
    params: [],
  });

  return Number(data);
};

/**
 * Gets the total amount paid in by a user.
 * 
 * @param {string} user - User wallet address
 * @returns {Promise<bigint>} Total paid in amount in wei
 */
export const getTotalPaidIn = async (user: string): Promise<bigint> => {
  const contract = getThirdwebContract();

  const data = await readContract({
    contract,
    method: "function totalPaidIn(address) view returns (uint256)",
    params: [user],
  });

  return data as bigint;
};

/**
 * Gets the total payouts for a user.
 * 
 * @param {string} user - User wallet address
 * @returns {Promise<bigint>} Total payouts in wei
 */
export const getTotalPayouts = async (user: string): Promise<bigint> => {
  const contract = getThirdwebContract();

  const data = await readContract({
    contract,
    method: "function totalPayouts(address) view returns (uint256)",
    params: [user],
  });

  return data as bigint;
};

// ============================================================================
// EVENT FUNCTIONS
// ============================================================================

/**
 * Gets RegistrationAccepted events from the contract.
 * 
 * @param {bigint} fromBlock - Starting block number
 * @param {bigint} toBlock - Ending block number
 * @returns {Promise<any[]>} Array of event logs
 */
export const getRegistrationAcceptedEvents = async (
  fromBlock: bigint,
  toBlock: bigint
): Promise<any[]> => {
  const contract = getThirdwebContract();

  const preparedEvent = prepareEvent({
    signature: "event RegistrationAccepted(address indexed user, address indexed backendCaller, uint256 amount)",
  });

  const events = await getContractEvents({
    contract,
    events: [preparedEvent],
    fromBlock,
    toBlock,
  });

  return events;
};

/**
 * Gets RetopupAccepted events from the contract.
 * 
 * @param {bigint} fromBlock - Starting block number
 * @param {bigint} toBlock - Ending block number
 * @returns {Promise<any[]>} Array of event logs
 */
export const getRetopupAcceptedEvents = async (
  fromBlock: bigint,
  toBlock: bigint
): Promise<any[]> => {
  const contract = getThirdwebContract();

  const preparedEvent = prepareEvent({
    signature: "event RetopupAccepted(address indexed user, address indexed backendCaller, uint256 amount, uint256 totalRetopups)",
  });

  const events = await getContractEvents({
    contract,
    events: [preparedEvent],
    fromBlock,
    toBlock,
  });

  return events;
};

/**
 * Gets PayoutExecuted events from the contract.
 * 
 * @param {bigint} fromBlock - Starting block number
 * @param {bigint} toBlock - Ending block number
 * @returns {Promise<any[]>} Array of event logs
 */
export const getPayoutExecutedEvents = async (
  fromBlock: bigint,
  toBlock: bigint
): Promise<any[]> => {
  const contract = getThirdwebContract();

  const preparedEvent = prepareEvent({
    signature: "event PayoutExecuted(address indexed user, uint256 amount, string rewardType)",
  });

  const events = await getContractEvents({
    contract,
    events: [preparedEvent],
    fromBlock,
    toBlock,
  });

  return events;
};

/**
 * Gets BatchPayoutCompleted events from the contract.
 * 
 * @param {bigint} fromBlock - Starting block number
 * @param {bigint} toBlock - Ending block number
 * @returns {Promise<any[]>} Array of event logs
 */
export const getBatchPayoutCompletedEvents = async (
  fromBlock: bigint,
  toBlock: bigint
): Promise<any[]> => {
  const contract = getThirdwebContract();

  const preparedEvent = prepareEvent({
    signature: "event BatchPayoutCompleted(uint256 totalAmount, uint256 userCount)",
  });

  const events = await getContractEvents({
    contract,
    events: [preparedEvent],
    fromBlock,
    toBlock,
  });

  return events;
};

/**
 * Gets BackendWalletUpdated events from the contract.
 * 
 * @param {bigint} fromBlock - Starting block number
 * @param {bigint} toBlock - Ending block number
 * @returns {Promise<any[]>} Array of event logs
 */
export const getBackendWalletUpdatedEvents = async (
  fromBlock: bigint,
  toBlock: bigint
): Promise<any[]> => {
  const contract = getThirdwebContract();

  const preparedEvent = prepareEvent({
    signature: "event BackendWalletUpdated(address indexed previousBackend, address indexed newBackend)",
  });

  const events = await getContractEvents({
    contract,
    events: [preparedEvent],
    fromBlock,
    toBlock,
  });

  return events;
};

/**
 * Gets CompanyWalletUpdated events from the contract.
 * 
 * @param {bigint} fromBlock - Starting block number
 * @param {bigint} toBlock - Ending block number
 * @returns {Promise<any[]>} Array of event logs
 */
export const getCompanyWalletUpdatedEvents = async (
  fromBlock: bigint,
  toBlock: bigint
): Promise<any[]> => {
  const contract = getThirdwebContract();

  const preparedEvent = prepareEvent({
    signature: "event CompanyWalletUpdated(address indexed previousCompanyWallet, address indexed newCompanyWallet)",
  });

  const events = await getContractEvents({
    contract,
    events: [preparedEvent],
    fromBlock,
    toBlock,
  });

  return events;
};

/**
 * Gets CompanyWithdrawal events from the contract.
 * 
 * @param {bigint} fromBlock - Starting block number
 * @param {bigint} toBlock - Ending block number
 * @returns {Promise<any[]>} Array of event logs
 */
export const getCompanyWithdrawalEvents = async (
  fromBlock: bigint,
  toBlock: bigint
): Promise<any[]> => {
  const contract = getThirdwebContract();

  const preparedEvent = prepareEvent({
    signature: "event CompanyWithdrawal(address indexed recipient, uint256 amount)",
  });

  const events = await getContractEvents({
    contract,
    events: [preparedEvent],
    fromBlock,
    toBlock,
  });

  return events;
};

/**
 * Gets ExternalTokenRescued events from the contract.
 * 
 * @param {bigint} fromBlock - Starting block number
 * @param {bigint} toBlock - Ending block number
 * @returns {Promise<any[]>} Array of event logs
 */
export const getExternalTokenRescuedEvents = async (
  fromBlock: bigint,
  toBlock: bigint
): Promise<any[]> => {
  const contract = getThirdwebContract();

  const preparedEvent = prepareEvent({
    signature: "event ExternalTokenRescued(address indexed token, address indexed recipient, uint256 amount)",
  });

  const events = await getContractEvents({
    contract,
    events: [preparedEvent],
    fromBlock,
    toBlock,
  });

  return events;
};

/**
 * Gets OwnershipTransferred events from the contract.
 * 
 * @param {bigint} fromBlock - Starting block number
 * @param {bigint} toBlock - Ending block number
 * @returns {Promise<any[]>} Array of event logs
 */
export const getOwnershipTransferredEvents = async (
  fromBlock: bigint,
  toBlock: bigint
): Promise<any[]> => {
  const contract = getThirdwebContract();

  const preparedEvent = prepareEvent({
    signature: "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
  });

  const events = await getContractEvents({
    contract,
    events: [preparedEvent],
    fromBlock,
    toBlock,
  });

  return events;
};

