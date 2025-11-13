import React, { useState, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  Node,
  Edge,
  MarkerType,
  Connection,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FaUser, FaUsers, FaPlus, FaChartLine } from 'react-icons/fa';

interface CustomNodeData {
  label: string;
  referrals: number;
  isSlot?: boolean;
  onAdd?: () => void;
}

interface CustomNodeProps {
  data: CustomNodeData;
}

const CustomNode: React.FC<CustomNodeProps> = ({ data }) => {
  return (
    <div className="px-6 py-4 shadow-lg rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-blue-400 min-w-[140px]">
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
          <FaUser className="w-6 h-6 text-blue-600" />
        </div>
        <div className="text-white font-semibold text-sm text-center">{data.label}</div>
        {data.referrals !== undefined && (
          <div className="text-blue-100 text-xs flex items-center gap-1">
            <FaUsers className="w-3 h-3" />
            <span>Referrals: {data.referrals}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const BinaryChainMarketing: React.FC = () => {
  const [nodeId, setNodeId] = useState(7);
  
  const initialNodes: Node<CustomNodeData>[] = [
    {
      id: '1',
      type: 'custom',
      data: { label: 'You (Root)', referrals: 2 },
      position: { x: 400, y: 0 },
    },
    {
      id: '2',
      type: 'custom',
      data: { label: 'User A', referrals: 2 },
      position: { x: 200, y: 150 },
    },
    {
      id: '3',
      type: 'custom',
      data: { label: 'User B', referrals: 2 },
      position: { x: 600, y: 150 },
    },
    {
      id: '4',
      type: 'custom',
      data: { label: 'User C', referrals: 0 },
      position: { x: 100, y: 300 },
    },
    {
      id: '5',
      type: 'custom',
      data: { label: 'User D', referrals: 0 },
      position: { x: 300, y: 300 },
    },
    {
      id: '6',
      type: 'custom',
      data: { label: 'User E', referrals: 0 },
      position: { x: 500, y: 300 },
    },
    {
      id: '7',
      type: 'custom',
      data: { label: 'User F', referrals: 0 },
      position: { x: 700, y: 300 },
    },
  ];

  const initialEdges: Edge[] = [
    {
      id: '1-2',
      source: '1',
      target: '2',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    },
    {
      id: '1-3',
      source: '1',
      target: '3',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    },
    {
      id: '2-4',
      source: '2',
      target: '4',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    },
    {
      id: '2-5',
      source: '2',
      target: '5',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    },
    {
      id: '3-6',
      source: '3',
      target: '6',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    },
    {
      id: '3-7',
      source: '3',
      target: '7',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    },
  ];

  const [nodes, setNodes] = useState<Node<CustomNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const addNode = useCallback(() => {
    const availableParents = nodes.filter(node => {
      const childCount = edges.filter(e => e.source === node.id).length;
      return childCount < 2;
    });
    
    if (availableParents.length === 0) {
      alert('All positions are filled! The tree is complete.');
      return;
    }

    const parentNode = availableParents[0];
    const childrenCount = edges.filter(e => e.source === parentNode.id).length;
    const newNodeId = (nodeId + 1).toString();
    const xOffset = childrenCount === 0 ? -100 : 100;
    
    const newNode: Node<CustomNodeData> = {
      id: newNodeId,
      type: 'custom',
      data: { 
        label: `User ${String.fromCharCode(65 + nodeId)}`,
        referrals: 0 
      },
      position: { 
        x: parentNode.position.x + xOffset, 
        y: parentNode.position.y + 150 
      },
    };

    const newEdge: Edge = {
      id: `e${parentNode.id}-${newNodeId}`,
      source: parentNode.id,
      target: newNodeId,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    };

    setNodes(nds => {
      const updatedNodes = nds.map(node => {
        if (node.id === parentNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              referrals: (node.data.referrals || 0) + 1
            }
          };
        }
        return node;
      });
      return [...updatedNodes, newNode];
    });
    
    setEdges(eds => [...eds, newEdge]);
    setNodeId(nodeId + 1);
  }, [nodes, edges, nodeId]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 shadow-lg">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <FaChartLine className="w-8 h-8" />
          Binary Chain Marketing Network
        </h1>
        <p className="text-blue-100">Visualize your referral network in real-time</p>
      </div>
      
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Active Members</span>
          </div>
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <FaUsers className="w-4 h-4" />
            <span>Total Network: {nodes.length} members</span>
          </div>
          <button
            onClick={addNode}
            className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-md hover:shadow-lg"
          >
            <FaPlus className="w-4 h-4" />
            Add New Member
          </button>
        </div>
      </div>

      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap 
            nodeColor="#3b82f6"
            maskColor="rgba(0, 0, 0, 0.1)"
          />
          <Background gap={12} size={1} color="#e5e7eb" />
        </ReactFlow>
      </div>

      <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-xs">
        <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
          <FaChartLine className="w-4 h-4 text-blue-600" />
          Quick Guide
        </h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li className="flex items-start gap-2">
            <span>•</span>
            <span>Each user can refer max 2 users (binary)</span>
          </li>
          <li className="flex items-start gap-2">
            <span>•</span>
            <span>Click on any user node to view details</span>
          </li>
          <li className="flex items-start gap-2">
            <span>•</span>
            <span>Use controls to zoom and pan</span>
          </li>
          <li className="flex items-start gap-2">
            <span>•</span>
            <span>Network grows automatically as you add members</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default BinaryChainMarketing;