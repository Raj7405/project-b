@echo off
REM Start local Hardhat node and deploy contracts for Windows

echo.
echo 🚀 Starting Hardhat Local Network...
echo.
echo This will start a local blockchain on http://127.0.0.1:8545
echo.
echo ⚠️  IMPORTANT: You need to run this in TWO separate terminals:
echo.
echo Terminal 1 - Start Hardhat Node:
echo    npx hardhat node
echo.
echo Terminal 2 - Deploy Contracts:
echo    npx hardhat run deploy-local.js --network localhost
echo.
pause

