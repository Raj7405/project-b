require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require('dotenv').config();

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337  // Standard Hardhat chain ID (change to 31337 if you prefer)
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
      accounts: (process.env.DEPLOYER_PRIVATE_KEY && 
                 process.env.DEPLOYER_PRIVATE_KEY !== "0xYOUR_PRIVATE_KEY_HERE" &&
                 process.env.DEPLOYER_PRIVATE_KEY.length === 66) 
                 ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      gasPrice: 10000000000 // 10 gwei
    },
    bscMainnet: {
      url: process.env.BSC_MAINNET_RPC || "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts: (process.env.DEPLOYER_PRIVATE_KEY && 
                 process.env.DEPLOYER_PRIVATE_KEY !== "0xYOUR_PRIVATE_KEY_HERE" &&
                 process.env.DEPLOYER_PRIVATE_KEY.length === 66) 
                 ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      gasPrice: 5000000000 // 5 gwei
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40000
  }
};

