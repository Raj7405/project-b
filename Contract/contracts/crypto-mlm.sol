// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PaymentReconciliation
 * @notice Smart contract for accepting USDT (BEP-20) payments on BNB Smart Chain.
 *         Users pay in USDT, gas fees are paid in BNB (native token).
 *         Emits deterministic payment events for backend reconciliation.
 * 
 * @dev Architecture Decision Record (ADR): Blockchain Payment Reconciliation Architecture
 *      - Contract accepts USDT (BEP-20) for payments
 *      - Gas fees are paid in BNB (automatic, native token)
 *      - Emits PaymentReceived events for backend reconciliation
 *      - Events are tracked by: tx_hash, log_index, chain_id (for idempotency)
 *      - Maintains all existing business logic functions
 */
interface IBEP20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IBEP20Metadata is IBEP20 {
    function decimals() external view returns (uint8);
}

library Address {
    function isContract(address account) internal view returns (bool) {
        return account.code.length > 0;
    }

    function functionCall(address target, bytes memory data, string memory errorMessage) internal returns (bytes memory) {
        require(isContract(target), "Address: call to non-contract");
        (bool success, bytes memory returndata) = target.call(data);
        if (!success) {
            if (returndata.length == 0) {
                revert(errorMessage);
            }
            assembly {
                revert(add(32, returndata), mload(returndata))
            }
        }
        return returndata;
    }
}

library SafeBEP20 {
    using Address for address;

    function safeTransfer(IBEP20 token, address to, uint256 value) internal {
        bytes memory data = abi.encodeWithSelector(token.transfer.selector, to, value);
        tokenAddress(token).functionCall(data, "SafeBEP20: transfer failed");
    }

    function safeTransferFrom(IBEP20 token, address from, address to, uint256 value) internal {
        bytes memory data = abi.encodeWithSelector(token.transferFrom.selector, from, to, value);
        tokenAddress(token).functionCall(data, "SafeBEP20: transferFrom failed");
    }

    function tokenAddress(IBEP20 token) private pure returns (address) {
        return address(token);
    }
}

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

