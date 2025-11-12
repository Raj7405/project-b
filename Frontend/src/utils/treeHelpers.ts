/**
 * Helper functions to convert blockchain data to Binary Tree structure
 */

export interface TreeNode {
  id: string
  name: string
  isRoot?: boolean
  isActive?: boolean
  isEmpty?: boolean
  status?: 'active' | 'pending'
  earnings?: number
  left?: TreeNode
  right?: TreeNode
}

/**
 * Fetch user's binary tree data from smart contract
 * @param contract - The smart contract instance
 * @param rootUserId - The root user ID to start from
 * @param maxDepth - Maximum depth to fetch (default: 4 levels)
 */
export async function fetchBinaryTreeData(
  contract: any,
  rootUserId: string,
  maxDepth: number = 4
): Promise<TreeNode | null> {
  try {
    return await buildTreeRecursive(contract, rootUserId, 0, maxDepth, true)
  } catch (error) {
    console.error('Error fetching tree data:', error)
    return null
  }
}

/**
 * Recursively build the tree structure
 */
async function buildTreeRecursive(
  contract: any,
  userId: string,
  currentDepth: number,
  maxDepth: number,
  isRoot: boolean = false
): Promise<TreeNode | null> {
  // Stop if we've reached max depth
  if (currentDepth >= maxDepth) {
    return null
  }

  try {
    // Check if user exists
    if (userId === '0' || !userId) {
      return {
        id: `empty-${Math.random()}`,
        name: 'Empty',
        isEmpty: true,
      }
    }

    // Get user info from contract
    const userInfo = await contract.userInfo(userId)
    const [wallet, parentId, sponsorCount, exists, hasReTopup] = userInfo

    if (!exists) {
      return {
        id: `empty-${Math.random()}`,
        name: 'Empty',
        isEmpty: true,
      }
    }

    // Get user's children from the binary tree
    // Note: You'll need to add functions to your contract to get left and right children
    // For now, we'll use placeholder logic
    let leftChildId = '0'
    let rightChildId = '0'

    // Try to get children if your contract has these functions
    try {
      // Uncomment these when you add them to your contract
      // leftChildId = await contract.getLeftChild(userId)
      // rightChildId = await contract.getRightChild(userId)
    } catch (e) {
      // Children getters not implemented in contract
    }

    // Recursively build left and right subtrees
    const leftChild =
      leftChildId !== '0'
        ? await buildTreeRecursive(contract, leftChildId, currentDepth + 1, maxDepth)
        : {
            id: `empty-left-${userId}`,
            name: 'Empty',
            isEmpty: true,
          }

    const rightChild =
      rightChildId !== '0'
        ? await buildTreeRecursive(contract, rightChildId, currentDepth + 1, maxDepth)
        : {
            id: `empty-right-${userId}`,
            name: 'Empty',
            isEmpty: true,
          }

    // Format wallet address
    const shortWallet = `${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}`

    // Create tree node
    const node: TreeNode = {
      id: userId,
      name: isRoot ? 'You' : `Member ${userId}`,
      isRoot,
      isActive: hasReTopup,
      status: hasReTopup ? 'active' : 'pending',
      earnings: calculateEarnings(Number(sponsorCount), hasReTopup),
      left: leftChild,
      right: rightChild,
    }

    return node
  } catch (error) {
    console.error(`Error building tree for user ${userId}:`, error)
    return null
  }
}

/**
 * Calculate estimated earnings based on sponsor count and retopup status
 * This is a placeholder - replace with actual earnings from contract
 */
function calculateEarnings(sponsorCount: number, hasReTopup: boolean): number {
  if (!hasReTopup) return 0
  // Simple calculation: $18 per direct referral
  return sponsorCount * 18
}

/**
 * Sample tree data for testing
 */
export function getSampleTreeData(): TreeNode {
  return {
    id: '1',
    name: 'You',
    isRoot: true,
    isActive: true,
    status: 'active',
    earnings: 180,
    left: {
      id: '2',
      name: 'Member 2',
      isActive: true,
      status: 'active',
      earnings: 72,
      left: {
        id: '4',
        name: 'Member 4',
        isActive: true,
        status: 'active',
        earnings: 18,
        left: {
          id: '8',
          name: 'Member 8',
          isActive: false,
          status: 'pending',
          earnings: 0,
        },
        right: {
          id: '9',
          name: 'Empty',
          isEmpty: true,
        },
      },
      right: {
        id: '5',
        name: 'Member 5',
        isActive: true,
        status: 'active',
        earnings: 36,
        left: {
          id: '10',
          name: 'Empty',
          isEmpty: true,
        },
        right: {
          id: '11',
          name: 'Empty',
          isEmpty: true,
        },
      },
    },
    right: {
      id: '3',
      name: 'Member 3',
      isActive: true,
      status: 'active',
      earnings: 54,
      left: {
        id: '6',
        name: 'Member 6',
        isActive: false,
        status: 'pending',
        earnings: 0,
      },
      right: {
        id: '7',
        name: 'Member 7',
        isActive: true,
        status: 'active',
        earnings: 18,
        left: {
          id: '12',
          name: 'Empty',
          isEmpty: true,
        },
        right: {
          id: '13',
          name: 'Empty',
          isEmpty: true,
        },
      },
    },
  }
}

