#!/bin/bash
# Start local Hardhat node and deploy contracts

echo "🚀 Starting Hardhat Local Network..."
echo ""
echo "This will start a local blockchain on http://127.0.0.1:8545"
echo "Press Ctrl+C to stop"
echo ""

# Start Hardhat node in background
npx hardhat node &
HARDHAT_PID=$!

# Wait for node to start
sleep 5

echo "✅ Hardhat node started (PID: $HARDHAT_PID)"
echo ""
echo "📝 Deploying contracts..."
echo ""

# Deploy contracts
npx hardhat run deploy-local.js --network localhost

echo ""
echo "✅ Deployment complete!"
echo ""
echo "⚠️  To stop the Hardhat node, run: kill $HARDHAT_PID"
echo "   Or press Ctrl+C in the Hardhat node terminal"