abstract contract Ownable {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address initialOwner) {
        require(initialOwner != address(0), "Ownable: zero owner");
        _owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    modifier onlyOwner() {
        require(msg.sender == _owner, "Ownable: caller is not the owner");
        _;
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Ownable: zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

/**
 * @title PaymentReconciliation
 * @notice MLM payment contract using USDT (BEP-20) on BNB Smart Chain.
 *         Users pay in USDT, gas fees are paid in BNB (native token).
 *         Emits ADR-compliant PaymentReceived events alongside existing events.
 * 
 * @dev Action Types for PaymentReceived event:
 *      1 = Registration
 *      2 = Retopup
 *      3 = Autopool Entry
 */
contract PaymentReconciliation is Ownable, ReentrancyGuard {
    using SafeBEP20 for IBEP20;

    /// @notice USDT token address (BEP-20) - users pay in USDT
    IBEP20 public immutable usdtToken;
    
    /// @notice Company wallet address for receiving payments
    address public companyWallet;
    
    /// @notice Backend wallet address for authorized operations
    address public backendWallet;

    /// @notice Token decimals (typically 18 for USDT on BSC)
    uint8 public immutable tokenDecimals;
    
    /// @notice Entry price for registration (in USDT)
    uint256 public immutable entryPrice;
    
    /// @notice Retopup price (in USDT)
    uint256 public immutable retopupPrice;

    /// @notice Business logic mappings
    mapping(address => bool) public registered;
    mapping(address => uint256) public retopupCount;
    mapping(address => uint256) public totalPaidIn;
    mapping(address => uint256) public totalPayouts;

    /// @notice Action type constants for PaymentReceived event
    uint8 public constant ACTION_REGISTRATION = 1;
    uint8 public constant ACTION_RETOPUP = 2;
    uint8 public constant ACTION_AUTOPOOL = 3;

    /// @notice ADR-compliant event: PaymentReceived
    /// @dev This event is used by the backend for reconciliation.
    ///      Each event is uniquely identified by: tx_hash, log_index, chain_id
    /// @param user The address of the user making the payment
    /// @param amount The amount of USDT paid (in token's smallest unit)
    /// @param actionType The type of action: 1=Registration, 2=Retopup, 3=Autopool
    event PaymentReceived(
        address indexed user,
        uint256 amount,
        uint8 actionType
    );

    /// @notice Existing events (maintained for backward compatibility)
    event BackendWalletUpdated(address indexed previousBackend, address indexed newBackend);
    event CompanyWalletUpdated(address indexed previousCompanyWallet, address indexed newCompanyWallet);
    event RegistrationAccepted(address indexed user, address indexed backendCaller, uint256 amount);
    event RetopupAccepted(address indexed user, address indexed backendCaller, uint256 amount, uint256 totalRetopups);
    event PayoutExecuted(address indexed user, uint256 amount, string rewardType);
    event BatchPayoutCompleted(uint256 totalAmount, uint256 userCount);
    event CompanyWithdrawal(address indexed recipient, uint256 amount);
    event ExternalTokenRescued(address indexed token, address indexed recipient, uint256 amount);

    modifier onlyBackend() {
        require(msg.sender == backendWallet, "Caller is not backend");
        _;
    }

    /**
     * @notice Constructor initializes the payment contract
     * @param _usdtToken Address of the USDT token (BEP-20)
     * @param _companyWallet Address where payments will be collected
     * @param _backendWallet Address authorized for backend operations
     */
    constructor(
        address _usdtToken,
        address _companyWallet,
        address _backendWallet
    ) Ownable(msg.sender) {
        require(_usdtToken != address(0), "Token address required");
        require(_companyWallet != address(0), "Company wallet required");
        require(_backendWallet != address(0), "Backend wallet required");

        usdtToken = IBEP20(_usdtToken);
        companyWallet = _companyWallet;
        backendWallet = _backendWallet;

        uint8 decimals = IBEP20Metadata(_usdtToken).decimals();
        require(decimals <= 24, "Unsupported token decimals");
        tokenDecimals = decimals;
        uint256 factor = 10 ** uint256(decimals);
        entryPrice = 2e16 * factor / 1e18;    // 0.02 * factor
        retopupPrice = 4e16 * factor / 1e18;  // 0.04 * factor
    }

    /**
     * @notice Updates the backend wallet address
     * @dev Only callable by the contract owner
     * @param newBackendWallet The new backend wallet address
     */
    function updateBackendWallet(address newBackendWallet) external onlyOwner {
        require(newBackendWallet != address(0), "Backend wallet required");
        emit BackendWalletUpdated(backendWallet, newBackendWallet);
        backendWallet = newBackendWallet;
    }

    /**
     * @notice Updates the company wallet address
     * @dev Only callable by the contract owner
     * @param newCompanyWallet The new company wallet address
     */
    function updateCompanyWallet(address newCompanyWallet) external onlyOwner {
        require(newCompanyWallet != address(0), "Company wallet required");
        emit CompanyWalletUpdated(companyWallet, newCompanyWallet);
        companyWallet = newCompanyWallet;
    }

    /**
     * @notice Registers a new user with USDT payment
     * @dev User must have approved this contract to spend USDT
     *      Gas fee is paid in BNB (native token)
     *      Emits both RegistrationAccepted and PaymentReceived events
     * @param user The address of the user to register
     * @param amount The amount of USDT to pay (must be >= entryPrice)
     */
    function register(address user, uint256 amount) external nonReentrant {
        require(user != address(0), "User required");
        require(!registered[user], "Already registered");
        require(amount >= entryPrice, "Insufficient amount");

        // Transfer USDT from user to contract
        usdtToken.safeTransferFrom(user, address(this), amount);
        registered[user] = true;
        totalPaidIn[user] += amount;

        // Emit existing event (for backward compatibility)
        emit RegistrationAccepted(user, msg.sender, amount);
        
        // Emit ADR-compliant PaymentReceived event
        emit PaymentReceived(user, amount, ACTION_REGISTRATION);
    }

    /**
     * @notice Processes a retopup payment for a registered user
     * @dev Only callable by backend wallet
     *      User must have approved this contract to spend USDT
     *      Gas fee is paid in BNB (native token)
     *      Emits both RetopupAccepted and PaymentReceived events
     * @param user The address of the user making the retopup
     * @param amount The amount of USDT to pay (must be >= retopupPrice)
     */
    function retopup(address user, uint256 amount) external onlyBackend nonReentrant {
        require(user != address(0), "User required");
        require(registered[user], "User not registered");
        require(amount >= retopupPrice, "Insufficient amount");

        // Transfer USDT from user to contract
        usdtToken.safeTransferFrom(user, address(this), amount);
        retopupCount[user] += 1;
        totalPaidIn[user] += amount;

        // Emit existing event (for backward compatibility)
        emit RetopupAccepted(user, msg.sender, amount, retopupCount[user]);
        
        // Emit ADR-compliant PaymentReceived event
        emit PaymentReceived(user, amount, ACTION_RETOPUP);
    }

    /**
     * @notice Executes a payout to a user
     * @dev Only callable by backend wallet
     *      Transfers USDT from contract to user
     * @param user The address of the user to receive the payout
     * @param amount The amount of USDT to payout
     * @param rewardType The type of reward (e.g., "direct_income", "level_income")
     */
    function payout(address user, uint256 amount, string calldata rewardType) external onlyBackend nonReentrant {
        require(user != address(0), "User required");
        require(amount > 0, "Amount required");
        require(usdtToken.balanceOf(address(this)) >= amount, "Insufficient contract balance");

        usdtToken.safeTransfer(user, amount);
        totalPayouts[user] += amount;

        emit PayoutExecuted(user, amount, rewardType);
    }

    /**
     * @notice Executes batch payouts to multiple users
     * @dev Only callable by backend wallet
     *      Maximum 50 users per batch
     * @param users Array of user addresses
     * @param amounts Array of USDT amounts (must match users array length)
     * @param rewardTypes Array of reward types (must match users array length)
     */
    function executeBatchPayouts(
        address[] calldata users,
        uint256[] calldata amounts,
        string[] calldata rewardTypes
    ) external onlyBackend nonReentrant {
        uint256 length = users.length;
        require(length > 0 && length <= 50, "Invalid batch size");
        require(length == amounts.length && length == rewardTypes.length, "Array length mismatch");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < length; i++) {
            require(users[i] != address(0), "Zero user");
            require(amounts[i] > 0, "Zero amount");
            totalAmount += amounts[i];
        }

        require(usdtToken.balanceOf(address(this)) >= totalAmount, "Insufficient contract balance");

        for (uint256 i = 0; i < length; i++) {
            usdtToken.safeTransfer(users[i], amounts[i]);
            totalPayouts[users[i]] += amounts[i];
            emit PayoutExecuted(users[i], amounts[i], rewardTypes[i]);
        }

        emit BatchPayoutCompleted(totalAmount, length);
    }

    /**
     * @notice Withdraws USDT from the contract to company wallet
     * @dev Only callable by the contract owner
     * @param amount The amount of USDT to withdraw
     * @param recipient The address to receive the tokens (defaults to companyWallet if zero)
     */
    function withdrawCompanyShare(uint256 amount, address recipient) external onlyOwner nonReentrant {
        require(amount > 0, "Amount required");
        address target = recipient == address(0) ? companyWallet : recipient;
        require(target != address(0), "Recipient required");
        require(usdtToken.balanceOf(address(this)) >= amount, "Insufficient balance");

        usdtToken.safeTransfer(target, amount);
        emit CompanyWithdrawal(target, amount);
    }

    /**
     * @notice Rescues external tokens accidentally sent to the contract
     * @dev Only callable by the contract owner. Cannot rescue USDT (use withdrawCompanyShare instead).
     * @param token The address of the token to rescue
     * @param amount The amount of tokens to rescue
     * @param recipient The address to receive the tokens
     */
    function rescueExternalToken(address token, uint256 amount, address recipient) external onlyOwner nonReentrant {
        require(token != address(usdtToken), "Cannot rescue USDT token");
        require(token != address(0), "Token required");
        require(recipient != address(0), "Recipient required");

        IBEP20(token).transfer(recipient, amount);
        emit ExternalTokenRescued(token, recipient, amount);
    }

    /**
     * @notice Returns the contract's USDT balance
     * @return The current USDT balance of the contract
     */
    function getContractBalance() external view returns (uint256) {
        return usdtToken.balanceOf(address(this));
    }

    /**
     * @notice Checks if a user has made a retopup
     * @param user The address of the user to check
     * @return True if the user has made at least one retopup
     */
    function hasRetopup(address user) external view returns (bool) {
        return retopupCount[user] > 0;
    }
}

