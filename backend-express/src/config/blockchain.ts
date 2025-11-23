import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// BEP-20 Contract ABI - Updated to match DecentReferral.sol (MLMSystem contract)
export const CONTRACT_ABI = [
  // Main Functions
  "function register(address _referrer) external returns (uint256 userId)",
  "function retopup() external",
  "function processAutoProgression(address _user, uint256 _fromPool) external",
  
  // View Functions
  "function getUserInfo(address _user) external view returns (uint256 id, address referrer, uint256 referralCount, uint256 directIncomeAmount, uint256 poolIncomeAmount, uint256 levelIncomeAmount, bool isActive, uint256 retopupCount)",
  "function getUserReferrals(address _user, uint256 _count) external view returns (address[] memory)",
  "function getPoolNode(address _user, uint256 _poolLevel) external view returns (address user, address left, address right, uint256 poolLevel, bool leftFilled, bool rightFilled, bool isComplete)",
  "function getTotalEarnings(address _user) external view returns (uint256)",
  "function getReservedIncome(address _user, uint256 _poolLevel) external view returns (uint256)",
  "function getLastFourNodes(uint256 _poolLevel) external view returns (address[4] memory)",
  "function getCompletedNodesCount(uint256 _poolLevel) external view returns (uint256)",
  "function isPoolLevelComplete(uint256 _poolLevel) external view returns (bool)",
  
  // Public State Variables
  "function usdtToken() external view returns (address)",
  "function companyWallet() external view returns (address)",
  "function lastUserId() external view returns (uint256)",
  "function entryPrice() external view returns (uint256)",
  "function retopupPrice() external view returns (uint256)",
  "function directIncome() external view returns (uint256)",
  "function companyFee() external view returns (uint256)",
  "function tokenDecimals() external view returns (uint8)",
  "function levelPercentages(uint256) external view returns (uint256)",
  "function idToAddress(uint256) external view returns (address)",
  
  // Constants
  "function COMPLETE_POOL_SIZE() external pure returns (uint256)",
  "function LAST_NODES_COUNT() external pure returns (uint256)",
  
  // Events - Updated to match contract
  "event UserRegistered(address indexed user, address indexed referrer, uint256 userId)",
  "event DirectIncomeEarned(address indexed user, address indexed from, uint256 amount)",
  "event PoolIncomeEarned(address indexed user, uint256 poolLevel, uint256 amount)",
  "event LevelIncomeEarned(address indexed user, address indexed from, uint256 level, uint256 amount)",
  "event PoolPlacement(address indexed user, uint256 poolLevel, address indexed parent)",
  "event PoolCompleted(address indexed user, uint256 poolLevel)",
  "event RetopupCompleted(address indexed user, uint256 amount)",
  "event IncomeReserved(address indexed user, uint256 poolLevel, uint256 amount)",
  "event PoolLevelCompleted(uint256 poolLevel)",
  "event LastFourNodesIdentified(uint256 poolLevel, address[4] nodes)",
  "event AutoProgression(address indexed user, uint256 fromPool, uint256 toPool, uint256 reservedAmountUsed)"
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

