// Explains the license identifier required by the Solidity compiler to display usage rights for the source code
// SPDX-License-Identifier: MIT
// Specifies the version of the Solidity compiler this contract requires (0.8.0 or higher but less than 0.9.0)
pragma solidity ^0.8.0;

// Declares an interface for interacting with an ERC20-compliant token (in this case USDT)
interface IERC20 {
    // Defines the function signature for transferring tokens from one address to another with prior allowance
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    // Defines the function signature for transferring tokens directly from the caller to a recipient
    function transfer(address recipient, uint256 amount) external returns (bool);
}

// Declares the main contract that implements the MLM system logic
contract MLMSystem {
    
    // ============ STATE VARIABLES ============
    
    // Holds a reference to the USDT token contract so we can invoke ERC20 functions
    IERC20 public usdtToken;
    // Stores the wallet address owned by the company to receive fees
    address public companyWallet;
    // Tracks the next user id to assign, starting at 1 (company is the first user)
    uint256 public lastUserId = 1;
    
    // Constants
    // Sets the buy-in price for new users to join the system (20 USDT with 18 decimals)
    uint256 public constant ENTRY_PRICE = 20 * 10**18; // $20 in USDT (18 decimals)
    // Sets the required amount for a user to perform a retopup (40 USDT)
    uint256 public constant RETOPUP_PRICE = 40 * 10**18; // $40 in USDT
    // Defines the payout amount sent to referrers for most direct referrals (18 USDT)
    uint256 public constant DIRECT_INCOME = 18 * 10**18; // $18
    // Defines the fee retained by the company on each qualifying direct referral (2 USDT)
    uint256 public constant COMPANY_FEE = 2 * 10**18; // $2
    
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
    
    // ============ CONSTRUCTOR ============
    
    // Executes once during deployment to set up the token reference and seed the system
    constructor(address _usdtToken, address _companyWallet) {
        // Stores the ERC20 token instance to interact with the USDT contract at runtime
        usdtToken = IERC20(_usdtToken);
        // Saves the company wallet address used for collecting fees and initialization
        companyWallet = _companyWallet;
        
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
     */
    // Allows an external caller to join the MLM system with a specified referrer
    function register(address _referrer) external {
        // Ensures the caller has not registered previously
        require(!users[msg.sender].isActive, "User already registered");
         // Prevents a user from referring themselves to gain benefits
        require(msg.sender != _referrer, "Cannot refer yourself");
        // Ensures the provided referrer is an active participant
        require(users[_referrer].isActive, "Referrer not active");
        
        // Transfer USDT from user to contract
        // Requests the USDT token contract to move the entry fee from the user into this contract
        require(
            usdtToken.transferFrom(msg.sender, address(this), ENTRY_PRICE),
            "USDT transfer failed"
        );
        
        // Create new user
        // Assigns a new sequential ID to the registering user
        users[msg.sender].id = lastUserId;
        // Records the referrer's address for this user
        users[msg.sender].referrer = _referrer;
        // Marks the new user as active to enable participation in the plan
        users[msg.sender].isActive = true;
        // Stores a reverse lookup from ID to the new user's address
        idToAddress[lastUserId] = msg.sender;
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
        emit UserRegistered(msg.sender, _referrer, users[msg.sender].id);
        
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
            // 2nd referral: All $20 goes to Auto Pool
            // Places the new referral into the auto pool at level 1 instead of paying direct income
            _placeInAutoPool(msg.sender, 1);
            
        } else {
            // 1st, 3rd, 4th... referrals: $18 to referrer, $2 to company
            // Sends the direct income portion to the referrer using the token transfer function
            require(
                usdtToken.transfer(_referrer, DIRECT_INCOME),
                "Direct income transfer failed"
            );
            // Updates the referrer's stored direct income total after successful transfer
            users[_referrer].directIncome += DIRECT_INCOME;
            // Emits an event to record this direct income payout
            emit DirectIncomeEarned(_referrer, msg.sender, DIRECT_INCOME);
            
            // Transfers the remaining company fee portion to the company wallet
            require(
                usdtToken.transfer(companyWallet, COMPANY_FEE),
                "Company fee transfer failed"
            );
        }
    }
    
    /**
     * @dev Place user in auto pool (binary tree structure)
     * @param _user User to place
     * @param _poolLevel Pool level (1, 2, 3...)
     */
    // Manages placement of users within the auto pool binary tree and distributes rewards
    function _placeInAutoPool(address _user, uint256 _poolLevel) private {
        // Calculates the monetary value required for this pool level based on entry price doubling
        uint256 poolValue = ENTRY_PRICE * (2 ** (_poolLevel - 1));
        // Determines the portion of the pool value that will be paid out to the parent user
        uint256 distribution = poolValue * 90 / 100; // 90% distributed
        // Determines the portion retained by the company as fees at this level
        uint256 fee = poolValue * 10 / 100; // 10% company fee
        
        // If this is first placement in this pool level, user becomes root
        // Checks whether this level has any users yet and if not sets the first user as root
        if (poolQueue[_poolLevel].length == 0) {
            // Records the user occupying this node in the pool
            userPools[_user][_poolLevel].user = _user;
            // Stores the level within the user's pool node for reference
            userPools[_user][_poolLevel].poolLevel = _poolLevel;
            // Adds the user to the queue for potential child assignments
            poolQueue[_poolLevel].push(_user);
            // Emits an event noting placement without a parent since this is the root
            emit PoolPlacement(_user, _poolLevel, address(0));
            // Ends execution because no further placement actions are needed for the root
            return;
        }
        
        // Find parent who needs children
        // Retrieves the next parent in the queue who still has an open child slot
        address parent = _findAvailableParent(_poolLevel);
        
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
        // Adds the child to the placement queue for future descendants
        poolQueue[_poolLevel].push(_user);
        
        // Emits a placement event indicating which parent the user was attached to
        emit PoolPlacement(_user, _poolLevel, parent);
        
        // Check if parent's binary is complete
        // Determines if both child slots have been filled for the parent node
        if (userPools[parent][_poolLevel].leftFilled && 
            userPools[parent][_poolLevel].rightFilled) {
            
            // Marks the parent node as complete to signal no more children are needed
            userPools[parent][_poolLevel].isComplete = true;
            // Emits an event indicating the parent node has been completed
            emit PoolCompleted(parent, _poolLevel);
            
            // Distribute pool income to parent
            // Transfers the calculated distribution amount to the parent user
            require(
                usdtToken.transfer(parent, distribution),
                "Pool income transfer failed"
            );
            // Updates the parent's cumulative pool income with the amount just transferred
            users[parent].poolIncome += distribution;
            // Emits an event to log the pool income payment
            emit PoolIncomeEarned(parent, _poolLevel, distribution);
            
            // Company fee
            // Transfers the company fee portion of the pool payout
            require(
                usdtToken.transfer(companyWallet, fee),
                "Company fee transfer failed"
            );
            
            // Auto-upgrade to next pool
            // Recursively places the parent into the next pool level for automatic upgrading
            _placeInAutoPool(parent, _poolLevel + 1);
        }
    }
    
    /**
     * @dev Find next available parent in pool queue
     * @param _poolLevel Pool level to search
     */
    // Identifies the next user in the queue with an open child spot for placement
    function _findAvailableParent(uint256 _poolLevel) private returns (address) {
        // Retrieves the current index pointer for this level's queue
        uint256 currentIndex = poolQueueIndex[_poolLevel];
        
        // Iterates over queued addresses until a parent with open slots is located
        while (currentIndex < poolQueue[_poolLevel].length) {
            // Fetches the candidate parent at the current queue index
            address candidate = poolQueue[_poolLevel][currentIndex];
            
            // Returns the candidate if either left or right slot remains unfilled
            if (!userPools[candidate][_poolLevel].leftFilled || 
                !userPools[candidate][_poolLevel].rightFilled) {
                return candidate;
            }
            
            // Advances the index to examine the next candidate in the queue
            currentIndex++;
        }
        
        // Updates the stored index after iterating through the queue
        poolQueueIndex[_poolLevel] = currentIndex;
        // Returns the candidate at the current index (assumes a valid entry exists)
        return poolQueue[_poolLevel][currentIndex];
    }
    
    /**
     * @dev User performs re-topup to activate level income
     */
    // Allows an active user to pay for reactivation and trigger level income distribution
    function retopup() external {
        // Ensures only registered users can perform a retopup
        require(users[msg.sender].isActive, "User not registered");
        
        // Transfer $40 USDT from user
        // Collects the retopup fee from the user via the USDT token contract
        require(
            usdtToken.transferFrom(msg.sender, address(this), RETOPUP_PRICE),
            "USDT transfer failed"
        );
        
        // Increments the user's retopup counter to track activity
        users[msg.sender].retopupCount++;
        // Emits an event indicating the retopup has been processed successfully
        emit RetopupCompleted(msg.sender, RETOPUP_PRICE);
        
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
            uint256 levelIncome = (RETOPUP_PRICE * levelPercentages[i]) / 10000;
            
            // Executes the transfer of level income to the current upline
            require(
                usdtToken.transfer(currentUpline, levelIncome),
                "Level income transfer failed"
            );
            
            // Updates the cumulative level income earned by this upline
            users[currentUpline].levelIncome += levelIncome;
            // Adds the payout to the running total distributed amount
            totalDistributed += levelIncome;
            
            // Emits an event recording the level income transfer details
            emit LevelIncomeEarned(currentUpline, _user, i + 1, levelIncome);
            
            // Move to next upline
            // Advances the traversal to the next referrer up the chain
            currentUpline = users[currentUpline].referrer;
        }
        
        // Send company fee (10% of $40 = $4)
        // Calculates the remaining balance after level distributions to send to the company
        uint256 companyFee = RETOPUP_PRICE - totalDistributed;
        // Transfers the remaining amount to the company wallet as the fee portion
        require(
            usdtToken.transfer(companyWallet, companyFee),
            "Company fee transfer failed"
        );
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
        uint256 directIncome,
        uint256 poolIncome,
        uint256 levelIncome,
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
}
