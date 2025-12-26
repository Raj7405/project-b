require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("dotenv").config();

/**
 * Load & validate deployer private key
 * Hard fail if anything is wrong (NO silent fallback)
 */
function getAccounts() {
  const key = process.env.DEPLOYER_PRIVATE_KEY;

  if (!key) {
    throw new Error("❌ DEPLOYER_PRIVATE_KEY is missing in .env");
  }

  const fixedKey = key.startsWith("0x") ? key : `0x${key}`;

  if (!/^0x[0-9a-fA-F]{64}$/.test(fixedKey)) {
    throw new Error(
      "❌ Invalid DEPLOYER_PRIVATE_KEY format. Expected 64 hex characters."
    );
  }

  return [fixedKey];
}

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    /**
     * Local Hardhat network
     */
    hardhat: {
      chainId: 1337, // or 31337 if you prefer
    },

    /**
     * Local node (hardhat node / anvil)
     */
    localhost: {
      url: "http://127.0.0.1:8545",
    },

    /**
     * BSC Testnet
     */
    bscTestnet: {
      url: "https://bsc-testnet-rpc.publicnode.com",
      chainId: 97,
    
      accounts: (() => {
        const key = process.env.DEPLOYER_PRIVATE_KEY;
    
        if (!key) {
          throw new Error("❌ DEPLOYER_PRIVATE_KEY is missing in .env");
        }
    
        const fixedKey = key.startsWith("0x") ? key : `0x${key}`;
    
        if (!/^0x[0-9a-fA-F]{64}$/.test(fixedKey)) {
          throw new Error("❌ Invalid DEPLOYER_PRIVATE_KEY format");
        }
    
        return [fixedKey];
      })(),
    
      gasPrice: 10_000_000_000, // 10 gwei
    },
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  mocha: {
    timeout: 40000,
  },
};
