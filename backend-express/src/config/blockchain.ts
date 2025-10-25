import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// BEP-20 Contract ABI (same as ERC-20 but on BSC)
export const CONTRACT_ABI = [
  "event UserRegistered(uint256 indexed id, address indexed wallet, uint256 indexed parentId, bool wentToAutoPool)",
  "event DirectIncomePaid(uint256 indexed toId, address indexed to, uint256 amount)",
  "event LevelIncomePaid(uint256 indexed toId, address indexed to, uint256 amount, uint8 level)",
  "event AutoPoolIncomePaid(uint256 indexed toId, address indexed to, uint256 amount)",
  "event ReTopupProcessed(uint256 indexed id, address indexed wallet, uint256 amount)",
  "event AutoPoolEnqueued(uint256 indexed id, address indexed wallet)",
  "event ReTopupSkippedToCompany(uint256 indexed skippedId, address indexed skippedWallet, uint256 amount, uint8 level)",
  "function getUserId(address wallet) view returns (uint256)",
  "function userInfo(uint256 id) view returns (address wallet, uint256 parentId, uint16 sponsorCount, bool exists, bool hasReTopup)",
  "function owner() view returns (address)"
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

