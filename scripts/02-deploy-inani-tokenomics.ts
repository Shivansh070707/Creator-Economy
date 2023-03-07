import { network, ethers } from 'hardhat';
import { networkConfig, developmentChains } from '../helper-hardhat-config';
import { verify } from './utils/verify';
import { deployMocks } from './00-deploy-mocks';
import { InaniTokenomics } from '../typechain-types';
import { storeContract } from './storeContract';

export async function deployInaniTokenomics(
  name: string,
  inaTokenAddress: string
) {
  const maxSupply = ethers.utils.parseEther('1000000000');
  const chainId: number = (await ethers.provider.getNetwork()).chainId;
  console.log(chainId);

  let wethTokenAddress, usdtTokenAddress, maticTokenAddress;
  let wethUsdPriceFeedAddress,
    usdtUsdPriceFeedAddress,
    maticUsdPriceFeedAddress;

  if (chainId == 31337) {
    let data: any = await deployMocks();
    wethUsdPriceFeedAddress = data.Weth_usd.address;
    usdtUsdPriceFeedAddress = data.Usdt_usd.address;
    maticUsdPriceFeedAddress = data.Matic_usd.address;
    wethTokenAddress = data.WETH.address;
    usdtTokenAddress = data.Tether.address;
    maticTokenAddress = data.Matic.address;
  } else {
    // make sure all the parameters are available in networkConfig
    wethUsdPriceFeedAddress =
      networkConfig[`${chainId}`]['ethUsdPriceFeedAddress'];
    usdtUsdPriceFeedAddress =
      networkConfig[`${chainId}`]['usdtUsdPriceFeedAddress'];
    maticUsdPriceFeedAddress =
      networkConfig[`${chainId}`]['maticUsdPriceFeedAddress'];
    wethTokenAddress = networkConfig[`${chainId}`]['wethTokenAddress'];
    usdtTokenAddress = networkConfig[`${chainId}`]['usdtTokenAddress'];
    maticTokenAddress = networkConfig[`${chainId}`]['maticTokenAddress'];
  }
  console.log('----------------------------------------------------');
  console.log('Deploying InaniTokenomics...');
  const args = [
    maxSupply,
    wethUsdPriceFeedAddress,
    usdtUsdPriceFeedAddress,
    maticUsdPriceFeedAddress,
    wethTokenAddress,
    usdtTokenAddress,
    maticTokenAddress,
    inaTokenAddress,
  ];

  const InaniTokenomics = await ethers.getContractFactory('InaniTokenomics');
  const inaniTokenomics: InaniTokenomics = await InaniTokenomics.deploy(
    maxSupply,
    wethUsdPriceFeedAddress,
    usdtUsdPriceFeedAddress,
    maticUsdPriceFeedAddress,
    wethTokenAddress,
    usdtTokenAddress,
    maticTokenAddress,
    inaTokenAddress
  );

  await storeContract(
    inaniTokenomics.address,
    JSON.parse(String(inaniTokenomics.interface.format('json'))),
    name,
    'inaniTokenomics'
  );

  // Verify the deployment
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    console.log('Verifying...');
    await verify(inaniTokenomics.address, args);
  }
}

module.exports.tags = ['all', 'inaniTokenomics'];
