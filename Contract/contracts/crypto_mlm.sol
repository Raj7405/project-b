// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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

contract CryptoMLMTransactions is Ownable, ReentrancyGuard {
    using SafeBEP20 for IBEP20;

    IBEP20 public immutable bnbToken;
    address public companyWallet;
    address public backendWallet;

    uint8 public immutable tokenDecimals;
    uint256 public immutable entryPrice;
    uint256 public immutable retopupPrice;

    mapping(address => bool) public registered;
    mapping(address => uint256) public retopupCount;
    mapping(address => uint256) public totalPaidIn;
    mapping(address => uint256) public totalPayouts;

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

    constructor(address _bnbToken, address _companyWallet, address _backendWallet) Ownable(msg.sender) {
        require(_bnbToken != address(0), "Token address required");
        require(_companyWallet != address(0), "Company wallet required");
        require(_backendWallet != address(0), "Backend wallet required");

        bnbToken = IBEP20(_bnbToken);
        companyWallet = _companyWallet;
        backendWallet = _backendWallet;

        uint8 decimals = IBEP20Metadata(_bnbToken).decimals();
        require(decimals <= 24, "Unsupported token decimals");
        tokenDecimals = decimals;
        uint256 factor = 10 ** uint256(decimals);
        entryPrice = 20 * factor;
        retopupPrice = 40 * factor;
    }

    function updateBackendWallet(address newBackendWallet) external onlyOwner {
        require(newBackendWallet != address(0), "Backend wallet required");
        emit BackendWalletUpdated(backendWallet, newBackendWallet);
        backendWallet = newBackendWallet;
    }

    function updateCompanyWallet(address newCompanyWallet) external onlyOwner {
        require(newCompanyWallet != address(0), "Company wallet required");
        emit CompanyWalletUpdated(companyWallet, newCompanyWallet);
        companyWallet = newCompanyWallet;
    }

    function register(address user, uint256 amount) external onlyBackend nonReentrant {
        require(user != address(0), "User required");
        // require(!registered[user], "Already registered");
        require(amount >= entryPrice, "Insufficient amount");

        bnbToken.safeTransferFrom(user, address(this), amount);
        registered[user] = true;
        totalPaidIn[user] += amount;

        emit RegistrationAccepted(user, msg.sender, amount);
    }

    function retopup(address user, uint256 amount) external onlyBackend nonReentrant {
        require(user != address(0), "User required");
        require(registered[user], "User not registered");
        require(amount >= retopupPrice, "Insufficient amount");

        bnbToken.safeTransferFrom(user, address(this), amount);
        retopupCount[user] += 1;
        totalPaidIn[user] += amount;

        emit RetopupAccepted(user, msg.sender, amount, retopupCount[user]);
    }

    function payout(address user, uint256 amount, string calldata rewardType) external onlyBackend nonReentrant {
        require(user != address(0), "User required");
        require(amount > 0, "Amount required");
        require(bnbToken.balanceOf(address(this)) >= amount, "Insufficient contract balance");

        bnbToken.safeTransfer(user, amount);
        totalPayouts[user] += amount;

        emit PayoutExecuted(user, amount, rewardType);
    }

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

        require(bnbToken.balanceOf(address(this)) >= totalAmount, "Insufficient contract balance");

        for (uint256 i = 0; i < length; i++) {
            bnbToken.safeTransfer(users[i], amounts[i]);
            totalPayouts[users[i]] += amounts[i];
            emit PayoutExecuted(users[i], amounts[i], rewardTypes[i]);
        }

        emit BatchPayoutCompleted(totalAmount, length);
    }

    function withdrawCompanyShare(uint256 amount, address recipient) external onlyOwner nonReentrant {
        require(amount > 0, "Amount required");
        address target = recipient == address(0) ? companyWallet : recipient;
        require(target != address(0), "Recipient required");
        require(bnbToken.balanceOf(address(this)) >= amount, "Insufficient balance");

        bnbToken.safeTransfer(target, amount);
        emit CompanyWithdrawal(target, amount);
    }

    function rescueExternalToken(address token, uint256 amount, address recipient) external onlyOwner nonReentrant {
        require(token != address(bnbToken), "Cannot rescue MLM token");
        require(token != address(0), "Token required");
        require(recipient != address(0), "Recipient required");

        IBEP20(token).transfer(recipient, amount);
        emit ExternalTokenRescued(token, recipient, amount);
    }

    function getContractBalance() external view returns (uint256) {
        return bnbToken.balanceOf(address(this));
    }

    function hasRetopup(address user) external view returns (bool) {
        return retopupCount[user] > 0;
    }
}

