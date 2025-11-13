'use client'

import React, { useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  ConnectionLineType,
  Handle,
  Position,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { FaUser, FaUserCheck, FaUserPlus } from 'react-icons/fa'

// Custom Node Component
const CustomNode = ({ data }: any) => {
  const isActive = data.isActive
  const isEmpty = data.isEmpty
  const isRoot = data.isRoot

  return (
    <div
      className={`px-6 py-4 rounded-lg shadow-lg border-2 min-w-[140px] transition-all hover:scale-105 ${
        isRoot
          ? 'bg-gradient-to-br from-purple-600 to-blue-600 border-purple-400'
          : isEmpty
          ? 'bg-gray-800/50 border-gray-600 border-dashed'
          : isActive
          ? 'bg-gradient-to-br from-green-600 to-emerald-600 border-green-400'
          : 'bg-gradient-to-br from-blue-600 to-cyan-600 border-blue-400'
      }`}
    >
      {/* Target Handle (top) - for incoming edges */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555', width: '8px', height: '8px' }}
      />
      
      <div className="flex flex-col items-center space-y-2">
        {/* Icon */}
        <div className="text-white text-2xl">
          {isEmpty ? (
            <FaUserPlus className="opacity-50" />
          ) : isActive ? (
            <FaUserCheck />
          ) : (
            <FaUser />
          )}
        </div>

        {/* Name/ID */}
        <div className="text-white font-semibold text-sm text-center">
          {data.label}
        </div>

        {/* User ID */}
        {!isEmpty && (
          <div className="text-white/80 text-xs">ID: {data.userId}</div>
        )}

        {/* Status Badge */}
        {data.status && (
          <div
            className={`text-xs px-2 py-1 rounded-full ${
              data.status === 'active'
                ? 'bg-green-500/20 text-green-200'
                : 'bg-yellow-500/20 text-yellow-200'
            }`}
          >
            {data.status}
          </div>
        )}

        {/* Earnings */}
        {data.earnings !== undefined && (
          <div className="text-white/90 text-xs font-bold">
            ${data.earnings}
          </div>
        )}
      </div>

      {/* Source Handle (bottom) - for outgoing edges */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555', width: '8px', height: '8px' }}
      />
    </div>
  )
}

// Helper function to generate binary tree layout
const generateBinaryTreeLayout = (
  data: any,
  x = 0,
  y = 0,
  level = 0,
  horizontalSpacing = 250,
  verticalSpacing = 200
): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = []
  const edges: Edge[] = []

  const spacing = horizontalSpacing / Math.pow(2, level)

  // Add current node
  nodes.push({
    id: data.id,
    type: 'custom',
    position: { x, y },
    data: {
      label: data.name,
      userId: data.id,
      isActive: data.isActive,
      isEmpty: data.isEmpty,
      isRoot: data.isRoot,
      status: data.status,
      earnings: data.earnings,
    },
  })

  // Add left child
  if (data.left) {
    const leftResult = generateBinaryTreeLayout(
      data.left,
      x - spacing,
      y + verticalSpacing,
      level + 1,
      horizontalSpacing,
      verticalSpacing
    )
    nodes.push(...leftResult.nodes)
    edges.push(...leftResult.edges)
    
    const edgeColor = data.left.isEmpty 
      ? '#6b7280' 
      : data.left.isActive 
      ? '#10b981' 
      : '#3b82f6'
    
    edges.push({
      id: `${data.id}-${data.left.id}`,
      source: data.id,
      target: data.left.id,
      type: 'smoothstep',
      animated: data.left.isActive && !data.left.isEmpty,
      style: { 
        stroke: edgeColor, 
        strokeWidth: 3,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edgeColor,
        width: 25,
        height: 25,
      },
    })
  }

  // Add right child
  if (data.right) {
    const rightResult = generateBinaryTreeLayout(
      data.right,
      x + spacing,
      y + verticalSpacing,
      level + 1,
      horizontalSpacing,
      verticalSpacing
    )
    nodes.push(...rightResult.nodes)
    edges.push(...rightResult.edges)
    
    const edgeColor = data.right.isEmpty 
      ? '#6b7280' 
      : data.right.isActive 
      ? '#10b981' 
      : '#3b82f6'
    
    edges.push({
      id: `${data.id}-${data.right.id}`,
      source: data.id,
      target: data.right.id,
      type: 'smoothstep',
      animated: data.right.isActive && !data.right.isEmpty,
      style: { 
        stroke: edgeColor, 
        strokeWidth: 3,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edgeColor,
        width: 25,
        height: 25,
      },
    })
  }

  return { nodes, edges }
}

// Sample binary tree data
const sampleBinaryTreeData = {
  id: '1',
  name: 'You',
  isRoot: true,
  isActive: true,
  status: 'active',
  earnings: 180,
  left: {
    id: '2',
    name: 'Member A',
    isActive: true,
    status: 'active',
    earnings: 72,
    left: {
      id: '4',
      name: 'Member D',
      isActive: true,
      status: 'active',
      earnings: 18,
      left: {
        id: '8',
        name: 'Member H',
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
      name: 'Member E',
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
    name: 'Member B',
    isActive: true,
    status: 'active',
    earnings: 54,
    left: {
      id: '6',
      name: 'Member F',
      isActive: false,
      status: 'pending',
      earnings: 0,
    },
    right: {
      id: '7',
      name: 'Member G',
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

interface BinaryTreeStructureProps {
  treeData?: any
  height?: string
}

export default function BinaryTreeStructure({ 
  treeData = sampleBinaryTreeData, 
  height = '800px' 
}: BinaryTreeStructureProps) {
  // Memoize nodeTypes to prevent React Flow warnings
  const nodeTypes = useMemo(
    () => ({
      custom: CustomNode,
    }),
    []
  )

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => generateBinaryTreeLayout(treeData, 400, 50, 0, 350, 300),
    [treeData]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div className="w-full" style={{ height }}>
      <div className="gradient-card overflow-hidden h-full">
        <div className="gradient-card-inner h-full p-4">
          {/* Header */}
          <div className="mb-4">
            <h3 className="text-2xl font-bold text-white mb-3">Your Network Tree</h3>
            
            {/* Legend - Nodes */}
            <div className="mb-3">
              <p className="text-gray-400 text-xs font-semibold mb-2">NODES:</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gradient-to-br from-purple-600 to-blue-600 rounded border-2 border-purple-400"></div>
                  <span className="text-gray-300">You (Root)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gradient-to-br from-green-600 to-emerald-600 rounded border-2 border-green-400"></div>
                  <span className="text-gray-300">Active Member</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gradient-to-br from-blue-600 to-cyan-600 rounded border-2 border-blue-400"></div>
                  <span className="text-gray-300">Pending</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-800/50 rounded border-2 border-dashed border-gray-600"></div>
                  <span className="text-gray-300">Empty Slot</span>
                </div>
              </div>
            </div>

            {/* Legend - Arrows */}
            <div>
              <p className="text-gray-400 text-xs font-semibold mb-2">CONNECTIONS:</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <svg width="30" height="12" viewBox="0 0 30 12">
                    <defs>
                      <marker id="arrow-green-tree" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill="#10b981" />
                      </marker>
                    </defs>
                    <line x1="0" y1="6" x2="30" y2="6" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrow-green-tree)" />
                  </svg>
                  <span className="text-gray-300">Active Link</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg width="30" height="12" viewBox="0 0 30 12">
                    <defs>
                      <marker id="arrow-blue-tree" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill="#3b82f6" />
                      </marker>
                    </defs>
                    <line x1="0" y1="6" x2="30" y2="6" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrow-blue-tree)" />
                  </svg>
                  <span className="text-gray-300">Pending Link</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg width="30" height="12" viewBox="0 0 30 12">
                    <defs>
                      <marker id="arrow-gray-tree" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill="#6b7280" />
                      </marker>
                    </defs>
                    <line x1="0" y1="6" x2="30" y2="6" stroke="#6b7280" strokeWidth="2" strokeDasharray="5,5" markerEnd="url(#arrow-gray-tree)" />
                  </svg>
                  <span className="text-gray-300">Empty Link</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tree Visualization */}
          <div className="bg-gray-900/50 rounded-lg h-[calc(100%-150px)]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              connectionLineType={ConnectionLineType.SmoothStep}
              fitView
              attributionPosition="bottom-left"
              minZoom={0.1}
              maxZoom={1.5}
              defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              panOnDrag={false}
              panOnScroll={true}
              zoomOnScroll={true}
              zoomOnPinch={true}
              zoomOnDoubleClick={true}
            >
              <Background gap={16} size={1} color="#4B5563" />
              <Controls className="bg-gray-800 border-gray-600" />
            </ReactFlow>
          </div>
        </div>
      </div>
    </div>
  )
}

