// Explains the license identifier required by the Solidity compiler to display usage rights for the source code
// SPDX-License-Identifier: MIT
// Specifies the version of the Solidity compiler this contract requires (0.8.0 or higher but less than 0.9.0)
pragma solidity ^0.8.0;

// Declares an interface for interacting with a BEP20-compliant token (in this case WBNB)
interface IBEP20 {
    // Defines the function signature for transferring tokens from one address to another with prior allowance
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    // Defines the function signature for transferring tokens directly from the caller to a recipient
    function transfer(address recipient, uint256 amount) external returns (bool);
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
            // Bubble revert reason
            assembly {
                revert(add(32, returndata), mload(returndata))
            }
        }

        return returndata;
    }

    function functionCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionCall(target, data, "Address: low-level call failed");
    }
}

library SafeBEP20 {
    using Address for address;

    function safeTransfer(IBEP20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, value));
    }

    function safeTransferFrom(IBEP20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
    }

    function _callOptionalReturn(IBEP20 token, bytes memory data) private {
        bytes memory returndata = address(token).functionCall(data, "SafeBEP20: call failed");
        if (returndata.length > 0) {
            require(abi.decode(returndata, (bool)), "SafeBEP20: BEP20 operation did not succeed");
        }
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

// Declares the main contract that implements the MLM system logic
contract MLMSystem is ReentrancyGuard {
    using SafeBEP20 for IBEP20;
    
    // ============ STATE VARIABLES ============
    
    // Holds a reference to the WBNB token contract so we can invoke BEP20 functions
    IBEP20 public bnbToken;
    // Stores the wallet address owned by the company to receive fees
    address public companyWallet;
    // Tracks the next user id to assign, starting at 1 (company is the first user)
    uint256 public lastUserId = 1;

    uint8 public immutable tokenDecimals;
    uint256 public immutable entryPrice;
    uint256 public immutable retopupPrice;
    uint256 public immutable directIncome;
    uint256 public immutable companyFee;
    
    // Constants
    // Sets the buy-in price for new users to join the system (20 BNB scaled by token decimals)
    // Sets the required amount for a user to perform a retopup (40 BNB scaled by token decimals)
    // Defines the payout amount sent to referrers for most direct referrals (18 BNB scaled by token decimals)
    // Defines the fee retained by the company on each qualifying direct referral (2 BNB scaled by token decimals)
    
    // Auto Pool Constants
    // Complete pool size for a 4-level binary tree (1 + 2 + 4 + 8 = 15 nodes)
    uint256 public constant COMPLETE_POOL_SIZE = 15;
    // Number of last nodes whose income is reserved for next pool entry
    uint256 public constant LAST_NODES_COUNT = 4;
    // Maximum number of trees per pool level (after 15 trees, no more new trees)
    uint256 public constant MAX_TREES_PER_LEVEL = 15;
    
    // ============ DATA STRUCTURES ============
    
    // Represents all on-chain information associated with a user
    struct User {
        // Unique numeric identifier assigned sequentially to each registered user
        uint256 id;
        // Address of the immediate sponsor who referred this user
        address referrer;
        // Counts how many direct referrals this user has accumulated
        uint256 referralCount; // Total direct referrals
        // Tracks total direct referral earnings this user has received
        uint256 directIncome;
        // Tracks cumulative earnings from the auto pool placements
        uint256 poolIncome;
        // Tracks total income earned from the multi-level retopup distribution
        uint256 levelIncome;
        // Flag indicating whether the user has registered and is active
        bool isActive;
        // Counts how many times the user has performed retopups
        uint256 retopupCount;
        // Stores each direct referral address by index (1-based) for retrieval
        mapping(uint256 => address) referrals; // referralIndex => referral address
    }
    
    // Represents a node in the auto pool binary tree for a given level
    struct PoolNode {
        // The address of the user occupying this node
        address user;
        // Address of the left child in the binary tree (if any)
        address left;
        // Address of the right child in the binary tree (if any)
        address right;
        // Address of the parent node in the binary tree
        address parent;
        // The level within the auto pool hierarchy this node belongs to
        uint256 poolLevel; // 1, 2, 3...
        // Indicates whether the left child slot has been filled
        bool leftFilled;
        // Indicates whether the right child slot has been filled
        bool rightFilled;
        // Marks whether both child positions are filled and rewards have been processed
        bool isComplete;
    }
    
    // ============ MAPPINGS ============
    
    // Maps each user address to its associated User struct containing MLM data
    mapping(address => User) public users;
    // Maps numeric user IDs back to their associated addresses for lookup
    mapping(uint256 => address) public idToAddress;
    // For each user and pool level, stores the PoolNode representing their position in that level
    mapping(address => mapping(uint256 => PoolNode)) public userPools; // user => poolLevel => PoolNode
    // For each pool level, maintains a queue of addresses waiting for child placements
    mapping(uint256 => address[]) public poolQueue; // poolLevel => array of addresses waiting for children
    // For each pool level, tracks the current index in the queue used to find available parents
    mapping(uint256 => uint256) public poolQueueIndex; // poolLevel => current index in queue
    // For each pool level, tracks count of completed nodes (for detecting complete pool)
    mapping(uint256 => uint256) public completedNodesCount; // poolLevel => count of completed nodes
    // For each pool level, maintains ordered list of completed nodes to identify last 4
    mapping(uint256 => address[]) public completedNodesQueue; // poolLevel => ordered list of completed nodes
    // For each user and pool level, tracks reserved income for next pool entry
    mapping(address => mapping(uint256 => uint256)) public reservedIncome; // user => poolLevel => reserved amount
    // For each pool level, tracks the last 4 nodes whose income is reserved
    mapping(uint256 => address[4]) public lastFourNodes; // poolLevel => array of last 4 node addresses
    // For each pool level, tracks the number of trees created (1-15)
    mapping(uint256 => uint256) public treeCount; // poolLevel => number of trees created
    // For each pool level and tree number, tracks if the tree is complete
    mapping(uint256 => mapping(uint256 => bool)) public treeCompleted; // poolLevel => treeNumber => isComplete
    // For each pool level, tracks the current tree number being populated
    mapping(uint256 => uint256) public currentTreeNumber; // poolLevel => current tree number (1-15)
    
    // Level income percentages (in basis points, 10000 = 100%)
    // Defines the percentage share (basis points) allocated to each of the 10 upline levels during retopup distribution
    uint256[10] public levelPercentages = [3000, 1500, 1000, 500, 500, 500, 500, 500, 1000, 1000];
    
    // ============ EVENTS ============
    
    // Emitted whenever a new user registers, recording the user, referrer, and assigned ID
    event UserRegistered(address indexed user, address indexed referrer, uint256 userId);
    // Emitted when a referrer receives direct income, showing the paying downline and amount
    event DirectIncomeEarned(address indexed user, address indexed from, uint256 amount);
    // Emitted when a user earns income from the auto pool at a specific level
    event PoolIncomeEarned(address indexed user, uint256 poolLevel, uint256 amount);
    // Emitted when an upline receives level income from a downline's retopup
    event LevelIncomeEarned(address indexed user, address indexed from, uint256 level, uint256 amount);
    // Emitted whenever a user is placed into the auto pool under a parent at a given level
    event PoolPlacement(address indexed user, uint256 poolLevel, address indexed parent);
    // Emitted when a pool node for a user is completed (both child slots filled)
    event PoolCompleted(address indexed user, uint256 poolLevel);
    // Emitted when a user successfully performs a retopup transaction
    event RetopupCompleted(address indexed user, uint256 amount);
    // Emitted when income is reserved for a user's next pool entry
    event IncomeReserved(address indexed user, uint256 poolLevel, uint256 amount);
    // Emitted when a pool level is completely filled (15 nodes)
    event PoolLevelCompleted(uint256 poolLevel);
    // Emitted when last 4 nodes are identified for a completed pool
    event LastFourNodesIdentified(uint256 poolLevel, address[4] nodes);
    // Emitted when a user auto-progresses to next pool using reserved income
    event AutoProgression(address indexed user, uint256 fromPool, uint256 toPool, uint256 reservedAmountUsed);
    // Emitted when a new tree is formed from last 4 nodes
    event NewTreeFormed(uint256 poolLevel, uint256 treeNumber, address[4] rootNodes);
    // Emitted when max trees reached for a pool level
    event MaxTreesReached(uint256 poolLevel);
    
    // ============ CONSTRUCTOR ============
    
    // Executes once during deployment to set up the token reference and seed the system
    constructor(address _bnbToken, address _companyWallet) {
        // Stores the BEP20 token instance to interact with the WBNB contract at runtime
        bnbToken = IBEP20(_bnbToken);
        // Saves the company wallet address used for collecting fees and initialization
        companyWallet = _companyWallet;

        uint8 decimals = IBEP20Metadata(_bnbToken).decimals();
        require(decimals <= 24, "Unsupported token decimals");
        tokenDecimals = decimals;
        uint256 factor = 10 ** uint256(decimals);
        entryPrice = 20 * factor; // 20 BNB in token units
        retopupPrice = 40 * factor; // 40 BNB in token units
        directIncome = 18 * factor; // 18 BNB in token units
        companyFee = 2 * factor; // 2 BNB in token units
        
        // Register company as first user (ID 1)
        // Assigns the initial user ID of 1 to the company wallet
        users[companyWallet].id = 1;
        // Marks the company wallet as an active user in the system
        users[companyWallet].isActive = true;
        // Links the numeric ID 1 back to the company wallet address
        idToAddress[1] = companyWallet;
        // Increments the lastUserId counter so the next real user receives ID 2
        lastUserId++;
    }
    
    // ============ MAIN FUNCTIONS ============
    
    /**
     * @dev Register a new user with a referrer
     * @param _referrer Address of the referrer (sponsor)
     * @return userId The newly assigned user ID
     */
    // Allows an external caller to join the MLM system with a specified referrer
    function register(address _referrer) external nonReentrant returns (uint256 userId) {
        // Ensures the caller has not registered previously
        require(!users[msg.sender].isActive, "User already registered");
         // Prevents a user from referring themselves to gain benefits
        require(msg.sender != _referrer, "Cannot refer yourself");
        // Ensures the provided referrer is an active participant
        require(users[_referrer].isActive, "Referrer not active");
        
        // Transfer WBNB from user to contract
        // Requests the WBNB token contract to move the entry fee from the user into this contract
        bnbToken.safeTransferFrom(msg.sender, address(this), entryPrice);
        
        // Create new user
        // Assigns a new sequential ID to the registering user
        userId = lastUserId;
        users[msg.sender].id = userId;
        // Records the referrer's address for this user
        users[msg.sender].referrer = _referrer;
        // Marks the new user as active to enable participation in the plan
        users[msg.sender].isActive = true;
        // Stores a reverse lookup from ID to the new user's address
        idToAddress[userId] = msg.sender;
        // Increments the global user counter for the next registration
        lastUserId++;
        
        // Update referrer's referral count
        // Increments the referrer's total direct referral count to reflect this signup
        users[_referrer].referralCount++;
        // Caches the updated referral count for reuse below
        uint256 refCount = users[_referrer].referralCount;
        // Saves the new referral address at the position equal to the referral count
        users[_referrer].referrals[refCount] = msg.sender;
        
        // Emits an event so off-chain systems can track the new registration
        emit UserRegistered(msg.sender, _referrer, userId);
        
        // Process income distribution
        // Delegates logic for distributing the entry fee based on referral count
        _processDirectIncome(_referrer, refCount);
    }
    
    /**
     * @dev Process direct referral income
     * @param _referrer The referrer address
     * @param _refCount Current referral count for this referrer
     */
    // Handles how the entry payment is allocated depending on referral number
    function _processDirectIncome(address _referrer, uint256 _refCount) private {
        // Checks whether this is the second referral which triggers automatic pool placement
        if (_refCount == 2) {
            // 2nd referral: All 20 BNB goes to Auto Pool
            // Places the new referral into the auto pool at level 1 instead of paying direct income
            _placeInAutoPool(msg.sender, 1);
            
        } else {
            // 1st, 3rd, 4th... referrals: 18 BNB to referrer, 2 BNB to company
            // Sends the direct income portion to the referrer using the token transfer function
            bnbToken.safeTransfer(_referrer, directIncome);
            // Updates the referrer's stored direct income total after successful transfer
            users[_referrer].directIncome += directIncome;
            // Emits an event to record this direct income payout
            emit DirectIncomeEarned(_referrer, msg.sender, directIncome);
            
            // Transfers the remaining company fee portion to the company wallet
            bnbToken.safeTransfer(companyWallet, companyFee);
        }
    }
    
    /**
     * @dev Place user in auto pool (binary tree structure)
     * @param _user User to place
     * @param _poolLevel Pool level (1, 2, 3...)
     */
    // Manages placement of users within the auto pool binary tree and distributes rewards
    function _placeInAutoPool(address _user, uint256 _poolLevel) private {
        _initializePoolNode(_user, _poolLevel);

        if (poolQueue[_poolLevel].length == 0) {
            // Check if we've reached max trees for this level
            if (treeCount[_poolLevel] >= MAX_TREES_PER_LEVEL) {
                // Max trees reached - stop creating new trees, send income to company
                emit MaxTreesReached(_poolLevel);
                return;
            }
            
            // Start new tree - increment tree count
            treeCount[_poolLevel]++;
            currentTreeNumber[_poolLevel] = treeCount[_poolLevel];
            poolQueue[_poolLevel].push(_user);
            emit PoolPlacement(_user, _poolLevel, address(0));
            return;
        }

        (bool hasParent, address parent, uint256 parentIndex) = _findAvailableParent(_poolLevel);
        if (!hasParent) {
            // Check if we've reached max trees for this level
            if (treeCount[_poolLevel] >= MAX_TREES_PER_LEVEL) {
                // Max trees reached - stop creating new trees
                emit MaxTreesReached(_poolLevel);
                return;
            }
            
            // Start new tree cycle - reset queue and tracking
            treeCount[_poolLevel]++;
            currentTreeNumber[_poolLevel] = treeCount[_poolLevel];
            delete poolQueue[_poolLevel];
            poolQueue[_poolLevel].push(_user);
            poolQueueIndex[_poolLevel] = 0;
            
            // Reset completed nodes tracking for new tree cycle
            if (completedNodesCount[_poolLevel] >= COMPLETE_POOL_SIZE) {
                // Mark previous tree as completed
                treeCompleted[_poolLevel][currentTreeNumber[_poolLevel] - 1] = true;
                // Clear completed queue for new cycle
                delete completedNodesQueue[_poolLevel];
                completedNodesCount[_poolLevel] = 0;
            }
            
            emit PoolPlacement(_user, _poolLevel, address(0));
            return;
        }

        // Calculates the monetary value required for this pool level based on entry price doubling
        uint256 poolValue = entryPrice << (_poolLevel - 1);
        
        // Place user under parent
        // Checks and assigns the left child slot if it is not yet occupied
        if (!userPools[parent][_poolLevel].leftFilled) {
            // Stores the new user as the left child of the parent at this level
            userPools[parent][_poolLevel].left = _user;
            // Marks that the left slot is now filled to avoid double assignment
            userPools[parent][_poolLevel].leftFilled = true;
        } else if (!userPools[parent][_poolLevel].rightFilled) {
            // Otherwise assigns the user to the right child slot if available
            userPools[parent][_poolLevel].right = _user;
            // Marks that the right slot is now filled
            userPools[parent][_poolLevel].rightFilled = true;
        }
        
        // Initialize child's pool node
        // Sets the child's own pool node with its address
        userPools[_user][_poolLevel].user = _user;
        // Records the level for the child's node
        userPools[_user][_poolLevel].poolLevel = _poolLevel;
        // Store parent reference for distribution
        userPools[_user][_poolLevel].parent = parent;
        // Adds the child to the placement queue for future descendants
        poolQueue[_poolLevel].push(_user);
        
        // Emits a placement event indicating which parent the user was attached to
        emit PoolPlacement(_user, _poolLevel, parent);
        
        // Distribute income immediately up 3 levels (layered distribution)
        _distributePoolIncomeLayered(_user, _poolLevel, poolValue);
        
        // Check if parent's binary is complete (for tracking purposes only)
        // Determines if both child slots have been filled for the parent node
        if (userPools[parent][_poolLevel].leftFilled && 
            userPools[parent][_poolLevel].rightFilled) {
            
            // Marks the parent node as complete to signal no more children are needed
            userPools[parent][_poolLevel].isComplete = true;
            if (poolQueueIndex[_poolLevel] <= parentIndex) {
                poolQueueIndex[_poolLevel] = parentIndex + 1;
            }
            // Emits an event indicating the parent node has been completed
            emit PoolCompleted(parent, _poolLevel);
            
            // Track completed node in order
            completedNodesQueue[_poolLevel].push(parent);
            completedNodesCount[_poolLevel]++;
            
            // Check if this tree is now complete (15 nodes)
            bool isTreeComplete = completedNodesCount[_poolLevel] >= COMPLETE_POOL_SIZE;
            
            // Check if current parent is in last 4 (either from previous completion or current)
            if (isTreeComplete) {
                // Identify last 4 nodes when tree completes (first time - exactly 15 nodes)
                if (completedNodesCount[_poolLevel] == COMPLETE_POOL_SIZE) {
                    uint256 queueLength = completedNodesQueue[_poolLevel].length;
                    if (queueLength >= LAST_NODES_COUNT) {
                        // Get the last 4 nodes from the completed queue
                        address[4] memory lastFour;
                        uint256 startIndex = queueLength - LAST_NODES_COUNT;
                        for (uint256 i = 0; i < LAST_NODES_COUNT; i++) {
                            lastFour[i] = completedNodesQueue[_poolLevel][startIndex + i];
                        }
                        lastFourNodes[_poolLevel] = lastFour;
                        emit LastFourNodesIdentified(_poolLevel, lastFour);
                        
                        // Mark current tree as completed
                        treeCompleted[_poolLevel][currentTreeNumber[_poolLevel]] = true;
                        emit PoolLevelCompleted(_poolLevel);
                        
                        // Form new tree from last 4 nodes at next pool level (if not at max)
                        uint256 nextPoolLevel = _poolLevel + 1;
                        if (treeCount[nextPoolLevel] < MAX_TREES_PER_LEVEL) {
                            // Form new tree from last 4 nodes together
                            _formNewTreeFromLastFour(_poolLevel);
                        } else {
                            emit MaxTreesReached(nextPoolLevel);
                        }
                    }
                }
            }
            
            // Auto-progress parent to next pool level (if not in last 4 and tree not complete)
            if (!isTreeComplete) {
                // Check if parent is in last 4
                bool isLastFour = false;
                address[4] memory storedLastFour = lastFourNodes[_poolLevel];
                for (uint256 i = 0; i < LAST_NODES_COUNT; i++) {
                    if (storedLastFour[i] == parent && storedLastFour[i] != address(0)) {
                        isLastFour = true;
                        break;
                    }
                }
                
                // Auto-progress only if not in last 4
                if (!isLastFour) {
                    _placeInAutoPool(parent, _poolLevel + 1);
                }
            }
            
            // Note: Income distribution is now handled immediately in _distributePoolIncomeLayered
            // This section only tracks tree completion for last 4 nodes identification
        }
    }
    
    /**
     * @dev Distribute pool income in layered manner (3 levels up the tree)
     * @param _user User who was just placed in pool
     * @param _poolLevel Pool level
     * @param _poolValue Total pool value for this level
     */
    function _distributePoolIncomeLayered(address _user, uint256 _poolLevel, uint256 _poolValue) private {
        // Calculate distribution amounts based on percentages
        // Layer 1 (immediate parent): 50% of pool value
        uint256 layer1Amount = _poolValue * 50 / 100;
        // Layer 2 (parent's parent): 25% of pool value
        uint256 layer2Amount = _poolValue * 25 / 100;
        // Layer 3 (parent's parent's parent): 15% of pool value
        uint256 layer3Amount = _poolValue * 15 / 100;
        // Company fee: 10% of pool value
        uint256 poolCompanyFee = _poolValue * 10 / 100;
        
        // Get immediate parent
        address immediateParent = userPools[_user][_poolLevel].parent;
        
        // Check if tree is complete and get last 4 nodes (for all layers)
        bool isTreeComplete = completedNodesCount[_poolLevel] >= COMPLETE_POOL_SIZE;
        address[4] memory storedLastFour = lastFourNodes[_poolLevel];
        
        // Distribute to Layer 1 (immediate parent)
        if (immediateParent != address(0)) {
            // Check if parent is in last 4 (income should be reserved)
            bool isLastFour = false;
            for (uint256 i = 0; i < LAST_NODES_COUNT; i++) {
                if (storedLastFour[i] == immediateParent && storedLastFour[i] != address(0)) {
                    isLastFour = true;
                    break;
                }
            }
            
            if (isTreeComplete && isLastFour) {
                // Reserve income for last 4 nodes
                reservedIncome[immediateParent][_poolLevel] += layer1Amount;
                emit IncomeReserved(immediateParent, _poolLevel, layer1Amount);
            } else {
                // Normal distribution
                bnbToken.safeTransfer(immediateParent, layer1Amount);
                users[immediateParent].poolIncome += layer1Amount;
                emit PoolIncomeEarned(immediateParent, _poolLevel, layer1Amount);
            }
            
            // Get Layer 2 parent (parent's parent)
            address layer2Parent = userPools[immediateParent][_poolLevel].parent;
            if (layer2Parent != address(0)) {
                // Check if layer2 parent is in last 4
                bool isLayer2LastFour = false;
                for (uint256 i = 0; i < LAST_NODES_COUNT; i++) {
                    if (storedLastFour[i] == layer2Parent && storedLastFour[i] != address(0)) {
                        isLayer2LastFour = true;
                        break;
                    }
                }
                
                if (isTreeComplete && isLayer2LastFour) {
                    // Reserve income
                    reservedIncome[layer2Parent][_poolLevel] += layer2Amount;
                    emit IncomeReserved(layer2Parent, _poolLevel, layer2Amount);
                } else {
                    // Normal distribution
                    bnbToken.safeTransfer(layer2Parent, layer2Amount);
                    users[layer2Parent].poolIncome += layer2Amount;
                    emit PoolIncomeEarned(layer2Parent, _poolLevel, layer2Amount);
                }
                
                // Get Layer 3 parent (parent's parent's parent)
                address layer3Parent = userPools[layer2Parent][_poolLevel].parent;
                if (layer3Parent != address(0)) {
                    // Check if layer3 parent is in last 4
                    bool isLayer3LastFour = false;
                    for (uint256 i = 0; i < LAST_NODES_COUNT; i++) {
                        if (storedLastFour[i] == layer3Parent && storedLastFour[i] != address(0)) {
                            isLayer3LastFour = true;
                            break;
                        }
                    }
                    
                    if (isTreeComplete && isLayer3LastFour) {
                        // Reserve income
                        reservedIncome[layer3Parent][_poolLevel] += layer3Amount;
                        emit IncomeReserved(layer3Parent, _poolLevel, layer3Amount);
                    } else {
                        // Normal distribution
                        bnbToken.safeTransfer(layer3Parent, layer3Amount);
                        users[layer3Parent].poolIncome += layer3Amount;
                        emit PoolIncomeEarned(layer3Parent, _poolLevel, layer3Amount);
                    }
                }
            }
        }
        
        // Send company fee
        bnbToken.safeTransfer(companyWallet, poolCompanyFee);
    }
    
    /**
     * @dev Form a new tree from the last 4 nodes of a completed tree
     * @param _fromPoolLevel The pool level that just completed
     */
    function _formNewTreeFromLastFour(uint256 _fromPoolLevel) private {
        uint256 nextPoolLevel = _fromPoolLevel + 1;
        
        // Check if we've reached max trees for next level
        if (treeCount[nextPoolLevel] >= MAX_TREES_PER_LEVEL) {
            emit MaxTreesReached(nextPoolLevel);
            return;
        }
        
        // Get the last 4 nodes
        address[4] memory lastFour = lastFourNodes[_fromPoolLevel];
        uint256 nextPoolEntryPrice = entryPrice << _fromPoolLevel; // Entry price for next level
        
        // Increment tree count for next level and start new tree
        treeCount[nextPoolLevel]++;
        currentTreeNumber[nextPoolLevel] = treeCount[nextPoolLevel];
        
        // Clear the queue for new tree (ensure it's a fresh tree)
        delete poolQueue[nextPoolLevel];
        poolQueueIndex[nextPoolLevel] = 0;
        
        // Reset completed nodes tracking for the new tree
        delete completedNodesQueue[nextPoolLevel];
        completedNodesCount[nextPoolLevel] = 0;
        
        // Place each of the last 4 nodes in the new tree together
        // They will form the first 4 nodes of the new tree (root + 2 children of root + 1 child)
        for (uint256 i = 0; i < LAST_NODES_COUNT; i++) {
            if (lastFour[i] != address(0)) {
                // Check if user has enough reserved income
                if (reservedIncome[lastFour[i]][_fromPoolLevel] >= nextPoolEntryPrice) {
                    // Use reserved income for entry
                    reservedIncome[lastFour[i]][_fromPoolLevel] -= nextPoolEntryPrice;
                    emit AutoProgression(lastFour[i], _fromPoolLevel, nextPoolLevel, nextPoolEntryPrice);
                    
                    // Initialize pool node for next level
                    _initializePoolNode(lastFour[i], nextPoolLevel);
                    
                    // Place in new tree (will be added to queue in order)
                    if (poolQueue[nextPoolLevel].length == 0) {
                        // First node becomes root of new tree
                        poolQueue[nextPoolLevel].push(lastFour[i]);
                        emit PoolPlacement(lastFour[i], nextPoolLevel, address(0));
                    } else {
                        // Subsequent nodes join the tree structure
                        _placeInAutoPool(lastFour[i], nextPoolLevel);
                    }
                }
            }
        }
        
        emit NewTreeFormed(nextPoolLevel, treeCount[nextPoolLevel], lastFour);
    }
    
    /**
     * @dev Find next available parent in pool queue
     * @param _poolLevel Pool level to search
     */
    // Identifies the next user in the queue with an open child spot for placement
    function _findAvailableParent(uint256 _poolLevel) private returns (bool, address, uint256) {
        // Retrieves the current index pointer for this level's queue
        uint256 currentIndex = poolQueueIndex[_poolLevel];
        uint256 length = poolQueue[_poolLevel].length;
        
        // Iterates over queued addresses until a parent with open slots is located
        while (currentIndex < length) {
            // Fetches the candidate parent at the current queue index
            address candidate = poolQueue[_poolLevel][currentIndex];
            
            // Returns the candidate if either left or right slot remains unfilled
            if (!userPools[candidate][_poolLevel].leftFilled || 
                !userPools[candidate][_poolLevel].rightFilled) {
                poolQueueIndex[_poolLevel] = currentIndex;
                return (true, candidate, currentIndex);
            }
            
            // Advances the index to examine the next candidate in the queue
            currentIndex++;
        }
        
        // Updates the stored index after iterating through the queue
        poolQueueIndex[_poolLevel] = currentIndex;
        return (false, address(0), currentIndex);
    }
    
    /**
     * @dev User performs re-topup to activate level income
     */
    // Allows an active user to pay for reactivation and trigger level income distribution
    function retopup() external nonReentrant {
        // Ensures only registered users can perform a retopup
        require(users[msg.sender].isActive, "User not registered");
        
        // Transfer 40 BNB from user
        // Collects the retopup fee from the user via the WBNB token contract
        bnbToken.safeTransferFrom(msg.sender, address(this), retopupPrice);
        
        // Increments the user's retopup counter to track activity
        users[msg.sender].retopupCount++;
        // Emits an event indicating the retopup has been processed successfully
        emit RetopupCompleted(msg.sender, retopupPrice);
        
        // Distribute to 10 levels
        // Triggers the distribution of retopup income up the sponsorship tree
        _distributeLevelIncome(msg.sender);
    }
    
    /**
     * @dev Distribute level income to 10 uplines
     * @param _user User who performed retopup
     */
    // Sends the retopup payment through up to ten levels of sponsors based on configured percentages
    function _distributeLevelIncome(address _user) private {
        // Starts with the direct referrer of the user performing the retopup
        address currentUpline = users[_user].referrer;
        // Tracks the total amount distributed to ensure any remainder goes to the company
        uint256 totalDistributed = 0;
        
        // Iterates up to ten levels of upline sponsors
        for (uint256 i = 0; i < 10; i++) {
            // Stops distribution if the chain reaches the root or the company wallet
            if (currentUpline == address(0) || currentUpline == companyWallet) {
                break;
            }
            
            // Calculate income for this level
            // Computes the payout amount for the current level using basis point percentages
            uint256 levelIncome = (retopupPrice * levelPercentages[i]) / 10000;
            
            // Check if the upline user has done a retopup
            if (users[currentUpline].retopupCount > 0) {
                // Upline has done retopup: send income to upline
                // Executes the transfer of level income to the current upline
                bnbToken.safeTransfer(currentUpline, levelIncome);
                
                // Updates the cumulative level income earned by this upline
                users[currentUpline].levelIncome += levelIncome;
                
                // Emits an event recording the level income transfer details
                emit LevelIncomeEarned(currentUpline, _user, i + 1, levelIncome);
            } else {
                // Upline has not done retopup: send their share to company wallet
                bnbToken.safeTransfer(companyWallet, levelIncome);
            }
            
            // Adds the payout to the running total distributed amount
            totalDistributed += levelIncome;
            
            // Move to next upline
            // Advances the traversal to the next referrer up the chain
            currentUpline = users[currentUpline].referrer;
        }
        
        // Send company fee (10% of 40 BNB = 4 BNB)
        // Calculates the remaining balance after level distributions to send to the company
        uint256 companyFeeRetopup = retopupPrice - totalDistributed;
        // Transfers the remaining amount to the company wallet as the fee portion
        bnbToken.safeTransfer(companyWallet, companyFeeRetopup);
    }

    function _initializePoolNode(address _user, uint256 _poolLevel) private {
        PoolNode storage node = userPools[_user][_poolLevel];
        node.user = _user;
        node.left = address(0);
        node.right = address(0);
        node.parent = address(0);
        node.poolLevel = _poolLevel;
        node.leftFilled = false;
        node.rightFilled = false;
        node.isComplete = false;
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get user details
     */
    // Allows external callers to fetch key information about a specified user
    function getUserInfo(address _user) external view returns (
        uint256 id,
        address referrer,
        uint256 referralCount,
        uint256 directIncomeAmount,
        uint256 poolIncomeAmount,
        uint256 levelIncomeAmount,
        bool isActive,
        uint256 retopupCount
    ) {
        // Loads the user's storage struct into a local reference for return values
        User storage user = users[_user];
        // Returns a tuple containing the requested user metrics
        return (
            user.id,
            user.referrer,
            user.referralCount,
            user.directIncome,
            user.poolIncome,
            user.levelIncome,
            user.isActive,
            user.retopupCount
        );
    }
    
    /**
     * @dev Get user's referrals
     */
    // Returns a list of direct referral addresses for a user up to a specified count
    function getUserReferrals(address _user, uint256 _count) external view returns (address[] memory) {
        // Allocates a dynamic array in memory to hold the referral addresses to return
        address[] memory referrals = new address[](_count);
        // Iterates from 1 to the requested count to copy stored referral addresses
        for (uint256 i = 1; i <= _count; i++) {
            // Copies each referral from the user mapping into the memory array (1-based to 0-based index shift)
            referrals[i - 1] = users[_user].referrals[i];
        }
        // Returns the populated array of referral addresses to the caller
        return referrals;
    }
    
    /**
     * @dev Get pool node information
     */
    // Provides detailed information about a user's position within a specific pool level
    function getPoolNode(address _user, uint256 _poolLevel) external view returns (
        address user,
        address left,
        address right,
        address parent,
        uint256 poolLevel,
        bool leftFilled,
        bool rightFilled,
        bool isComplete
    ) {
        // Fetches the stored pool node data for the user and requested level
        PoolNode storage node = userPools[_user][_poolLevel];
        // Returns all node attributes for external inspection or visualization
        return (
            node.user,
            node.left,
            node.right,
            node.parent,
            node.poolLevel,
            node.leftFilled,
            node.rightFilled,
            node.isComplete
        );
    }
    
    /**
     * @dev Get total earnings for a user
     */
    // Calculates and returns the sum of all income streams for a specific user
    function getTotalEarnings(address _user) external view returns (uint256) {
        // Adds together direct, pool, and level income totals for the given user address
        return users[_user].directIncome + users[_user].poolIncome + users[_user].levelIncome;
    }
    
    /**
     * @dev Get reserved income for a user at a specific pool level
     * @param _user User address
     * @param _poolLevel Pool level to check
     * @return Reserved income amount
     */
    function getReservedIncome(address _user, uint256 _poolLevel) external view returns (uint256) {
        return reservedIncome[_user][_poolLevel];
    }
    
    /**
     * @dev Get last 4 nodes for a completed pool level
     * @param _poolLevel Pool level to check
     * @return Array of last 4 node addresses
     */
    function getLastFourNodes(uint256 _poolLevel) external view returns (address[4] memory) {
        return lastFourNodes[_poolLevel];
    }
    
    /**
     * @dev Get completed nodes count for a pool level
     * @param _poolLevel Pool level to check
     * @return Count of completed nodes
     */
    function getCompletedNodesCount(uint256 _poolLevel) external view returns (uint256) {
        return completedNodesCount[_poolLevel];
    }
    
    /**
     * @dev Check if a pool level is complete (15 nodes)
     * @param _poolLevel Pool level to check
     * @return True if pool is complete
     */
    function isPoolLevelComplete(uint256 _poolLevel) external view returns (bool) {
        return completedNodesCount[_poolLevel] >= COMPLETE_POOL_SIZE;
    }
    
    /**
     * @dev Process auto-progression for a user if they have sufficient reserved income
     * @param _user User address to check
     * @param _fromPool Pool level to progress from
     */
    function processAutoProgression(address _user, uint256 _fromPool) external {
        uint256 nextPoolLevel = _fromPool + 1;
        uint256 nextPoolEntryPrice = entryPrice << _fromPool;
        
        require(reservedIncome[_user][_fromPool] >= nextPoolEntryPrice, "Insufficient reserved income");
        
        // Use reserved income for next pool entry
        uint256 amountUsed = nextPoolEntryPrice;
        reservedIncome[_user][_fromPool] -= amountUsed;
        emit AutoProgression(_user, _fromPool, nextPoolLevel, amountUsed);
        
        // Place in next pool level
        _placeInAutoPool(_user, nextPoolLevel);
    }
    
    /**
     * @dev Get tree count for a pool level
     * @param _poolLevel Pool level to check
     * @return Number of trees created for this level
     */
    function getTreeCount(uint256 _poolLevel) external view returns (uint256) {
        return treeCount[_poolLevel];
    }
    
    /**
     * @dev Get current tree number for a pool level
     * @param _poolLevel Pool level to check
     * @return Current tree number being populated
     */
    function getCurrentTreeNumber(uint256 _poolLevel) external view returns (uint256) {
        return currentTreeNumber[_poolLevel];
    }
    
    /**
     * @dev Check if a tree is completed
     * @param _poolLevel Pool level to check
     * @param _treeNumber Tree number to check
     * @return True if tree is completed
     */
    function isTreeCompleted(uint256 _poolLevel, uint256 _treeNumber) external view returns (bool) {
        return treeCompleted[_poolLevel][_treeNumber];
    }
    
    /**
     * @dev Check if max trees reached for a pool level
     * @param _poolLevel Pool level to check
     * @return True if max trees (15) reached
     */
    function isMaxTreesReached(uint256 _poolLevel) external view returns (bool) {
        return treeCount[_poolLevel] >= MAX_TREES_PER_LEVEL;
    }
}
