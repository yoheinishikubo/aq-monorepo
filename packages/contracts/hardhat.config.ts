import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@typechain/hardhat";

// Configure accounts via PRIVATE_KEY and RPC via KAIROS_RPC_URL
const accounts = process.env.PRIVATE_KEY
  ? [process.env.PRIVATE_KEY]
  : undefined;

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.30",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
      {
        version: "0.7.6",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
    ],
    overrides: {
      "@uniswap/v3-core/**/*.sol": {
        version: "0.7.6",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
      "@uniswap/v3-periphery/**/*.sol": {
        version: "0.7.6",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    // Kaia Testnet (Kairos)
    kairos: {
      // Use env KAIROS_RPC_URL if provided; falls back to a public endpoint
      url:
        process.env.KAIROS_RPC_URL || "https://public-en-kairos.node.kaia.io",
      chainId: 1001,
      accounts,
    },
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
