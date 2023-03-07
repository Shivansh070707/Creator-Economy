import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-deploy';
import 'solidity-coverage';
import 'hardhat-gas-reporter';
import 'hardhat-contract-sizer';
import * as dotenv from 'dotenv';
dotenv.config();

/** @type import('hardhat/config').HardhatUserConfig */

const {
  POLY_MUMBAI_RPC_URL,
  PRIVATE_KEY,
  POLYGONSCAN_API_KEY,
  REPORT_GAS,
  COINMARKETCAP_API_KEY,
} = process.env;

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      forking: {
        url: `${POLY_MUMBAI_RPC_URL}`,
        blockNumber: 16139820,
      },
    },
    'truffle-dashboard': {
      url: 'http://localhost:24012/rpc',
    },
    mumbai: {
      url: POLY_MUMBAI_RPC_URL,
      accounts: [`0x${PRIVATE_KEY}`],
      chainId: 80001,
      saveDeployments: true,
      gasPrice: 130000000000,
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.8.19',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
    ],
  },
  mocha: {
    timeout: 100000000,
  },
  paths: {
    artifacts: 'build/artifacts',
    cache: 'build/cache',
    sources: 'contracts',
  },
  // etherscan: {
  //     apiKey: POLYGONSCAN_API_KEY,
  // },

  gasReporter: {
    enabled: REPORT_GAS ? true : false,
    currency: 'USD',
    outputFile: 'gas-report.txt',
    noColors: true,
    coinmarketcap: COINMARKETCAP_API_KEY,
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: false,
    strict: true,
    only: [],
  },
};
export default config;
