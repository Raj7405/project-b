'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { buildTreeFromContract } from '@/utils/treeBuilder'
import BinaryTree from './BinaryTree'

export default function BinaryTreeLive() {
  const { contract, account } = useWeb3()
  const [treeData, setTreeData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [poolLevel, setPoolLevel] = useState(1)

  useEffect(() => {
    if (contract && account) {
      loadTree()
    }
  }, [contract, account, poolLevel])

  async function loadTree() {
    setLoading(true)
    try {
      const data = await buildTreeFromContract(contract, account, poolLevel)
      console.log("data",data)
      setTreeData(data)
    } catch (error) {
      console.error('Error loading tree:', error)
    }
    setLoading(false)
  }

  if (!account) {
    return (
      <div className="gradient-card p-8 text-center">
        <p className="text-gray-400">Connect wallet to view your tree</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="gradient-card p-8 text-center">
        <p className="text-gray-400">Loading tree...</p>
      </div>
    )
  }

  if (!treeData) {
    return (
      <div className="gradient-card p-8 text-center">
        <p className="text-gray-400">No tree data available</p>
      </div>
    )
  }

  return (
    <div>
      {/* Pool Level Selector */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setPoolLevel(1)}
          className={`px-4 py-2 rounded ${
            poolLevel === 1 ? 'bg-blue-600' : 'bg-gray-700'
          }`}
        >
          Level 1
        </button>
        <button
          onClick={() => setPoolLevel(2)}
          className={`px-4 py-2 rounded ${
            poolLevel === 2 ? 'bg-blue-600' : 'bg-gray-700'
          }`}
        >
          Level 2
        </button>
        <button
          onClick={() => setPoolLevel(3)}
          className={`px-4 py-2 rounded ${
            poolLevel === 3 ? 'bg-blue-600' : 'bg-gray-700'
          }`}
        >
          Level 3
        </button>
        <button
          onClick={loadTree}
          className="px-4 py-2 rounded bg-green-600 ml-auto"
        >
          Refresh
        </button>
      </div>

      {/* Tree */}
      <BinaryTree treeData={treeData} />
    </div>
  )
}

