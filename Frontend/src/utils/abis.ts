// Contract ABIs
export const CONTRACT_ABI = [
  "function register(uint256 referrerId) external",
  "function reTopup() external",
  "function getUserId(address wallet) external view returns (uint256)",
  "function userInfo(uint256 id) external view returns (address wallet, uint256 parentId, uint16 sponsorCnt, bool exists_, bool hasReTopup_)",
  "function isEligibleForReTopupIncome(uint256 id) external view returns (bool)",
  "function isEligibleForReTopupIncomeByWallet(address wallet) external view returns (bool)",
  "function getPoolQueueLength() external view returns (uint256)",
  "function getPoolNodesCount() external view returns (uint256)",
  "function packageAmount() external view returns (uint256)",
  "function reTopupAmount() external view returns (uint256)",
  "function companyWallet() external view returns (address)",
  "function owner() external view returns (address)",
  "function pause() external",
  "function unpause() external",
  "function paused() external view returns (bool)",
  "function setCompanyWallet(address _company) external",
  "function distributePoolPayouts(uint256[] calldata recipientIds, uint256[] calldata amounts) external",
  "function emergencyWithdraw(address to, uint256 amount) external",
  "event UserRegistered(uint256 indexed id, address indexed wallet, uint256 indexed parentId, bool wentToAutoPool)",
  "event DirectIncomePaid(uint256 indexed toId, address indexed to, uint256 amount)",
  "event CompanyFeePaid(address indexed to, uint256 amount)",
  "event AutoPoolEnqueued(uint256 indexed id, address indexed wallet)",
  "event AutoPoolPlaced(uint256 indexed nodeId, uint256 indexed parentId, uint256 position)",
  "event ReTopupProcessed(uint256 indexed id, address indexed wallet, uint256 amount)",
  "event ReTopupSkippedToCompany(uint256 indexed skippedId, address indexed skippedWallet, uint256 amount, uint8 level)"
]

export const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)"
]

