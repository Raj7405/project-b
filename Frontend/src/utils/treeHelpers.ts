/**
 * Helper functions to convert blockchain data to Binary Tree structure
 */

import { ethers } from 'ethers'

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

    // Convert userId to address using idToAddress mapping
    let userAddress: string
    try {
      userAddress = await contract.idToAddress(userId)
      if (!userAddress || userAddress === ethers.ZeroAddress) {
        return {
          id: `empty-${Math.random()}`,
          name: 'Empty',
          isEmpty: true,
        }
      }
    } catch (error) {
      // User ID doesn't exist
      return {
        id: `empty-${Math.random()}`,
        name: 'Empty',
        isEmpty: true,
      }
    }

    // Get user info from contract using address
    let userInfo
    try {
      userInfo = await contract.getUserInfo(userAddress)
    } catch (error) {
      // User doesn't exist or is not active
      return {
        id: `empty-${Math.random()}`,
        name: 'Empty',
        isEmpty: true,
      }
    }

    if (!userInfo.isActive) {
      return {
        id: `empty-${Math.random()}`,
        name: 'Empty',
        isEmpty: true,
      }
    }

    // Get user's pool node information for level 1
    // Note: The contract uses pool levels, not direct left/right children
    // We'll use pool node structure to build the tree
    let leftChildAddress: string | null = null
    let rightChildAddress: string | null = null

    try {
      const poolNode = await contract.getPoolNode(userAddress, 1) // Level 1 pool
      if (poolNode.left && poolNode.left !== ethers.ZeroAddress) {
        leftChildAddress = poolNode.left
      }
      if (poolNode.right && poolNode.right !== ethers.ZeroAddress) {
        rightChildAddress = poolNode.right
      }
    } catch (e) {
      // Pool node not found or error - continue with empty children
    }

    // Get left and right child user IDs if addresses exist
    let leftChildId: string | null = null
    let rightChildId: string | null = null

    // Try to find user IDs for left and right children by checking referrals
    // Note: This is a simplified approach - you may need to adjust based on your contract structure
    try {
      if (leftChildAddress) {
        const leftChildInfo = await contract.getUserInfo(leftChildAddress)
        leftChildId = leftChildInfo.id.toString()
      }
      if (rightChildAddress) {
        const rightChildInfo = await contract.getUserInfo(rightChildAddress)
        rightChildId = rightChildInfo.id.toString()
      }
    } catch (e) {
      // Could not get child info
    }

    // Recursively build left and right subtrees
    const leftChild = leftChildId
      ? await buildTreeRecursive(contract, leftChildId, currentDepth + 1, maxDepth)
      : {
          id: `empty-left-${userId}`,
          name: 'Empty',
          isEmpty: true,
        }

    const rightChild = rightChildId
      ? await buildTreeRecursive(contract, rightChildId, currentDepth + 1, maxDepth)
      : {
          id: `empty-right-${userId}`,
          name: 'Empty',
          isEmpty: true,
        }

    // Format wallet address
    const shortWallet = `${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`

    // Create tree node
    const node: TreeNode = {
      id: userId,
      name: isRoot ? 'You' : `Member ${userId}`,
      isRoot,
      isActive: userInfo.retopupCount > 0,
      status: userInfo.retopupCount > 0 ? 'active' : 'pending',
      earnings: calculateEarnings(Number(userInfo.referralCount), userInfo.retopupCount > 0),
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

