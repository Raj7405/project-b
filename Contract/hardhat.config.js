require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require('dotenv').config();

module.exports = {
  solidity: {
    version: "0.8.20",
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
      accounts: (() => {
        const key = process.env.DEPLOYER_PRIVATE_KEY;
        if (!key || key === "0xYOUR_PRIVATE_KEY_HERE" || key === "") {
          return [];
        }
        // Auto-fix: Add 0x prefix if missing
        const fixedKey = key.startsWith("0x") ? key : "0x" + key;
        // Validate length (should be 66 with 0x, or 64 without)
        if (fixedKey.length === 66 && /^0x[0-9a-fA-F]{64}$/i.test(fixedKey)) {
          return [fixedKey];
        }
        return [];
      })(),
      gasPrice: 10000000000 // 10 gwei
    },
    bscMainnet: {
      url: process.env.BSC_MAINNET_RPC || "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts: (() => {
        const key = process.env.DEPLOYER_PRIVATE_KEY;
        if (!key || key === "0xYOUR_PRIVATE_KEY_HERE" || key === "") {
          return [];
        }
        // Auto-fix: Add 0x prefix if missing
        const fixedKey = key.startsWith("0x") ? key : "0x" + key;
        // Validate length (should be 66 with 0x, or 64 without)
        if (fixedKey.length === 66 && /^0x[0-9a-fA-F]{64}$/i.test(fixedKey)) {
          return [fixedKey];
        }
        return [];
      })(),
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

