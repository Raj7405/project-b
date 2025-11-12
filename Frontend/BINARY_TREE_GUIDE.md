# Binary Tree Component Guide

## Overview

The Binary Tree component is built using **React Flow**, a modern library for creating interactive node-based graphs and trees. It provides a beautiful, interactive visualization of your MLM network structure.

## Features

✅ **Modern UI** - Beautiful gradient cards with smooth animations
✅ **Interactive** - Zoom, pan, and drag functionality
✅ **Customizable** - Easy to customize node colors, sizes, and data
✅ **Responsive** - Works on all screen sizes
✅ **Real-time Updates** - Can be connected to your smart contract data
✅ **Status Indicators** - Different colors for active, pending, and empty slots

## Installation

The required package is already installed:

```bash
npm install reactflow
```

## Component Structure

### 1. BinaryTree Component
Location: `Frontend/src/components/BinaryTree.tsx`

This is the main component that renders the tree visualization.

### 2. Tree Helpers
Location: `Frontend/src/utils/treeHelpers.ts`

Helper functions to convert blockchain data to tree structure.

## Usage

### Basic Usage

```tsx
import BinaryTree from '@/components/BinaryTree'

function MyComponent() {
  return <BinaryTree height="700px" />
}
```

### With Custom Data

```tsx
import BinaryTree from '@/components/BinaryTree'

const myTreeData = {
  id: '1',
  name: 'Root User',
  isRoot: true,
  isActive: true,
  earnings: 100,
  left: {
    id: '2',
    name: 'Child 1',
    isActive: true,
    earnings: 50,
  },
  right: {
    id: '3',
    name: 'Child 2',
    isEmpty: true,
  }
}

function MyComponent() {
  return <BinaryTree treeData={myTreeData} height="700px" />
}
```

## Data Structure

The tree uses the following data structure:

```typescript
interface TreeNode {
  id: string              // Unique user ID
  name: string           // Display name
  isRoot?: boolean       // Is this the root node?
  isActive?: boolean     // Is user active?
  isEmpty?: boolean      // Is this an empty slot?
  status?: 'active' | 'pending'  // User status
  earnings?: number      // User earnings
  left?: TreeNode       // Left child
  right?: TreeNode      // Right child
}
```

## Node Colors

- **Purple/Blue Gradient** - Root node (You)
- **Green Gradient** - Active members
- **Blue/Cyan Gradient** - Pending members
- **Gray Dashed** - Empty slots

## Connecting to Smart Contract

To fetch real data from your smart contract:

1. **Add getter functions to your Solidity contract:**

```solidity
// Add these to your contract
function getLeftChild(uint256 userId) public view returns (uint256) {
    // Return left child ID
}

function getRightChild(uint256 userId) public view returns (uint256) {
    // Return right child ID
}
```

2. **Use the helper function in your component:**

```tsx
import { fetchBinaryTreeData } from '@/utils/treeHelpers'
import { useWeb3 } from '@/contexts/Web3Context'

function Dashboard() {
  const { contract } = useWeb3()
  const [treeData, setTreeData] = useState(null)

  useEffect(() => {
    async function loadTree() {
      if (contract) {
        const tree = await fetchBinaryTreeData(contract, '1', 4) // User ID 1, 4 levels deep
        setTreeData(tree)
      }
    }
    loadTree()
  }, [contract])

  return <BinaryTree treeData={treeData} />
}
```

## Customization

### Change Node Styling

Edit the `CustomNode` component in `BinaryTree.tsx`:

```tsx
const CustomNode = ({ data }: any) => {
  return (
    <div className="your-custom-classes">
      {/* Your custom node content */}
    </div>
  )
}
```

### Change Tree Layout

Modify the `generateTreeLayout` function parameters:

```tsx
generateTreeLayout(
  data,
  x,
  y,
  level,
  horizontalSpacing = 200,  // Adjust horizontal spacing
  verticalSpacing = 150     // Adjust vertical spacing
)
```

### Add More Information to Nodes

Add more fields to the node data structure and display them in `CustomNode`:

```tsx
const CustomNode = ({ data }: any) => {
  return (
    <div className="...">
      <div>{data.label}</div>
      <div>{data.email}</div>      {/* New field */}
      <div>{data.joinDate}</div>   {/* New field */}
    </div>
  )
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `treeData` | TreeNode | Sample data | The tree data structure |
| `height` | string | '600px' | Height of the tree container |

## Examples

### Example 1: Simple 3-Level Tree

```tsx
const simpleTree = {
  id: '1',
  name: 'You',
  isRoot: true,
  left: {
    id: '2',
    name: 'Alice',
    isActive: true,
  },
  right: {
    id: '3',
    name: 'Bob',
    isActive: true,
  }
}

<BinaryTree treeData={simpleTree} />
```

### Example 2: With Empty Slots

```tsx
const treeWithEmpty = {
  id: '1',
  name: 'You',
  isRoot: true,
  left: {
    id: '2',
    name: 'Alice',
    isActive: true,
  },
  right: {
    id: 'empty-1',
    name: 'Empty',
    isEmpty: true,  // Shows as empty slot
  }
}

<BinaryTree treeData={treeWithEmpty} />
```

## Troubleshooting

### Tree not showing?
- Check that React Flow CSS is imported: `import 'reactflow/dist/style.css'`
- Ensure the parent container has a defined height
- Check console for errors

### Nodes overlapping?
- Adjust `horizontalSpacing` and `verticalSpacing` in `generateTreeLayout`
- Reduce the tree depth or number of levels

### Performance issues?
- Limit the tree depth (max 5-6 levels recommended)
- Use lazy loading for large trees
- Implement pagination or collapsible nodes

## Future Enhancements

- [ ] Add click handlers to nodes
- [ ] Implement node search/filter
- [ ] Add animation for new nodes
- [ ] Collapsible tree branches
- [ ] Export tree as image
- [ ] Real-time updates via WebSocket

## Resources

- [React Flow Documentation](https://reactflow.dev/)
- [React Flow Examples](https://reactflow.dev/examples)
- [GitHub Issues](https://github.com/wbkd/react-flow/issues)

