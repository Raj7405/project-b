import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Crypto MLM Transactions Contract ABI
export const CONTRACT_ABI = [
  // Events
  "event RegistrationAccepted(address indexed user, address indexed backendCaller, uint256 amount)",
  "event RetopupAccepted(address indexed user, address indexed backendCaller, uint256 amount, uint256 totalRetopups)",
  "event PayoutExecuted(address indexed user, uint256 amount, string rewardType)",
  "event BatchPayoutCompleted(uint256 totalAmount, uint256 userCount)",
  "event BackendWalletUpdated(address indexed previousBackend, address indexed newBackend)",
  "event CompanyWalletUpdated(address indexed previousCompanyWallet, address indexed newCompanyWallet)",
  "event CompanyWithdrawal(address indexed recipient, uint256 amount)",
  "event ExternalTokenRescued(address indexed token, address indexed recipient, uint256 amount)",
  // View functions
  "function registered(address) view returns (bool)",
  "function retopupCount(address) view returns (uint256)",
  "function totalPaidIn(address) view returns (uint256)",
  "function totalPayouts(address) view returns (uint256)",
  "function getContractBalance() view returns (uint256)",
  "function hasRetopup(address) view returns (bool)",
  "function owner() view returns (address)",
  "function companyWallet() view returns (address)",
  "function entryPrice() view returns (uint256)",
  "function retopupPrice() view returns (uint256)",
  // Write functions (used by backend with signer)
  "function payout(address user, uint256 amount, string calldata rewardType) external",
  "function executeBatchPayouts(address[] calldata users, uint256[] calldata amounts, string[] calldata rewardTypes) external"
];

// BEP-20 Token ABI (standard interface)
export const TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

// Initialize provider for BSC
export const getProvider = () => {
  const rpcUrl = process.env.BSC_RPC_URL || 'http://127.0.0.1:8545';
  return new ethers.JsonRpcProvider(rpcUrl);
};

// Get contract instance
export const getContract = () => {
  const provider = getProvider();
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error('CONTRACT_ADDRESS not set in environment');
  }
  return new ethers.Contract(contractAddress, CONTRACT_ABI, provider);
};

// Get token contract instance
export const getTokenContract = () => {
  const provider = getProvider();
  const tokenAddress = process.env.TOKEN_ADDRESS;
  if (!tokenAddress) {
    throw new Error('TOKEN_ADDRESS not set in environment');
  }
  return new ethers.Contract(tokenAddress, TOKEN_ABI, provider);
};

