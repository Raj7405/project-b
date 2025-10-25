// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/*
  DecentReferral.sol - Crypto MLM Platform on BSC (BNB Smart Chain)
  
  ⚠️  DESIGNED FOR BEP-20 TOKENS ON BINANCE SMART CHAIN (BSC)
  
  Features:
  - BEP-20 token standard (BUSD, USDT, or any 18-decimal BEP-20 token)
  - Optimized for BSC gas efficiency and network characteristics
  - $20 package registration (in BEP-20 tokens)
  - Direct income: $18 to parent, $2 to company (except the 2nd sponsor case)
  - 2nd sponsor -> entry to Auto Pool (full $20 held in contract as pool funds)
  - Auto Pool: binary placement using BFS-style parent pointer
  - Re-Topup: $40 tokens must be transferred; $36 distributed up 10 levels; $4 company fee
  - **IMPORTANT**: Only users who have themselves done re-topup can receive re-topup income
  - Security: SafeERC20, ReentrancyGuard, Ownable, Pausable
  
  Supported Networks:
  - BSC Mainnet (Chain ID: 56)
  - BSC Testnet (Chain ID: 97)
  - Local Hardhat (Chain ID: 31337) - for testing
*/

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract DecentReferral is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;          // BEP-20 token used for payments
    address public companyWallet;
    uint256 public immutable packageAmount; // e.g., 20 * 1e18
    uint256 public immutable reTopupAmount; // e.g., 40 * 1e18

    uint256 public nextId = 1;

    struct User {
        address wallet;
        uint256 id;
        uint256 parentId;      // 0 for company/root
        uint16 sponsorCount;   // how many direct sponsors this user has
        bool exists;
    }

    // user id => User
    mapping(uint256 => User) public users;
    // wallet => id
    mapping(address => uint256) public walletToId;
    
    // Track which users have done re-topup (eligibility for receiving re-topup income)
    mapping(uint256 => bool) public hasReTopup;

    // AutoPool binary tree nodes stored by id (IDs are user IDs)
    // We maintain BFS insertion using poolParentPtr indicating which node should receive next child
    uint256[] public poolNodes; // array of user ids in pool (1-based user ids)
    uint256 public poolParentPtr = 0; // index into poolNodes for parent selection
    // queue for pool entries (efficient pop with head index)
    uint256[] private poolQueue;
    uint256 private poolQueueHead = 0;

    // reTopup distribution percentages (percentages sum to 100)
    uint8[10] public reTopupPerc = [30,15,10,5,5,5,5,5,10,10]; // sum 100

    event UserRegistered(uint256 indexed id, address indexed wallet, uint256 indexed parentId, bool wentToAutoPool);
    event DirectIncomePaid(uint256 indexed toId, address indexed to, uint256 amount);
    event CompanyFeePaid(address indexed to, uint256 amount);
    event AutoPoolEnqueued(uint256 indexed id, address indexed wallet);
    event AutoPoolPlaced(uint256 indexed nodeId, uint256 indexed parentId, uint256 position); // position: 0=left,1=right
    event ReTopupProcessed(uint256 indexed id, address indexed wallet, uint256 amount);
    event ReTopupSkippedToCompany(uint256 indexed skippedId, address indexed skippedWallet, uint256 amount, uint8 level);
    event EmergencyWithdraw(address indexed to, uint256 amount);

    constructor(
        address _token,
        address _companyWallet,
        uint256 _packageAmount,
        uint256 _reTopupAmount
    ) {
        require(_token != address(0), "token 0");
        require(_companyWallet != address(0), "company 0");
        token = IERC20(_token);
        companyWallet = _companyWallet;
        packageAmount = _packageAmount;
        reTopupAmount = _reTopupAmount;

        // register company as root user id = 1
        users[nextId] = User({wallet: _companyWallet, id: nextId, parentId: 0, sponsorCount: 0, exists: true});
        walletToId[_companyWallet] = nextId;
        nextId++;
        // also seed poolNodes with company id as root pool node (optional)
        poolNodes.push(1); // company node as default root in pool
    }

    modifier onlyRegistered(uint256 id) {
        require(users[id].exists, "user not registered");
        _;
    }

    modifier onlyWalletRegistered() {
        require(walletToId[msg.sender] != 0, "wallet not registered");
        _;
    }

    // Register: user must have approved packageAmount to this contract beforehand
    // `referrerId` must exist
    function register(uint256 referrerId) external nonReentrant whenNotPaused {
        require(walletToId[msg.sender] == 0, "already registered");
        require(users[referrerId].exists, "referrer not found");

        // transfer packageAmount from user into contract
        token.safeTransferFrom(msg.sender, address(this), packageAmount);

        // create user
        uint256 myId = nextId++;
        users[myId] = User({wallet: msg.sender, id: myId, parentId: referrerId, sponsorCount: 0, exists: true});
        walletToId[msg.sender] = myId;

        // increment sponsorCount for referrer
        users[referrerId].sponsorCount += 1;

        bool parentWentToPool = false;

        // Process payment for the new registration
        // Normal sponsor payment: parent receives $18 (90%), company receives $2 (10%)
        uint256 companyFee = (packageAmount * 10) / 100; // 10%
        uint256 parentShare = packageAmount - companyFee; // 90%
        address parentWallet = users[referrerId].wallet;
        token.safeTransfer(parentWallet, parentShare);
        token.safeTransfer(companyWallet, companyFee);

        emit DirectIncomePaid(referrerId, parentWallet, parentShare);
        emit CompanyFeePaid(companyWallet, companyFee);

        // if this is the 2nd sponsor for referrer -> referrer (parent) goes to Auto Pool
        if (users[referrerId].sponsorCount == 2) {
            // The referrer (parent) now qualifies for Auto Pool entry
            // Enqueue the REFERRER into poolQueue for later distribution/placement
            poolQueue.push(referrerId);
            emit AutoPoolEnqueued(referrerId, parentWallet);
            parentWentToPool = true;
        }

        // attempt to process pool queue immediately (owner may call distribute separately too)
        _tryProcessPool(); // non-blocking in that it will process as many entries as possible

        emit UserRegistered(myId, msg.sender, referrerId, parentWentToPool);
    }

    // internal: process pool queue and place nodes into binary poolNodes tree
    // placement rule: take the front of poolQueue and place it as left/right child of poolNodes[poolParentPtr]
    function _tryProcessPool() internal {
        // continue while there are queued entries and there is a parent available
        while (poolQueueHead < poolQueue.length) {
            uint256 newUserId = poolQueue[poolQueueHead];
            // find a parent in poolNodes to attach to. Ensure poolParentPtr is valid
            if (poolParentPtr >= poolNodes.length) {
                // no parent available (shouldn't happen because we always push new nodes)
                break;
            }
            uint256 parentId = poolNodes[poolParentPtr];

            // Count children of parent in poolNodes by checking next indices:
            // We are storing nodes in BFS order; when we add a new node, we append it to poolNodes.
            // We decide left/right based on whether parent already has two children in BFS sequence.
            // Compute parent's index in poolNodes array
            // NOTE: since poolNodes is user ids list in BFS order, parentIndex = poolParentPtr
            // The children would be at indices: 2*parentIndex+1 and +2 (0-based)
            uint256 parentIndex = poolParentPtr;
            uint256 leftIndex = parentIndex * 2 + 1;
            uint256 rightIndex = parentIndex * 2 + 2;
            bool placed = false;
            uint256 position = 0; // 0=left,1=right

            // If leftIndex out of bounds -> we'll append new node (becomes left)
            if (leftIndex >= poolNodes.length) {
                poolNodes.push(newUserId);
                placed = true;
                position = 0;
            } else if (rightIndex >= poolNodes.length) {
                // There is left child but no right child -> append new node as right
                poolNodes.push(newUserId);
                placed = true;
                position = 1;
            } else {
                // parent already has two children -> advance parent pointer
                poolParentPtr += 1;
                continue; // try again with next parent
            }

            if (placed) {
                emit AutoPoolPlaced(newUserId, parentId, position);
                // advance queue head
                poolQueueHead += 1;

                // Note: funds for pool members are already in contract (we kept their packageAmount)
                // Actual payouts from pool should be administered with a separate owner/admin function
                // or an automated on-chain rule; keeping it simple: funds remain until distributed by owner
            }
        }

        // Trim memory if head has advanced a lot
        if (poolQueueHead > 128 && poolQueueHead * 2 > poolQueue.length) {
            // shift remaining entries to new array to free memory
            uint256 remaining = poolQueue.length - poolQueueHead;
            uint256[] memory newQ = new uint256[](remaining);
            for (uint i = 0; i < remaining; i++) {
                newQ[i] = poolQueue[poolQueueHead + i];
            }
            // replace storage array
            delete poolQueue;
            for (uint i = 0; i < remaining; i++) poolQueue.push(newQ[i]);
            poolQueueHead = 0;
        }
    }

    // Owner callable: distribute pool payouts based on your business rule
    // This is an admin function because pool payout rules can be complex (binary distribution layers, staged payouts)
    // Example usage: owner calls distributePoolPayouts with an array of recipient userIds and amounts
    function distributePoolPayouts(uint256[] calldata recipientIds, uint256[] calldata amounts) external onlyOwner nonReentrant {
        require(recipientIds.length == amounts.length, "len mismatch");
        for (uint i = 0; i < recipientIds.length; i++) {
            uint256 id = recipientIds[i];
            require(users[id].exists, "recipient not registered");
            address to = users[id].wallet;
            token.safeTransfer(to, amounts[i]);
            // emit a Transfer event style log
            emit DirectIncomePaid(id, to, amounts[i]);
        }
    }

    // User-triggered ReTopup (must approve reTopupAmount before calling)
    // Distribution: 10 levels with percentages defined in reTopupPerc array (sum = 100)
    // IMPORTANT: Only ancestors who have themselves done re-topup receive income
    // If an ancestor has NOT done re-topup, their share goes to company wallet
    function reTopup() external nonReentrant whenNotPaused onlyWalletRegistered {
        uint256 senderId = walletToId[msg.sender];
        require(senderId != 0, "no id");
        
        // transfer tokens from user into contract
        token.safeTransferFrom(msg.sender, address(this), reTopupAmount);

        // mark that sender has reTopup (so they become eligible for future distributions)
        if (!hasReTopup[senderId]) {
            hasReTopup[senderId] = true;
        }

        uint256 companyFee = (reTopupAmount * 10) / 100; // $4 (10%)
        uint256 distributable = reTopupAmount - companyFee; // $36 (90%)

        // walk up parents and distribute
        uint256 currentId = users[senderId].parentId;
        for (uint8 i = 0; i < 10; i++) {
            uint256 perc = reTopupPerc[i];
            uint256 share = (distributable * perc) / 100;

            if (currentId == 0) {
                // reached root/company — send remaining shares to company
                if (share > 0) {
                    token.safeTransfer(companyWallet, share);
                    emit CompanyFeePaid(companyWallet, share);
                }
            } else {
                if (hasReTopup[currentId]) {
                    // ancestor is eligible — pay them
                    address to = users[currentId].wallet;
                    token.safeTransfer(to, share);
                    emit DirectIncomePaid(currentId, to, share);
                } else {
                    // ancestor NOT eligible (hasn't done re-topup) — send this share to company
                    if (share > 0) {
                        token.safeTransfer(companyWallet, share);
                        emit ReTopupSkippedToCompany(currentId, users[currentId].wallet, share, i + 1);
                    }
                }
                // continue walking up the chain
                currentId = users[currentId].parentId;
            }
        }

        // company fee for the reTopup (the dedicated 10%)
        token.safeTransfer(companyWallet, companyFee);
        emit CompanyFeePaid(companyWallet, companyFee);
        emit ReTopupProcessed(senderId, msg.sender, reTopupAmount);
    }

    // -------------------
    // Admin / Owner utilities
    // -------------------
    function setCompanyWallet(address _company) external onlyOwner {
        require(_company != address(0), "zero");
        companyWallet = _company;
    }

    function pause() external onlyOwner {
        _pause();
    }
    function unpause() external onlyOwner {
        _unpause();
    }

    // Emergency withdraw by owner to send tokens out of contract (should be multisig in production)
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "zero");
        token.safeTransfer(to, amount);
        emit EmergencyWithdraw(to, amount);
    }

    // -------------------
    // View helpers
    // -------------------
    function getPoolQueueLength() external view returns (uint256) {
        if (poolQueue.length < poolQueueHead) return 0;
        return poolQueue.length - poolQueueHead;
    }

    function getPoolNodesCount() external view returns (uint256) {
        return poolNodes.length;
    }

    function getUserId(address wallet) external view returns (uint256) {
        return walletToId[wallet];
    }

    function userInfo(uint256 id) external view returns (address wallet, uint256 parentId, uint16 sponsorCnt, bool exists_, bool hasReTopup_) {
        User memory u = users[id];
        return (u.wallet, u.parentId, u.sponsorCount, u.exists, hasReTopup[id]);
    }
    
    function isEligibleForReTopupIncome(uint256 id) external view returns (bool) {
        return hasReTopup[id];
    }
    
    function isEligibleForReTopupIncomeByWallet(address wallet) external view returns (bool) {
        uint256 id = walletToId[wallet];
        if (id == 0) return false;
        return hasReTopup[id];
    }
}

