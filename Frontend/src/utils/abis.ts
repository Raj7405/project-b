// Contract ABIs - CryptoMLMTransactions (Backend-Controlled)

export const CONTRACT_ABI = [
  // Main Functions (User can call register, backend can call retopup/payout)
  "function register(address user, uint256 amount) external",
  "function retopup(address user, uint256 amount) external",
  "function payout(address user, uint256 amount, string calldata rewardType) external",
  "function executeBatchPayouts(address[] calldata users, uint256[] calldata amounts, string[] calldata rewardTypes) external",
  
  // Owner Functions
  "function updateBackendWallet(address newBackendWallet) external",
  "function updateCompanyWallet(address newCompanyWallet) external",
  "function withdrawCompanyShare(uint256 amount, address recipient) external",
  "function rescueExternalToken(address token, uint256 amount, address recipient) external",
  "function transferOwnership(address newOwner) external",
  
  // View Functions
  "function getContractBalance() external view returns (uint256)",
  "function hasRetopup(address user) external view returns (bool)",
  "function owner() external view returns (address)",
  
  // Public State Variables (auto-generated getters)
  "function bnbToken() external view returns (address)",
  "function companyWallet() external view returns (address)",
  "function backendWallet() external view returns (address)",
  "function tokenDecimals() external view returns (uint8)",
  "function entryPrice() external view returns (uint256)",
  "function retopupPrice() external view returns (uint256)",
  "function registered(address user) external view returns (bool)",
  "function retopupCount(address user) external view returns (uint256)",
  "function totalPaidIn(address user) external view returns (uint256)",
  "function totalPayouts(address user) external view returns (uint256)",
  
  // Events
  "event BackendWalletUpdated(address indexed previousBackend, address indexed newBackend)",
  "event CompanyWalletUpdated(address indexed previousCompanyWallet, address indexed newCompanyWallet)",
  "event RegistrationAccepted(address indexed user, address indexed backendCaller, uint256 amount)",
  "event RetopupAccepted(address indexed user, address indexed backendCaller, uint256 amount, uint256 totalRetopups)",
  "event PayoutExecuted(address indexed user, uint256 amount, string rewardType)",
  "event BatchPayoutCompleted(uint256 totalAmount, uint256 userCount)",
  "event CompanyWithdrawal(address indexed recipient, uint256 amount)",
  "event ExternalTokenRescued(address indexed token, address indexed recipient, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
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

