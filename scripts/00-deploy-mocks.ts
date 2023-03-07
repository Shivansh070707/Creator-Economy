import {
  Matic,
  MockV3Aggregator,
  Tether,
  WrappedEther,
} from '../typechain-types';
import { ethers } from 'hardhat';

const PRICE_FEEDS_DECIMALS = '8';
const INITIAL_PRICE_WETH_TO_USD = '120000000000'; // 1200 USD
const INITIAL_PRICE_USDT_TO_USD = '100000000'; // 1 USD
const INITIAL_PRICE_MATIC_TO_USD = '80000000'; // 0.80
export async function deployMocks() {
  const chainId: number = (await ethers.provider.getNetwork()).chainId;
  // If we are on a local development network, we need to deploy mocks!
  if (chainId == 31337) {
    console.log('Local network detected! Deploying mocks...');
    // deploy WrappedEther
    const Weth = await ethers.getContractFactory('WrappedEther');
    const WETH: WrappedEther = await Weth.deploy();
    await WETH.deployed();

    // deploy Tether
    const TETHER = await ethers.getContractFactory('Tether');
    const Tether: Tether = await TETHER.deploy();
    await Tether.deployed();

    // deploy MockMatic
    const MATIC = await ethers.getContractFactory('Matic');
    const Matic: Matic = await MATIC.deploy();
    await Matic.deployed();

    const MockV3Aggregator = await ethers.getContractFactory(
      'MockV3Aggregator'
    );
    // deploy MockV3Aggregator for WETH/USD price feed
    const Weth_usd: MockV3Aggregator = await MockV3Aggregator.deploy(
      PRICE_FEEDS_DECIMALS,
      INITIAL_PRICE_WETH_TO_USD
    );
    await Weth_usd.deployed();
    // deploy MockV3Aggregator for USDT/USD price feed
    const Usdt_usd: MockV3Aggregator = await MockV3Aggregator.deploy(
      PRICE_FEEDS_DECIMALS,
      INITIAL_PRICE_USDT_TO_USD
    );
    await Usdt_usd.deployed();

    // deploy MockV3Aggregator for MATIC/USD price feed
    const Matic_usd: MockV3Aggregator = await MockV3Aggregator.deploy(
      PRICE_FEEDS_DECIMALS,
      INITIAL_PRICE_MATIC_TO_USD
    );
    await Matic_usd.deployed();

    console.log('Mocks Deployed!');
    console.log('------------------------------------------------');
    return { WETH, Matic, Tether, Matic_usd, Weth_usd, Usdt_usd };
  }
}
module.exports.tags = ['all', 'mocks'];
