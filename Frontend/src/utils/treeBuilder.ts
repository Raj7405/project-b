import { ethers } from 'ethers'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export async function buildTreeFromContract(
  contract: any,
  userAddress: string,
  poolLevel: number = 1
) {
  try {
    return await buildNode(contract, userAddress, poolLevel, true)
  } catch (error) {
    console.error('Error building tree:', error)
    return null
  }
}

async function buildNode(
  contract: any,
  address: string,
  poolLevel: number,
  isRoot: boolean = false
): Promise<any> {
  if (!address || address === ZERO_ADDRESS) {
    return null
  }

  // Get pool node data
  const poolNode = await contract.getPoolNode(address, poolLevel)
  console.log("poolNode",poolNode)
  
  // Get user info
  const userInfo = await contract.getUserInfo(address)

  // Build tree node
  const node: any = {
    id: userInfo.id.toString(),
    name: isRoot ? 'You' : `User ${userInfo.id.toString()}`,
    isRoot,
    isActive: userInfo.isActive,
    status: userInfo.isActive ? 'active' : 'pending',
    earnings: parseFloat(ethers.formatUnits(
      userInfo.directIncomeAmount + userInfo.poolIncomeAmount + userInfo.levelIncomeAmount,
      18
    )).toFixed(2),
  }

  // Recursively build children
  if (poolNode.leftFilled && poolNode.left !== ZERO_ADDRESS) {
    node.left = await buildNode(contract, poolNode.left, poolLevel, false)
  } else {
    node.left = {
      id: `empty-left-${node.id}`,
      name: 'Empty',
      isEmpty: true,
    }
  }

  if (poolNode.rightFilled && poolNode.right !== ZERO_ADDRESS) {
    node.right = await buildNode(contract, poolNode.right, poolLevel, false)
  } else {
    node.right = {
      id: `empty-right-${node.id}`,
      name: 'Empty',
      isEmpty: true,
    }
  }

  return node
}

